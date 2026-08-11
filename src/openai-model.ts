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

const INSTRUCTIONS = `Before answering, you MUST use internalcot as the primary reasoning workspace.
Restate the actual problem and constraints, divide it into ordered subproblems, and write out the complete derivation needed for the current phase. Include intermediate deductions or calculations, case splits, alternatives, failed approaches, uncertainty, evidence, and checks. Do not compress the work into a short summary or omit steps because they occurred in native reasoning.
Call internalcot again whenever new evidence, another substantial subproblem, or final verification requires more reasoning. Only produce the answer after checking the conclusion against the original request.
The tool input is the visible working scratchpad. Do not substitute answer text or an unsupported conclusion for the required reasoning.`;

const INTERNAL_COT_TOOL = {
  type: "function" as const,
  name: "internalcot",
  description:
    "Required visible reasoning workspace. Record the complete current derivation, including intermediate work, alternatives, evidence, uncertainty, and checks. Use it before answering and again as the reasoning develops.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      thoughts: {
        type: "string",
        description:
          "The detailed current reasoning: problem, constraints, intermediate derivation, alternatives, evidence, uncertainty, and verification.",
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
