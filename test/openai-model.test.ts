import { createServer } from "node:http";
import type { ServerResponse } from "node:http";

import OpenAI from "openai";
import { afterEach, describe, expect, it } from "vitest";

import { runInternalCot } from "../src/internalcot.js";
import { OpenAIModelClient } from "../src/openai-model.js";

const servers: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error === undefined ? resolve() : reject(error)));
        }),
    ),
  );
});

function response(id: string, output: ReadonlyArray<unknown>, status = "completed") {
  return {
    id,
    object: "response",
    created_at: 1,
    status,
    error: null,
    incomplete_details: null,
    instructions: null,
    max_output_tokens: null,
    model: "gpt-5.6-sol",
    output,
    output_text: "",
    parallel_tool_calls: true,
    previous_response_id: null,
    reasoning: { effort: "none", summary: null },
    store: true,
    temperature: null,
    text: { format: { type: "text" } },
    tool_choice: "auto",
    tools: [],
    top_p: null,
    truncation: "disabled",
    usage: null,
  };
}

function writeEvents(
  outgoing: ServerResponse,
  events: ReadonlyArray<unknown>,
): void {
  outgoing.writeHead(200, { "content-type": "text/event-stream" });
  for (const event of events) {
    outgoing.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  outgoing.write("data: [DONE]\n\n");
  outgoing.end();
}

function parseRequestBody(text: string): Record<string, unknown> {
  const body: unknown = JSON.parse(text);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Expected an object request body");
  }
  return Object.fromEntries(Object.entries(body));
}

describe("OpenAIModelClient", () => {
  it("maps real SDK stream events and sends a valid continuation request", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const call = {
      type: "function_call",
      id: "fc_1",
      call_id: "call_1",
      name: "internalcot",
      arguments: '{"thoughts":"check it"}',
      status: "completed",
    };
    const message = {
      type: "message",
      id: "msg_1",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: "Done.", annotations: [] }],
    };

    const server = createServer((incoming, outgoing) => {
      const chunks: Array<Buffer> = [];
      incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
      incoming.on("end", () => {
        let body: Record<string, unknown>;
        try {
          body = parseRequestBody(Buffer.concat(chunks).toString("utf8"));
        } catch {
          outgoing.writeHead(400).end();
          return;
        }
        requests.push(body);

        if (requests.length === 1) {
          writeEvents(outgoing, [
            { type: "response.created", sequence_number: 0, response: response("resp_1", [], "in_progress") },
            {
              type: "response.output_item.added",
              sequence_number: 1,
              output_index: 0,
              item: { ...call, arguments: "", status: "in_progress" },
            },
            {
              type: "response.function_call_arguments.delta",
              sequence_number: 2,
              output_index: 0,
              item_id: "fc_1",
              delta: call.arguments,
            },
            { type: "response.output_item.done", sequence_number: 3, output_index: 0, item: call },
            { type: "response.completed", sequence_number: 4, response: response("resp_1", [call]) },
          ]);
          return;
        }

        writeEvents(outgoing, [
          { type: "response.created", sequence_number: 0, response: response("resp_2", [], "in_progress") },
          {
            type: "response.output_item.added",
            sequence_number: 1,
            output_index: 0,
            item: {
              ...message,
              status: "in_progress",
              content: [{ type: "output_text", text: "", annotations: [] }],
            },
          },
          {
            type: "response.output_text.delta",
            sequence_number: 2,
            output_index: 0,
            content_index: 0,
            item_id: "msg_1",
            logprobs: [],
            delta: "Done.",
          },
          { type: "response.output_item.done", sequence_number: 3, output_index: 0, item: message },
          { type: "response.completed", sequence_number: 4, response: response("resp_2", [message]) },
        ]);
      });
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Test server did not bind a TCP port");
    }
    const port = address.port;
    const scratchpad: Array<string> = [];
    const answer: Array<string> = [];

    await runInternalCot(
      new OpenAIModelClient(
        new OpenAI({ apiKey: "test", baseURL: `http://127.0.0.1:${port}/v1` }),
      ),
      {
        prompt: "Check this",
        model: "gpt-5.6-sol",
        effort: "none",
        maxTurns: 2,
        onScratchpadDelta: (delta) => scratchpad.push(delta),
        onAnswerDelta: (delta) => answer.push(delta),
      },
    );

    expect(scratchpad.join("")).toBe(call.arguments);
    expect(answer.join("")).toBe("Done.");
    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({
      input: "Check this",
      reasoning: { effort: "none" },
      tool_choice: "required",
      tools: [{ type: "function", name: "internalcot", strict: true }],
    });
    expect(requests[1]).toMatchObject({
      previous_response_id: "resp_1",
      tool_choice: "auto",
      input: [
        {
          type: "function_call_output",
          call_id: "call_1",
        },
      ],
    });
  });
});
