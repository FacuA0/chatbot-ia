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

        if (!config.ollamaApiKey) {
            throw new Error("No API key present, ask the user to configure one in the tool.");
        }

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
        let body = await webRes.text(), json;

        try {
            json = JSON.parse(body);
        }
        catch (err) {
            throw new Error("Not a JSON response:\n\n" + body);
        }

        if (!json.results) {
            let statusText = !webRes.ok ? webRes.status + " " + webRes.statusText + "\n\n" : "";
            throw new Error(statusText + (json.error ?? body));
        }

        let results = json.results.map((r, i) => (
            `**Result N°${i + 1}**\n\n- **Title:** ${r.title}\n- **URL:** ${r.url}\n- **Snippet:** ${r.content}`
        )).join("\n\n---\n\n");

        return `${json.results.length} results found:\n\n${results}`;
    }

    getCallSummary(args) {
        return args.query;
    }
}