import { getAvailableTools, getAllTools } from "./tools";

const API_OPENAI_COMPATIBLE = "@ai-sdk/openai-compatible";
const API_OPENAI = "@ai-sdk/openai";

const DEFAULT_ENDPOINT = "https://api.kilo.ai/api/gateway";
const DEFAULT_PUBLIC_PROXY = "https://cors-anywhere.herokuapp.com/";

export async function queryAI(chat, config, updateCurrent, abort) {
    if (config.model.api == API_OPENAI_COMPATIBLE) {
        return queryOpenAICompatEndpoint(chat, config, updateCurrent, abort);
    }
    else if (config.model.api == API_OPENAI) {
        return queryOpenAIEndpoint(chat, config, updateCurrent, abort);
    }
}

async function queryOpenAIEndpoint(chat, config, updateCurrent, abort) {
    let tools = getAvailableTools(config).map(t => ({
        type: "function",
        name: t.name,
        description: t.description,
        parameters: t.parameters,
        strict: false
    }));

    chat = chat.map(msg => {
        if (msg.role == "assistant") {
            return [{
                role: msg.role,
                content: msg.message,
                ...msg.extra
            }, ...(msg.extra?.tool_calls?.map?.(c => ({
                type: "function_call",
                name: c.function.name,
                arguments: c.function.arguments,
                call_id: c.id
            })) ?? [])];
        }
        else if (msg.role == "tool") {
            return {
                type: "function_call_output",
                output: msg.message,
                call_id: msg.extra?.tool_call_id ?? ""
            };
        }
        else return {
            role: msg.role,
            content: msg.message,
            ...msg.extra
        };
    }).flat();

    let opts = {
        model: config.model.id ?? "big-pickle",
        input: [
            {
                role: "system",
                content: "You are a helpful assistant."
            },
            ...chat
        ],
        tools,
        parallel_tool_calls: true,
        stream: true
    };

    let res = await fetch(config.proxy + config.model.endpoint + "/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(opts),
        signal: abort
    });

    if (!res.ok) {
        let body = await res.json();
        throw new Error(body?.error?.message ?? body ?? res.statusText);
    }

    let events = res.body;
    let acumThink = "", acumMsg = "", acumTool = [];
    let thinkOrText = new Map();

    for await (const event of getStreamedEvents(events)) {
        let json = JSON.parse(event.content);
        
        if (json.error) {
            throw new Error(json.error.message ?? json.error);
        }
        
        if (event.type == "response.completed") {
            console.log(4, "COMPLETED");
            break;
        }

        let call;

        switch (json.type) {
            case "response.output_item.added":
                if (json.item.type == "function_call") {
                    acumTool.push({
                        type: "function",
                        id: json.item.call_id,
                        item_id: json.item.id,
                        function: {
                            name: json.item.name,
                            arguments: ""
                        }
                    });
                }
                break;
            case "response.output_item.done":
                if (json.item.type == "reasoning" && json.item.encrypted_content) {
                    acumThink += "<encrypted reasoning>";
                }
                break;
            case "response.content_part.added":
                thinkOrText.set(json.item_id, json.part.type != "reasoning_text");
                break;
            case "response.content_part.done":
                break;
            case "response.output_text.delta":
                if (thinkOrText.get(json.item_id)) {
                    acumMsg += json.delta;
                }
                else {
                    acumThink += json.delta;
                }
                break;
            case "response.output_text.done":
                break;
            case "response.refusal.delta":
                acumMsg += json.delta;
                break;
            case "response.refusal.done":
                break;
            case "response.function_call_arguments.delta":
                call = acumTool.find(t => t.item_id == json.item_id);
                if (call.function.arguments != null) {
                    call.function.arguments += json.delta;
                }
                break;
            case "response.function_call_arguments.done":
                call = acumTool.find(t => t.item_id == json.item_id);
                if (call.function.arguments != null) {
                    call.function.arguments = json.arguments;
                }
                break;
        }
        
        //console.debug(4, json.choices, acumThink, "-", acumMsg, "-", acumTool.slice());
            
        updateCurrent(acumMsg, acumThink, acumTool);

        //console.debug(4, json.choices, acumThink, "-", acumMsg, "-", acumTool.slice());
    }

    return {
        message: acumMsg,
        thinking: acumThink,
        toolCalls: acumTool
    };
}

