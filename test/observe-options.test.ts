import { describe, expect, it } from "vitest";

import { parseObserveOptions } from "../src/observe-options.js";

describe("parseObserveOptions", () => {
  it("uses the POC defaults", () => {
    expect(parseObserveOptions(["explain", "this"])).toEqual({
      model: "gpt-5.6-sol",
      effort: "none",
      maxTurns: 8,
      prompt: "explain this",
      help: false,
    });
  });

  it("parses supported options", () => {
    expect(
      parseObserveOptions([
        "--model",
        "gpt-5.6-luna",
        "--effort",
        "low",
        "--max-turns",
        "3",
        "check",
      ]),
    ).toEqual({
      model: "gpt-5.6-luna",
      effort: "low",
      maxTurns: 3,
      prompt: "check",
      help: false,
    });
  });

  it.each([
    [["--effort", "off"], "Invalid effort: off"],
    [["--max-turns", "0"], "Invalid max turns: 0"],
    [["--wat"], "Unknown observe option: --wat"],
  ] as const)("rejects invalid input %#", (args, message) => {
    expect(() => parseObserveOptions(args)).toThrow(message);
  });
});
