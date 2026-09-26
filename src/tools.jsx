import CalculateNumbersTool from "./tools/calculate_numbers";
import WebRequestTool from "./tools/web_request";
import WebSearchTool from "./tools/web_search";

const tools = [new CalculateNumbersTool(), new WebRequestTool(), new WebSearchTool()];

export function getTool(config, name) {
    let toolList = config ? getAvailableTools(config) : tools;
    return toolList.find(tool => tool.name == name);
}

export function getAvailableTools(config) {
    return tools.filter(tool => config.tools[tool.name].enabled);
}

export function getAllTools() {
    return tools;
}

export async function processToolCalls(config, calls, extra) {
    let promises = [];

    for (let call of calls) {
        if (call.type != "function") continue;

        let toolPromise = processToolCall(config, call, extra);

        promises.push({
            id: call.id,
            prom: toolPromise
        });
    }

    let toolResults = [];
    for (let promise of promises) {
        toolResults.push({
            id: promise.id,
            msg: await promise.prom
        });
    }

    return toolResults;
}

async function processToolCall(config, call, extra) {
    try {
        let args = parseToolCallArgs(call.function.arguments);
        let tool = getTool(config, call.function.name);
        if (tool == null)
            throw new Error("Invalid tool name: " + call.function.name);

        return await tool.execute(args, config, extra);
    }
    catch (err) {
        return "Tool error: " + err.message;
    }
}

function parseToolCallArgs(args) {
    try {
        return JSON.parse(args);
    }
    catch (err) {
        throw new Error("Malformed JSON parameters object.");
    }
}