async function queryOpenAICompatEndpoint(chat, config, updateCurrent, abort) {
    let tools = getAvailableTools(config).map(t => ({
        type: "function",
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
            strict: true
        }
    }));

    let opts = {
        model: config.model.id ?? "big-pickle",
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant."
            },
            ...chat.map(msg => ({
                role: msg.role,
                content: msg.message,
                ...msg.extra
            }))
        ],
        tools,
        stream: true
    };

    let res = await fetch(config.proxy + config.model.endpoint + "/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(opts),
        signal: abort
    });

    if (!res.ok) {
        let body = await res.text();
        console.error(`${res.status} ${res.statusText}`, body);
        throw new Error(errorMessage(body));
    }

    let events = res.body;
    let acumThink = "", acumMsg = "", acumTool = [], done = false;

    for await (const event of getStreamedEvents(events)) {
        if (event.content == "[DONE]") {
            console.log(4, "[DONE]");
            done = true;
            break;
        }

        let json = JSON.parse(event.content), choice;

        if (json.error) {
            throw new Error(errorMessage(event.content));
        }

        if ((choice = json.choices[0]) && choice.finish_reason == null) {
            if (choice.delta.reasoning_content)
                acumThink += choice.delta.reasoning_content;
            else if (choice.delta.reasoning)
                acumThink += choice.delta.reasoning;
            else if (choice.delta.content && choice.delta.content.length > 0)
                acumMsg += choice.delta.content;
            else if (choice.delta.tool_calls) {
                let tool_calls = choice.delta.tool_calls;

                for (let tool of tool_calls) {
                    let index = tool.index;
                    if (!acumTool[index])
                        acumTool[index] = {};
                    
                    apply(acumTool[index], tool);
                }

                function apply(target, source) {
                    for (let key in source) {
                        if (target[key] !== undefined) {
                            /* OpenCode's longcat provider passes null to string-kind param ends but
                            for type it's always "function" */
                            if (typeof target[key] == "string") {
                                if (typeof source[key] == "string" && key != "type")
                                    target[key] += source[key];
                            }
                            else if (typeof target[key] == "object" && target[key] !== null)
                                apply(target[key], source[key]);
                            else if (source[key] != null)
                                target[key] = source[key];
                        }
                        else target[key] = source[key];
                    }
                }
            }
            //console.debug(4, json.choices, acumThink, "-", acumMsg, "-", acumTool.slice());
            
            updateCurrent(acumMsg, acumThink, acumTool);
        }

        //console.debug(4, json.choices, acumThink, "-", acumMsg, "-", acumTool.slice());
    }

    if (!done) {
        throw new Error("Unexpected end of stream without [DONE] mark.");
    }

    return {
        message: acumMsg,
        thinking: acumThink,
        toolCalls: acumTool
    };
}

