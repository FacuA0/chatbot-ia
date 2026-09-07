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

export async function processToolCall(config, call, extra) {
    try {
        let args = JSON.parse(call.function.arguments);
        let tool = getTool(config, call.function.name);
        if (tool == null) {
            throw new Error("Invalid tool name: " + call.function.name);
        }

        return await tool.execute(args, config.tools[tool.name], extra);
    }
    catch (err) {
        let errMsg = err.message;
        if (errMsg.includes("JSON.parse")) {
            errMsg = "Malformed JSON parameters object.";
        }

        return "Tool error: " + errMsg;
    }
}