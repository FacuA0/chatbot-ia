import { Tool } from "./dummy_tool";

export default class WebRequestTool extends Tool {
    name = "web_request";
    description = "Make a GET request to a custom URL and get a status line and its response body";
    parameters = {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "The URL to request to."
            }
        },
        required: ["url"]
    };

    async execute(args, extra) {
        if (typeof args.url != "string")
            throw new Error("Invalid URL param: not a string or doesn't exist.");
        let url = new URL(args.url);

        let webRes = await fetch("http://localhost:5174/" + url, {
            signal: extra.abort.signal
        });
        let body = await webRes.text();

        return webRes.status + " " + webRes.statusText + "\n\n" + body;
    }

    getCallSummary(args) {
        return args.url;
    }
}