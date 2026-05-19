import { z } from "zod";
import { createStreamingTextResponse, createTextErrorResult } from "#tools/shared";
const AGENT_NAME = "octagon-prediction-markets-agent";
const AGENT_DESCRIPTION = "A specialized agent for creating research reports on Kalshi events. See what's driving prices, compare market vs model probabilities, and find potential mispricings.";
const predictionMarketsInputShape = {
    prompt: z
        .string()
        .describe("Your natural language query or request for the agent"),
    cache: z.boolean().optional().describe("Whether to cache the response"),
};
export const predictionMarketsInputSchema = z
    .object(predictionMarketsInputShape)
    .strict();
export async function executePredictionMarketsTool(client, { prompt, cache }, extra) {
    let model;
    if (cache === undefined) {
        model = AGENT_NAME;
    }
    else if (cache === false) {
        model = `${AGENT_NAME}:refresh`;
    }
    else {
        model = `${AGENT_NAME}:cache`;
    }
    try {
        const result = await createStreamingTextResponse(client, model, prompt);
        return {
            content: [{ type: "text", text: result }],
        };
    }
    catch (error) {
        console.error(`Error calling ${model}:`, error);
        return createTextErrorResult("Error: Failed to process prediction markets query.");
    }
}
export function registerTool(server, client) {
    const toolServer = server;
    toolServer.tool(AGENT_NAME, AGENT_DESCRIPTION, predictionMarketsInputShape, async (args, extra) => executePredictionMarketsTool(client, args, extra));
}
