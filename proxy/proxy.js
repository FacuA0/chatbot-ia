// ChatGPT

import http from "http";
import https from "https";

const TARGET_URL = new URL("https://opencode.ai/zen/v1/chat/completions");

const server = http.createServer((req, res) => {
    let startedRes = false;

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const client = TARGET_URL.protocol === "https:" ? https : http;

    const proxyReq = client.request(
        {
            protocol: TARGET_URL.protocol,
            hostname: TARGET_URL.hostname,
            port: TARGET_URL.port || undefined,
            method: req.method,
            path: TARGET_URL.pathname + TARGET_URL.search,
            headers: {
                ...req.headers,
                host: TARGET_URL.host,
            },
        },
        (proxyRes) => {
            // Reflejar status
            res.statusCode = proxyRes.statusCode;
            res.statusMessage = proxyRes.statusMessage;

            startedRes = true;

            // Reflejar cabeceras
            for (const [key, value] of Object.entries(proxyRes.headers)) {
                if (value !== undefined) {
                    res.setHeader(key, value);
                }
            }

            // Mantener CORS
            res.setHeader("Access-Control-Allow-Origin", "*");

            // Reflejar body
            proxyRes.pipe(res);
        }
    );

    proxyReq.on("error", (err) => {
        console.error(err);
        if (!startedRes) {
            res.writeHead(502, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            });
            res.end('{"error": {"message": "502 Bad Gateway"}}');
        }
        else {
            res.destroy();
        }
    });

    // Pasar el body del cliente al servidor destino
    req.pipe(proxyReq);
});

server.listen(5174, () => {
    console.log("Proxy escuchando en http://localhost:5174");
});