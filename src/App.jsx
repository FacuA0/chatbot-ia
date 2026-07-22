import { useState, useEffect } from 'react'
import ChatList from './components/ChatList'
import InputBar from './components/InputBar'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
    const [generating, setGenerating] = useState(false);
    const [messageList, setMessageList] = useState([]);
    const [curMessage, setCurMessage] = useState(null);
    const [error, setError] = useState(null);

    function addMessage(role, message, thinking) {
        setMessageList(list => [...list, {
            idx: list.length,
            role,
            message,
            thinking
        }]);
    }

    function resetChat() {
        setMessageList([]);
        setGenerating(false);
        setError(null);
    }
    
    async function sendFakeMessage(text) {
        addMessage("user", text);
        setGenerating(true);
        setError(null);

        let res = 'Sí. Puedes hacerlo únicamente con los módulos nativos de Node (`http` y `https`).\n\nEste ejemplo:\n\n* Escucha en `localhost:5174`.\n* Siempre envía la petición a una URL fija.\n* **Ignora** el path y query que envíe el cliente.\n* Reenvía el método HTTP (`GET`, `POST`, etc.).\n* Reenvía el body completo del cliente.\n* Refleja el status, headers y body de la respuesta.\n* Maneja CORS (incluyendo `OPTIONS`).\n\n```js\nconst http = require("http");\nconst https = require("https");\n\nconst TARGET_URL = new URL("https://api.ejemplo.com/endpoint");\n\nconst server = http.createServer((req, res) => {\n    // CORS\n    res.setHeader("Access-Control-Allow-Origin", "*");\n    res.setHeader("Access-Control-Allow-Methods", "*");\n    res.setHeader("Access-Control-Allow-Headers", "*");\n\n    if (req.method === "OPTIONS") {\n        res.writeHead(204);\n        res.end();\n        return;\n    }\n\n    const client = TARGET_URL.protocol === "https:" ? https : http;\n\n    const proxyReq = client.request(\n        {\n            protocol: TARGET_URL.protocol,\n            hostname: TARGET_URL.hostname,\n            port: TARGET_URL.port || undefined,\n            method: req.method,\n            path: TARGET_URL.pathname + TARGET_URL.search,\n            headers: {\n                ...req.headers,\n                host: TARGET_URL.host,\n            },\n        },\n        (proxyRes) => {\n            // Reflejar status\n            res.statusCode = proxyRes.statusCode;\n            res.statusMessage = proxyRes.statusMessage;\n\n            // Reflejar cabeceras\n            for (const [key, value] of Object.entries(proxyRes.headers)) {\n                if (value !== undefined) {\n                    res.setHeader(key, value);\n                }\n            }\n\n            // Mantener CORS\n            res.setHeader("Access-Control-Allow-Origin", "*");\n\n            // Reflejar body\n            proxyRes.pipe(res);\n        }\n    );\n\n    proxyReq.on("error", (err) => {\n        console.error(err);\n        res.writeHead(502, {\n            "Content-Type": "text/plain",\n            "Access-Control-Allow-Origin": "*",\n        });\n        res.end("Bad Gateway");\n    });\n\n    // Pasar el body del cliente al servidor destino\n    req.pipe(proxyReq);\n});\n\nserver.listen(5174, () => {\n    console.log("Proxy escuchando en http://localhost:5174");\n});\n```\n\n### Si el servidor destino comprime respuestas (gzip/br)\n\nNo necesitas hacer nada: el proxy simplemente pasa los bytes tal cual, junto con los headers (`Content-Encoding`, `Content-Length`, etc.).\n\n### Si quieres ocultar completamente al cliente\n\nPuedes incluso eliminar headers que no quieras reenviar:\n\n```js\nconst headers = {\n    ...req.headers,\n    host: TARGET_URL.host,\n};\n\ndelete headers.origin;\ndelete headers.referer;\ndelete headers.cookie;\n```\n\ny usar:\n\n```js\nheaders\n```\n\nen lugar de `req.headers`.\n\nEste patrón (`req.pipe(proxyReq)` y `proxyRes.pipe(res)`) es el más eficiente, ya que hace streaming y evita cargar el body completo en memoria.\n';
        let textTokens = res.split(" ").map((t, i) => i == 0 ? t : (" " + t));

        let finalThink = "The user said '" + text + "'. I should reply the same.";
        let thinkTokens = finalThink.split(" ").map((t, i) => i == 0 ? t : (" " + t));

        // Thinking
        await wait(2000);

        let waitTime = 30;
        
        let newAcum = "";
        for (let i = 0; i < thinkTokens.length; i++) {
            newAcum += thinkTokens[i];
            updateCurrent("", newAcum);
            await wait(waitTime);
        }
        
        newAcum = "";
        for (let i = 0; i < textTokens.length; i++) {
            updateCurrent(newAcum, finalThink);
            newAcum += textTokens[i];
            await wait(waitTime);
        }
        
        addMessage("assistant", res, finalThink);
        setCurMessage(null);
        setGenerating(false);
        
        function wait(ms) {
            return new Promise(res => setTimeout(res, ms));
        }
        
        function updateCurrent(msg, think) {
            setCurMessage({
                idx: 2147483647,
                role: "assistant",
                message: msg,
                thinking: think
            });
        }
    }

    function sendMessage(text) {
        addMessage("user", text);
        setGenerating(true);
        setError(null);

        let opts = {
            model: "big-pickle",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                ...messageList.map(msg => ({
                    role: msg.role,
                    content: msg.message
                })),
                {
                    role: "user",
                    content: text
                }
            ],
            stream: true
        };

        fetch("http://localhost:5174", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(opts)
        })
        .then(async res => {
            if (!res.ok) {
                let body = await res.json();
                throw new Error(body?.error?.message ?? body ?? res.statusText);
            }

            let events = res.clone().body;
            let decoder = new TextDecoder();
            let textPart = "", acumThink = "", acumMsg = "";

            for await (const chunk of events) {
                textPart += decoder.decode(chunk.buffer);

                //console.log(1, textPart);

                while (textPart.indexOf("\n\n") > -1) {
                    let partLines = textPart.substring(0, textPart.indexOf("\n\n")).split("\n");
                    //console.log(2, partLines);
                    if (partLines[0].startsWith("data: ")) {
                        let content = partLines[0].substring(6);
                        for (let i = 1; i < partLines.length; i++) {
                            if (!partLines[i].startsWith("data: "))
                                break;
                            content += "\n" + partLines[i].substring(6);
                        }

                        //console.log(3, content);

                        // Terminar stream
                        if (content == "[DONE]") {
                            console.log(4, "[DONE]");
                            setCurMessage(null);
                            addMessage("assistant", acumMsg, acumThink);
                            setGenerating(false);
                        }
                        else {
                            let json = JSON.parse(content), choice;

                            //console.log(4, json.choices, acumThink, "-", acumMsg);

                            if ((choice = json.choices[0]) && choice.finish_reason == null) {
                                if (choice.delta.reasoning)
                                    acumThink += choice.delta.reasoning;
                                else if (choice.delta.content.length > 0)
                                    acumMsg += choice.delta.content;
                                
                                setCurMessage({
                                    idx: 2147483647,
                                    role: "assistant",
                                    message: acumMsg,
                                    thinking: acumThink
                                });
                            }
                        }
                    }

                    textPart = textPart.substring(textPart.indexOf("\n\n") + 2);
                }
            }
            //return res.json();
        })/*
        .then(json => {
            let message = json?.choices?.[0]?.message;
            console.log(message);
            let text = message?.content;
            if (text) {
                addMessage("assistant", text, message?.reasoning);
            }
            else {
                setError("There was an error getting the message. Try again");
                console.log(json);
            }
            setGenerating(false);
        })*/
        .catch(err => {
            setError("There was an error making the request. Try again. Error: " + err.message);
            console.error(err);
            setGenerating(false);
        });
    }

    return (
        <main>
            <h1>Chatbot IA</h1>

            <ChatList msgList={messageList} currentMsg={curMessage} error={error}/>
            <InputBar sendMsg={sendMessage} sendFake={sendFakeMessage} resetChat={resetChat} generating={generating}/>
        </main>
    );
}

export default App
