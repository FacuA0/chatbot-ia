export async function queryAI(chat, updateCurrent) {
    let opts = {
        model: "big-pickle",
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
        tools: [
            {
                type: "function",
                function: {
                    name: "calculate_numbers",
                    description: "Do a basic calculation with any pair of two numbers and basic operators",
                    parameters: {
                        type: "object",
                        properties: {
                            number1: {
                                type: "number",
                                description: "First operand to calculate."
                            },
                            operator: {
                                type: "string",
                                enum: ["+", "-", "*", "/"],
                                description: "The operator used to calculate."
                            },
                            number2: {
                                type: "number",
                                description: "Second operand to calculate."
                            }
                        },
                        required: ["number1", "operator", "number2"]
                    },
                    strict: true
                }
            }
        ],
        stream: true
    };

    let res = await fetch("http://localhost:5174", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(opts)
    });

    if (!res.ok) {
        let body = await res.json();
        throw new Error(body?.error?.message ?? body ?? res.statusText);
    }

    let events = res.clone().body;
    let acumThink = "", acumMsg = "", acumTool = [];

    for await (const content of getStreamedEvents(events)) {
        // Terminar stream
        if (content == "[DONE]") {
            console.log(4, "[DONE]");
            return {
                message: acumMsg,
                thinking: acumThink,
                toolCalls: acumTool
            };
        }
        else {
            let json = JSON.parse(content), choice;

            if ((choice = json.choices[0]) && choice.finish_reason == null) {
                if (choice.delta.reasoning_content)
                    acumThink += choice.delta.reasoning_content;
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
                            if (target[key]) {
                                if (typeof target[key] == "string")
                                    target[key] += source[key];
                                else if (typeof target[key] == "object" && target[key] !== null)
                                    apply(target[key], source[key]);
                                else target[key] = source[key];
                            }
                            else target[key] = source[key];
                        }
                    }
                }
                
                updateCurrent(acumMsg, acumThink, acumTool);
            }

            console.log(4, json.choices, acumThink, "-", acumMsg, "-", acumTool.slice());
        }
    }

    throw new Error("Unexpected end of stream without [DONE] mark.");
}

