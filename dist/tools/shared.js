function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function asNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
function normalizeMetadata(value) {
    if (!isRecord(value)) {
        return undefined;
    }
    const metadata = {};
    for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === "string") {
            metadata[key] = entry;
            continue;
        }
        if (entry === null) {
            metadata[key] = "null";
            continue;
        }
        if (typeof entry === "boolean") {
            metadata[key] = entry ? "true" : "false";
            continue;
        }
        if (typeof entry === "number") {
            metadata[key] = String(entry);
            continue;
        }
        try {
            metadata[key] = JSON.stringify(entry);
        }
        catch {
            metadata[key] = String(entry);
        }
    }
    return Object.keys(metadata).length > 0 ? metadata : undefined;
}
function extractTextFromOutput(output) {
    if (!Array.isArray(output)) {
        return "";
    }
    const parts = [];
    for (const item of output) {
        if (!isRecord(item)) {
            continue;
        }
        if (item.type !== "message") {
            continue;
        }
        const message = item;
        if (!Array.isArray(message.content)) {
            continue;
        }
        for (const part of message.content) {
            if (!isRecord(part)) {
                continue;
            }
            const outputText = part;
            if (outputText.type === "output_text" && typeof outputText.text === "string") {
                parts.push(outputText.text);
            }
        }
    }
    return parts.join("");
}
function extractResponseText(response) {
    const outputText = asNonEmptyString(response.output_text);
    if (outputText) {
        return outputText;
    }
    return extractTextFromOutput(response.output);
}
function extractFollowUp(metadata) {
    if (!metadata || metadata.follow_up_required !== "true") {
        return undefined;
    }
    return {
        required: true,
        instructions: metadata.follow_up_instructions,
        inputTemplate: metadata.follow_up_input_template,
        exampleRequest: metadata.follow_up_example_request,
        missingIdentifier: metadata.follow_up_missing_identifier,
        reason: metadata.follow_up_reason,
        source: metadata.follow_up_source,
    };
}
export async function processStreamingResponse(stream) {
    let fullResponse = "";
    try {
        for await (const chunk of stream) {
            if (!isRecord(chunk) || chunk.type !== "response.output_text.delta") {
                continue;
            }
            if (typeof chunk.delta === "string") {
                fullResponse += chunk.delta;
            }
            else if (isRecord(chunk.text) &&
                typeof chunk.text.delta === "string") {
                fullResponse += chunk.text.delta;
            }
        }
        return fullResponse;
    }
    catch (error) {
        console.error("Error processing streaming response:", error);
        throw error;
    }
}
export async function createStreamingTextResponse(client, model, prompt) {
    const response = await client.responses.create({
        model,
        input: prompt,
        stream: true,
        metadata: { tool: "mcp" },
    });
    return await processStreamingResponse(response);
}
export async function createOctagonAgentResponse(client, { prompt, conversation, }) {
    const response = (await client.responses.create.call(client.responses, {
        model: "octagon-agent",
        input: prompt,
        metadata: { tool: "mcp" },
        ...(conversation ? { conversation } : {}),
    }));
    const rawMetadata = normalizeMetadata(response.metadata);
    const text = extractResponseText(response);
    const parsedResponse = {
        model: "octagon-agent",
        text,
        conversation: asNonEmptyString(response.conversation),
        responseId: asNonEmptyString(response.id),
        followUp: extractFollowUp(rawMetadata),
        rawMetadata,
    };
    return parsedResponse;
}
export function createTextErrorResult(message) {
    return {
        isError: true,
        content: [{ type: "text", text: message }],
    };
}
