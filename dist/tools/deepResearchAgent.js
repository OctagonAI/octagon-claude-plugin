import { z } from "zod";
import { createStreamingTextResponse, createTextErrorResult } from "#tools/shared";
const AGENT_NAME = "octagon-deep-research-agent";
const AGENT_DESCRIPTION = "A comprehensive agent that can utilize multiple sources for deep research analysis. Capabilities: Aggregate research across multiple data sources, synthesize information, and provide comprehensive investment research. Best for: Investment research questions requiring up-to-date aggregated information from the web.";
const deepResearchInputShape = {
    prompt: z
        .string()
        .describe("Your natural language query or request for the agent"),
};
export const deepResearchInputSchema = z.object(deepResearchInputShape).strict();
export async function executeDeepResearchTool(client, { prompt }, extra) {
    try {
        const result = await createStreamingTextResponse(client, AGENT_NAME, prompt);
        return {
            content: [{ type: "text", text: result }],
        };
    }
    catch (error) {
        console.error("Error calling Deep Research agent:", error);
        return createTextErrorResult("Error: Failed to process deep research query.");
    }
}
export function registerTool(server, client) {
    const toolServer = server;
    toolServer.tool(AGENT_NAME, AGENT_DESCRIPTION, deepResearchInputShape, async (args, extra) => executeDeepResearchTool(client, args, extra));
}