export async function generateFakeAnswer(text, updateCurrent) {
    let res = 'Sí. Puedes hacerlo únicamente con los módulos nativos de Node (`http` y `https`).\n\nEste ejemplo:\n\n* Escucha en `localhost:5174`.\n* Siempre envía la petición a una URL fija.\n* **Ignora** el path y query que envíe el cliente.\n* Reenvía el método HTTP (`GET`, `POST`, etc.).\n* Reenvía el body completo del cliente.\n* Refleja el status, headers y body de la respuesta.\n* Maneja CORS (incluyendo `OPTIONS`).\n\n```js\nconst http = require("http");\nconst https = require("https");\n\nconst TARGET_URL = new URL("https://api.ejemplo.com/endpoint");\n\nconst server = http.createServer((req, res) => {\n    // CORS\n    res.setHeader("Access-Control-Allow-Origin", "*");\n    res.setHeader("Access-Control-Allow-Methods", "*");\n    res.setHeader("Access-Control-Allow-Headers", "*");\n\n    if (req.method === "OPTIONS") {\n        res.writeHead(204);\n        res.end();\n        return;\n    }\n\n    const client = TARGET_URL.protocol === "https:" ? https : http;\n\n    const proxyReq = client.request(\n        {\n            protocol: TARGET_URL.protocol,\n            hostname: TARGET_URL.hostname,\n            port: TARGET_URL.port || undefined,\n            method: req.method,\n            path: TARGET_URL.pathname + TARGET_URL.search,\n            headers: {\n                ...req.headers,\n                host: TARGET_URL.host,\n            },\n        },\n        (proxyRes) => {\n            // Reflejar status\n            res.statusCode = proxyRes.statusCode;\n            res.statusMessage = proxyRes.statusMessage;\n\n            // Reflejar cabeceras\n            for (const [key, value] of Object.entries(proxyRes.headers)) {\n                if (value !== undefined) {\n                    res.setHeader(key, value);\n                }\n            }\n\n            // Mantener CORS\n            res.setHeader("Access-Control-Allow-Origin", "*");\n\n            // Reflejar body\n            proxyRes.pipe(res);\n        }\n    );\n\n    proxyReq.on("error", (err) => {\n        console.error(err);\n        res.writeHead(502, {\n            "Content-Type": "text/plain",\n            "Access-Control-Allow-Origin": "*",\n        });\n        res.end("Bad Gateway");\n    });\n\n    // Pasar el body del cliente al servidor destino\n    req.pipe(proxyReq);\n});\n\nserver.listen(5174, () => {\n    console.log("Proxy escuchando en http://localhost:5174");\n});\n```\n\n### Si el servidor destino comprime respuestas (gzip/br)\n\nNo necesitas hacer nada: el proxy simplemente pasa los bytes tal cual, junto con los headers (`Content-Encoding`, `Content-Length`, etc.).\n\n### Si quieres ocultar completamente al cliente\n\nPuedes incluso eliminar headers que no quieras reenviar:\n\n```js\nconst headers = {\n    ...req.headers,\n    host: TARGET_URL.host,\n};\n\ndelete headers.origin;\ndelete headers.referer;\ndelete headers.cookie;\n```\n\ny usar:\n\n```js\nheaders\n```\n\nen lugar de `req.headers`.\n\nEste patrón (`req.pipe(proxyReq)` y `proxyRes.pipe(res)`) es el más eficiente, ya que hace streaming y evita cargar el body completo en memoria.\n';
    let textTokens = res.split(" ").map((t, i) => i == 0 ? t : (" " + t));

    let finalThink = "The user said '" + text + "'. I should reply the same.";
    let thinkTokens = finalThink.split(" ").map((t, i) => i == 0 ? t : (" " + t));

    // Thinking
    await wait(1600);

    let thinkWaitTime = 500;
    
    let newAcum = "";
    for (let i = 0; i < thinkTokens.length; i++) {
        newAcum += thinkTokens[i];
        updateCurrent("", newAcum);
        await wait(thinkWaitTime);
    }
    /*
    newAcum = "";
    for (let i = 0; i < textTokens.length; i++) {
        updateCurrent(newAcum, finalThink);
        newAcum += textTokens[i];
        await wait(waitTime);
    }*/

    res = "Hola.";

    if (Math.random() < 0.5) {
        return {
            message: res,
            thinking: finalThink,
            toolCalls: [
                {
                    "index": 0,
                    "id": "call_70fc0a0807564d4e9fcaf36a",
                    "type": "function",
                    "function": {
                        "name": "calculate_numbers",
                        "arguments": "{\"number1\": 5, \"operator\": \"+\", \"number2\": 6}"
                    }
                }
            ]
        };
    }
    else {
        return {
            message: res,
            thinking: finalThink,
            toolCalls: []
        };
    }
    
    function wait(ms) {
        return new Promise(res => setTimeout(res, ms));
    }
}

async function* getStreamedEvents(events) {
    let decoder = new TextDecoder();
    let textPart = "", done = false;

    for await (const chunk of events) {
        textPart += decoder.decode(chunk.buffer);

        //console.debug(1, textPart);

        while (textPart.indexOf("\n\n") > -1) {
            let partLines = textPart.substring(0, textPart.indexOf("\n\n")).split("\n");
            //console.debug(2, partLines);
            if (partLines[0].startsWith("data: ")) {
                let content = partLines[0].substring(6);
                for (let i = 1; i < partLines.length; i++) {
                    if (!partLines[i].startsWith("data: "))
                        break;
                    content += "\n" + partLines[i].substring(6);
                }

                //console.debug(3, content);

                // CONTENIDO

                if (content == "[DONE]")
                    done = true;

                yield content;
            }

            textPart = textPart.substring(textPart.indexOf("\n\n") + 2);
        }
    }

    if (!done)
        throw new Error("Unexpected end of stream without [DONE] mark.");
}