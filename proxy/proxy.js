// ChatGPT

import http from "http";
import https from "https";

//const TARGET_URL = new URL("https://opencode.ai/zen/v1/chat/completions");

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

    let targetUrl;
    try {
        targetUrl = new URL(req.url.slice(1));
        if (!["http:", "https:"].includes(targetUrl.protocol))
            throw new Error("Invalid protocol");
    }
    catch (err) {
        console.error("Error while handling URL (" + req.url.slice(1) + ") - " + err);
        res.writeHead(400);
        res.end("Invalid URL.");
        return;
    }

    const client = targetUrl.protocol === "https:" ? https : http;

    const proxyReq = client.request(
        {
            protocol: targetUrl.protocol,
            hostname: targetUrl.hostname,
            port: targetUrl.port || undefined,
            method: req.method,
            path: targetUrl.pathname + targetUrl.search,
            headers: {
                ...req.headers,
                host: targetUrl.host,
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