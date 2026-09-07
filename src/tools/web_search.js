import { Tool } from "./dummy_tool";

export default class WebRequestTool extends Tool {
    name = "web_search";
    description = "Make a web search";
    parameters = {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Search terms/keywords."
            }
        },
        required: ["query"]
    };
    config = {
        ollamaApiKey: {
            type: "string",
            label: "Clave API Ollama",
            default: ""
        }
    };

    async execute(args, config, extra) {
        if (typeof args.query != "string")
            throw new Error("Invalid query arg: not a string or doesn't exist.");

        let webRes = await fetch("http://localhost:5174/https://ollama.com/api/web_search", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + config.ollamaApiKey
            },
            body: JSON.stringify({
                query: args.query
            }),
            signal: extra.abort.signal
        });
        let body = await webRes.text();
        let statusText = !webRes.ok ? webRes.status + " " + webRes.statusText + "\n\n" : "";

        return statusText + body;
    }

    getCallSummary(args) {
        return args.query;
    }
}