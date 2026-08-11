import { describe, expect, it } from "vitest";

import { runInternalCot } from "../src/internalcot.js";
import type {
  ModelClient,
  ModelEvent,
  ModelRequest,
  ModelResponse,
  ModelTurn,
} from "../src/model.js";

type TurnFixture = {
  readonly events: ReadonlyArray<ModelEvent>;
  readonly response: ModelResponse;
};

class FixtureTurn implements ModelTurn {
  readonly #fixture: TurnFixture;

  constructor(fixture: TurnFixture) {
    this.#fixture = fixture;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<ModelEvent> {
    for (const event of this.#fixture.events) {
      yield event;
    }
  }

  async completed(): Promise<ModelResponse> {
    return this.#fixture.response;
  }
}

class RecordingModelClient implements ModelClient {
  readonly requests: Array<ModelRequest> = [];
  readonly #fixtures: Array<TurnFixture>;

  constructor(fixtures: ReadonlyArray<TurnFixture>) {
    this.#fixtures = [...fixtures];
  }

  start(request: ModelRequest): ModelTurn {
    this.requests.push(request);
    const fixture = this.#fixtures.shift();
    if (fixture === undefined) {
      throw new Error("No fixture for model turn");
    }
    return new FixtureTurn(fixture);
  }
}

describe("runInternalCot", () => {
  it("records visible scratchpad arguments, continues the tool call, and streams the answer", async () => {
    const client = new RecordingModelClient([
      {
        events: [
          { type: "scratchpad_delta", delta: '{"thoughts":"check' },
          { type: "scratchpad_delta", delta: ' the boundary"}' },
        ],
        response: {
          id: "resp_1",
          calls: [
            {
              callId: "call_1",
              name: "internalcot",
              arguments: '{"thoughts":"check the boundary"}',
            },
          ],
        },
      },
      {
        events: [
          { type: "answer_delta", delta: "The " },
          { type: "answer_delta", delta: "answer." },
        ],
        response: { id: "resp_2", calls: [] },
      },
    ]);
    const scratchpad: Array<string> = [];
    const answer: Array<string> = [];

    await runInternalCot(client, {
      prompt: "Solve it",
      model: "gpt-5.6-sol",
      effort: "none",
      maxTurns: 8,
      onScratchpadDelta: (delta) => scratchpad.push(delta),
      onAnswerDelta: (delta) => answer.push(delta),
    });

    expect(scratchpad.join("")).toBe('{"thoughts":"check the boundary"}');
    expect(answer.join("")).toBe("The answer.");
    expect(client.requests).toEqual([
      {
        model: "gpt-5.6-sol",
        effort: "none",
        prompt: "Solve it",
        toolOutputs: [],
        requireTool: true,
      },
      {
        model: "gpt-5.6-sol",
        effort: "none",
        previousResponseId: "resp_1",
        toolOutputs: [
          {
            callId: "call_1",
            output: JSON.stringify({
              recorded: 1,
              next: "Use these notes to continue the derivation or produce the final answer.",
            }),
          },
        ],
        requireTool: false,
      },
    ]);
  });

  it("rejects an unexpected tool instead of fabricating an output", async () => {
    const client = new RecordingModelClient([
      {
        events: [],
        response: {
          id: "resp_1",
          calls: [{ callId: "call_1", name: "other", arguments: "{}" }],
        },
      },
    ]);

    await expect(
      runInternalCot(client, {
        prompt: "Solve it",
        model: "gpt-5.6-sol",
        effort: "none",
        maxTurns: 1,
        onScratchpadDelta: () => undefined,
        onAnswerDelta: () => undefined,
      }),
    ).rejects.toThrow("Unexpected tool call: other");
  });

  it("stops a model that never leaves the scratchpad loop", async () => {
    const repeatingTurn: TurnFixture = {
      events: [],
      response: {
        id: "resp_loop",
        calls: [
          {
            callId: "call_loop",
            name: "internalcot",
            arguments: '{"thoughts":"again"}',
          },
        ],
      },
    };
    const client = new RecordingModelClient([repeatingTurn, repeatingTurn]);

    await expect(
      runInternalCot(client, {
        prompt: "Solve it",
        model: "gpt-5.6-sol",
        effort: "none",
        maxTurns: 2,
        onScratchpadDelta: () => undefined,
        onAnswerDelta: () => undefined,
      }),
    ).rejects.toThrow("Model exceeded the 2-turn limit");
  });
});
