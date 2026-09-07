import { Tool } from "./dummy_tool";

export default class CalculateNumbersTool extends Tool {
    name = "calculate_numbers";
    description = "Do a basic calculation with any pair of two numbers and basic operators";
    parameters = {
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
    };

    async execute(args, _config) {
        if (!Number.isFinite(args.number1) || !Number.isFinite(args.number2))
            throw new Error("Operand(s) aren't a number or aren't finite.");
        else if (!["+", "-", "*", "/"].includes(args.operator))
            throw new Error("Invalid operator.");
        else if (args.operator == "/" && args.number2 == 0)
            throw new Error("Cannot divide by zero.");

        let startAns = `${args.number1} ${args.operator} ${args.number2}`;
        return startAns + " = " + window.eval(startAns);
    }

    getCallSummary(args) {
        return `${args.number1} ${args.operator} ${args.number2}`;
    }
}