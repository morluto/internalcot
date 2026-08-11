/** A streamed event that the CLI can render. */
export type ModelEvent =
  | { readonly type: "scratchpad_delta"; readonly delta: string }
  | { readonly type: "answer_delta"; readonly delta: string };

/** One completed call to the visible scratchpad tool. */
export type ToolCall = {
  readonly callId: string;
  readonly name: string;
  readonly arguments: string;
};

/** The completed data needed to continue a model response. */
export type ModelResponse = {
  readonly id: string;
  readonly calls: ReadonlyArray<ToolCall>;
};

/** Input for one turn of the model/tool loop. */
export type ModelRequest = {
  readonly model: string;
  readonly effort: ReasoningEffort;
  readonly prompt?: string;
  readonly previousResponseId?: string;
  readonly toolOutputs: ReadonlyArray<{
    readonly callId: string;
    readonly output: string;
  }>;
  readonly requireTool: boolean;
};

/** Supported OpenAI reasoning-effort values. */
export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

/** A streaming response with a final continuation value. */
export interface ModelTurn extends AsyncIterable<ModelEvent> {
  /** Return the completed response after all events have been consumed. */
  completed(): Promise<ModelResponse>;
}

/** Boundary used by the reasoning loop to start model turns. */
export interface ModelClient {
  /** Start one streaming model turn. */
  start(request: ModelRequest): ModelTurn;
}
