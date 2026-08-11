import OpenAI from "openai";
import type {
  Response,
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";

import type {
  ModelClient,
  ModelEvent,
  ModelRequest,
  ModelResponse,
  ModelTurn,
} from "./model.js";

const INSTRUCTIONS = `Before answering, use internalcot to work through the task step by step.
Resolve important case splits and check the result before producing the final answer.
The tool input is a visible working scratchpad, so put substantive reasoning there.`;

const INTERNAL_COT_TOOL = {
  type: "function" as const,
  name: "internalcot",
  description:
    "Record visible working notes before answering. Use it to derive, check, or revise the solution; call again only for materially new reasoning.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      thoughts: {
        type: "string",
        description: "The current reasoning, derivation, checks, or revision.",
      },
    },
    required: ["thoughts"],
    additionalProperties: false,
  },
};

function toInput(request: ModelRequest): string | ResponseInput {
  if (request.prompt !== undefined) {
    return request.prompt;
  }

  return request.toolOutputs.map(({ callId, output }) => ({
    type: "function_call_output" as const,
    call_id: callId,
    output,
  }));
}

function toModelResponse(response: Response): ModelResponse {
  const calls: Array<ResponseFunctionToolCall> = [];
  for (const item of response.output) {
    if (item.type === "function_call") {
      calls.push(item);
    }
  }

  return {
    id: response.id,
    calls: calls.map((call) => ({
      callId: call.call_id,
      name: call.name,
      arguments: call.arguments,
    })),
  };
}

class OpenAIModelTurn implements ModelTurn {
  readonly #stream: ReturnType<OpenAI["responses"]["stream"]>;

  constructor(stream: ReturnType<OpenAI["responses"]["stream"]>) {
    this.#stream = stream;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<ModelEvent> {
    for await (const event of this.#stream) {
      const mapped = mapEvent(event);
      if (mapped !== undefined) {
        yield mapped;
      }
    }
  }

  async completed(): Promise<ModelResponse> {
    return toModelResponse(await this.#stream.finalResponse());
  }
}

function mapEvent(event: ResponseStreamEvent): ModelEvent | undefined {
  if (event.type === "response.function_call_arguments.delta") {
    return { type: "scratchpad_delta", delta: event.delta };
  }
  if (event.type === "response.output_text.delta") {
    return { type: "answer_delta", delta: event.delta };
  }
  return undefined;
}

/** OpenAI Responses API adapter for the internalcot model loop. */
export class OpenAIModelClient implements ModelClient {
  readonly #client: OpenAI;

  constructor(client: OpenAI) {
    this.#client = client;
  }

  start(request: ModelRequest): ModelTurn {
    const stream = this.#client.responses.stream({
      model: request.model,
      reasoning: { effort: request.effort },
      instructions: INSTRUCTIONS,
      input: toInput(request),
      tools: [INTERNAL_COT_TOOL],
      tool_choice: request.requireTool ? "required" : "auto",
      ...(request.previousResponseId === undefined
        ? {}
        : { previous_response_id: request.previousResponseId }),
    });
    return new OpenAIModelTurn(stream);
  }
}