export async function generateFakeAnswer(text, updateCurrent, abort) {
    let res = 'Sí. Puedes hacerlo únicamente con los módulos nativos de Node (`http` y `https`).\n\nEste ejemplo:\n\n* Escucha en `localhost:5174`.\n* Siempre envía la petición a una URL fija.\n* **Ignora** el path y query que envíe el cliente.\n* Reenvía el método HTTP (`GET`, `POST`, etc.).\n* Reenvía el body completo del cliente.\n* Refleja el status, headers y body de la respuesta.\n* Maneja CORS (incluyendo `OPTIONS`).\n\n```js\nconst http = require("http");\nconst https = require("https");\n\nconst TARGET_URL = new URL("https://api.ejemplo.com/endpoint");\n\nconst server = http.createServer((req, res) => {\n    // CORS\n    res.setHeader("Access-Control-Allow-Origin", "*");\n    res.setHeader("Access-Control-Allow-Methods", "*");\n    res.setHeader("Access-Control-Allow-Headers", "*");\n\n    if (req.method === "OPTIONS") {\n        res.writeHead(204);\n        res.end();\n        return;\n    }\n\n    const client = TARGET_URL.protocol === "https:" ? https : http;\n\n    const proxyReq = client.request(\n        {\n            protocol: TARGET_URL.protocol,\n            hostname: TARGET_URL.hostname,\n            port: TARGET_URL.port || undefined,\n            method: req.method,\n            path: TARGET_URL.pathname + TARGET_URL.search,\n            headers: {\n                ...req.headers,\n                host: TARGET_URL.host,\n            },\n        },\n        (proxyRes) => {\n            // Reflejar status\n            res.statusCode = proxyRes.statusCode;\n            res.statusMessage = proxyRes.statusMessage;\n\n            // Reflejar cabeceras\n            for (const [key, value] of Object.entries(proxyRes.headers)) {\n                if (value !== undefined) {\n                    res.setHeader(key, value);\n                }\n            }\n\n            // Mantener CORS\n            res.setHeader("Access-Control-Allow-Origin", "*");\n\n            // Reflejar body\n            proxyRes.pipe(res);\n        }\n    );\n\n    proxyReq.on("error", (err) => {\n        console.error(err);\n        res.writeHead(502, {\n            "Content-Type": "text/plain",\n            "Access-Control-Allow-Origin": "*",\n        });\n        res.end("Bad Gateway");\n    });\n\n    // Pasar el body del cliente al servidor destino\n    req.pipe(proxyReq);\n});\n\nserver.listen(5174, () => {\n    console.log("Proxy escuchando en http://localhost:5174");\n});\n```\n\n### Si el servidor destino comprime respuestas (gzip/br)\n\nNo necesitas hacer nada: el proxy simplemente pasa los bytes tal cual, junto con los headers (`Content-Encoding`, `Content-Length`, etc.).\n\n### Si quieres ocultar completamente al cliente\n\nPuedes incluso eliminar headers que no quieras reenviar:\n\n```js\nconst headers = {\n    ...req.headers,\n    host: TARGET_URL.host,\n};\n\ndelete headers.origin;\ndelete headers.referer;\ndelete headers.cookie;\n```\n\ny usar:\n\n```js\nheaders\n```\n\nen lugar de `req.headers`.\n\nEste patrón (`req.pipe(proxyReq)` y `proxyRes.pipe(res)`) es el más eficiente, ya que hace streaming y evita cargar el body completo en memoria.\n';
    let finalThink = "The user said '" + text + "'. I should reply the same.";

    if (Math.random() < 0.5) {
        res = "¡Hola! ¿En qué puedo ayudarte hoy? 😊";
    }

    let textTokens = res
        .split("    ")
        .map(str => str.split(" ").map((t, i) => i == 0 ? t : (" " + t)))
        .flatMap((tl, i) => i == 0 ? tl : ["    ", ...tl])
        .filter(t => t != "");

    let thinkTokens = finalThink
        .split("    ")
        .map(str => str.split(" ").map((t, i) => i == 0 ? t : (" " + t)))
        .flatMap((tl, i) => i == 0 ? tl : ["    ", ...tl])
        .filter(t => t != "");

    // Thinking
    await wait(1600, abort);

    let thinkWaitTime = 100, textWaitTime = 20;
    
    let newAcum = "";
    for (let i = 0; i < thinkTokens.length && !abort.aborted; i++) {
        newAcum += thinkTokens[i];
        updateCurrent("", newAcum);
        await wait(thinkWaitTime);
    }
    
    newAcum = "";
    for (let i = 0; i < textTokens.length && !abort.aborted; i++) {
        newAcum += textTokens[i];
        updateCurrent(newAcum, finalThink);
        await wait(textWaitTime);
    }

    let toolCalls = [];
    if (Math.random() < 0.4) {
        toolCalls = [{
            "index": 0,
            "id": "call_70fc0a0807564d4e9fcaf36a",
            "type": "function",
            "function": {
                "name": "calculate_numbers",
                "arguments": "{\"number1\": 5, \"operator\": \"+\", \"number2\": 6}"
            }
        }];
    }

    return {
        message: res,
        thinking: finalThink,
        toolCalls
    };
    
    function wait(ms, abort) {
        return new Promise(res => {
            abort?.addEventListener?.("abort", res);
            setTimeout(() => {
                abort?.removeEventListener?.("abort", res);
                res();
            }, ms);
        });
    }
}

