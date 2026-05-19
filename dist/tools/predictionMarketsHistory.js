import { APIError } from "openai";
import { z } from "zod";
const TOOL_NAME = "prediction_markets_history";
const TOOL_DESCRIPTION = `Fetch historical data for a prediction market event by ticker.
Supports pagination (limit, cursor) and time window (captured_from, captured_to) and optionally include analysis columns.

Note: For a typical Kalshi Market URL, the event ticker is the final segment in the URL.
For example, for the URL https://kalshi.com/markets/kxbtcy/btc-price-range-eoy/kxbtcy-27jan0100, the event ticker is kxbtcy-27jan0100.`;
const predictionMarketsHistoryInputShape = {
    event_ticker: z
        .string()
        .describe("The event ticker symbol for the prediction market (e.g. KXBTCY-27JAN0100). Case-insensitive."),
    limit: z
        .number()
        .optional()
        .describe("Maximum number of history records to return (pagination)"),
    cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response"),
    captured_from: z
        .string()
        .optional()
        .describe("Start of the historical window (inclusive)"),
    captured_to: z
        .string()
        .optional()
        .describe("End of the historical window (inclusive)"),
    include_analysis: z
        .boolean()
        .optional()
        .describe("If true, include heavy analysis columns in the response"),
};
export const predictionMarketsHistoryInputSchema = z
    .object(predictionMarketsHistoryInputShape)
    .strict();
export async function executePredictionMarketsHistoryTool(client, params, extra) {
    try {
        const eventTicker = encodeURIComponent(params.event_ticker.trim());
        const query = {};
        if (params.limit != null)
            query.limit = params.limit;
        if (params.cursor != null)
            query.cursor = params.cursor;
        if (params.captured_from != null) {
            query.captured_from = params.captured_from;
        }
        if (params.captured_to != null)
            query.captured_to = params.captured_to;
        if (params.include_analysis === true)
            query.include = "analysis";
        const data = await client.get(`/prediction-markets/events/${eventTicker}/history`, { query });
        return {
            content: [
                {
                    type: "text",
                    text: typeof data === "string" ? data : JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        console.error(`Error calling ${TOOL_NAME}:`, error);
        let errorMessage = error.message ?? String(error);
        let errorCode = "unknown";
        if (error instanceof APIError) {
            const err = error.error;
            errorMessage = err?.message ?? errorMessage;
            errorCode = error.code ?? errorCode;
        }
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: errorCode !== "unknown"
                        ? `Error [${errorCode}]: ${errorMessage}`
                        : `Error: Failed to fetch prediction markets history for ${params.event_ticker}.`,
                },
            ],
        };
    }
}
export function registerTool(server, client) {
    const toolServer = server;
    toolServer.tool(TOOL_NAME, TOOL_DESCRIPTION, predictionMarketsHistoryInputShape, async (params, extra) => executePredictionMarketsHistoryTool(client, params, extra));
}
