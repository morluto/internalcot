import { describe, expect, it } from "vitest";

import { parseCliOptions } from "../src/cli-options.js";

describe("parseCliOptions", () => {
  it("uses small, documented defaults", () => {
    expect(parseCliOptions(["explain", "this"])).toEqual({
      model: "gpt-5.6-sol",
      effort: "none",
      maxTurns: 8,
      prompt: "explain this",
      help: false,
    });
  });

  it("parses supported options", () => {
    expect(
      parseCliOptions([
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
    [["--wat"], "Unknown option: --wat"],
  ] as const)("rejects invalid input %#", (args, message) => {
    expect(() => parseCliOptions(args)).toThrow(message);
  });
});
