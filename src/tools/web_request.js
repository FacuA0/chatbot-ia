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
            },
            raw: {
                type: "boolean",
                description: "When true, it disables HTML-to-Markdown conversion and gives the raw HTML result back. Defaults to false. If the result's not HTML, no conversion is done whatsoever."
            }
        },
        required: ["url"]
    };

    turndown = new TurndownService({
        headingStyle: "atx",
        hr: "---",
        codeBlockStyle: "fenced",
        emDelimiter: "*",
        linkStyle: "referenced",
        preformattedCode: true,
        blankReplacement: () => '',
        //defaultReplacement: c => c.trim()
    });

    constructor() {
        super();

        this.turndown.remove("script");
        this.turndown.remove("style");
    }

    async execute(args, config, extra) {
        if (typeof args.url != "string")
            throw new Error("Invalid URL param: not a string or doesn't exist.");
        if (args.raw != null && typeof args.raw != "boolean")
            throw new Error("Invalid 'raw' param: not a boolean.");

        let url = new URL(args.url);

        let webRes = await fetch(config.proxy + url, {
            signal: extra.abort.signal
        });
        let body = await webRes.text();

        if (webRes.headers.get("Content-Type").includes("text/html") && !args.raw) {
            body = this.turndown.turndown(body);
        }

        if (body.length > 32768) {
            body = body.slice(0, 32768) + "...\n\nBody truncated to 32768 bytes.";
        }

        return webRes.status + " " + webRes.statusText + "\n\n" + body;
    }

    getCallSummary(args) {
        let raw = typeof args.raw == "boolean" ? ", raw=" + args.raw : "";
        return args.url + raw;
    }
}