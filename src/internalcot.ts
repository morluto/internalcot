import type { ModelClient, ReasoningEffort, ToolCall } from "./model.js";

const TOOL_NAME = "internalcot";

type RunOptions = {
  readonly prompt: string;
  readonly model: string;
  readonly effort: ReasoningEffort;
  readonly maxTurns: number;
  readonly onScratchpadDelta: (delta: string) => void;
  readonly onAnswerDelta: (delta: string) => void;
};

function toolOutput(call: ToolCall, recorded: number): string {
  if (call.name !== TOOL_NAME) {
    throw new Error(`Unexpected tool call: ${call.name}`);
  }

  const parsed: unknown = JSON.parse(call.arguments);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("thoughts" in parsed) ||
    typeof parsed.thoughts !== "string"
  ) {
    throw new Error("internalcot received invalid tool arguments");
  }

  return JSON.stringify({
    recorded,
    next: "Use these notes to continue the derivation or produce the final answer.",
  });
}

/** Run the model until it returns a final answer without another tool call. */
export async function runInternalCot(client: ModelClient, options: RunOptions): Promise<void> {
  let previousResponseId: string | undefined;
  let toolOutputs: ReadonlyArray<{ readonly callId: string; readonly output: string }> = [];
  let recorded = 0;

  for (let turnIndex = 0; turnIndex < options.maxTurns; turnIndex += 1) {
    const turn = client.start({
      model: options.model,
      effort: options.effort,
      ...(previousResponseId === undefined ? { prompt: options.prompt } : { previousResponseId }),
      toolOutputs,
      requireTool: turnIndex === 0,
    });

    for await (const event of turn) {
      if (event.type === "scratchpad_delta") {
        options.onScratchpadDelta(event.delta);
      } else {
        options.onAnswerDelta(event.delta);
      }
    }

    const response = await turn.completed();
    if (response.calls.length === 0) {
      return;
    }

    previousResponseId = response.id;
    toolOutputs = response.calls.map((call) => {
      recorded += 1;
      return { callId: call.callId, output: toolOutput(call, recorded) };
    });
  }

  throw new Error(`Model exceeded the ${options.maxTurns}-turn limit`);
}