export async function getModels(config) {
    let res = await fetch(config.proxy + "https://models.dev/api.json");
    let json = await res.json();
    
    let models = Object.entries(json.kilo?.models ?? {})
        .filter(e => e[1].cost?.input === 0 && e[1].cost?.output === 0)
        .map(e => ({
            id: e[0],
            name: e[1].name,
            api: e[1].provider?.npm ?? API_OPENAI_COMPATIBLE,
            endpoint: json.kilo?.api ?? DEFAULT_ENDPOINT
        }));
    
    return models;
}

export function getDefaultConfig() {
    let tools = {};
    for (let tool of getAllTools()) {
        tools[tool.name] = {
            enabled: tool.defaultEnabled
        };

        for (let conf in (tool.config ?? {})) {
            tools[tool.name][conf] = tool.config[conf].default;
        };
    }

    return {
        model: {
            id: "kilo-auto/free",
            name: "Auto Free",
            api: API_OPENAI_COMPATIBLE,
            endpoint: DEFAULT_ENDPOINT
        },
        tools,
        proxy: location.hostname == "localhost" ? "http://localhost:5174/" : DEFAULT_PUBLIC_PROXY
    };
}

export async function checkPublicProxy() {
    return (await fetch(DEFAULT_PUBLIC_PROXY)).ok;
}

async function* getStreamedEvents(events) {
    let decoder = new TextDecoder();
    let textPart = "";

    try {
        for await (const chunk of events) {
            textPart += decoder.decode(chunk.buffer);
    
            //console.debug(1, textPart);
    
            while (textPart.indexOf("\n\n") > -1) {
                let partLines = textPart.substring(0, textPart.indexOf("\n\n")).split("\n");
                //console.debug(2, partLines);
                let i = 0, type, content;
                if (partLines[0].startsWith("event: ")) {
                    type = partLines[i].substring(7);
                    i++;
                }
                if (partLines[i].startsWith("data: ")) {
                    content = partLines[i].substring(6);
                    for (i++; i < partLines.length; i++) {
                        if (!partLines[i].startsWith("data: "))
                            break;
                        content += "\n" + partLines[i].substring(6);
                    }
    
                    //console.debug(3, content);
                }

                // CONTENIDO

                if (content || type) {
                    yield {
                        type,
                        content
                    };
                }
    
                textPart = textPart.substring(textPart.indexOf("\n\n") + 2);
            }
        }
    }
    catch (err) {
        if (err.toString().includes("AbortError")) {
            return;
        }
        else throw err;
    }
}

function errorMessage(body) {
    try {
        let json = JSON.parse(body);

        if (typeof json.error == "object") {
            let parts = [], err = json.error;
            if (err.message)
                parts.push(err.message);
            if (err.metadata?.raw)
                parts.push(err.metadata.raw);

            if (parts.length > 0)
                return parts.join(": ");

            return JSON.stringify(err);
        }

        let parts = [];
        if (typeof json.error == "string")
            parts.push(json.error);
        if (typeof json.message == "string")
            parts.push(json.message);

        if (parts.length > 0)
            return parts.join(": ");

        return JSON.stringify(json);
    }
    catch (error) {
        console.error(body);
        return body.slice(0, 256);
    }
}