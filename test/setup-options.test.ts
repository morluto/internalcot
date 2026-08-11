import { describe, expect, it } from "vitest";

import { parseSetupOptions } from "../src/setup-options.js";

describe("parseSetupOptions", () => {
  it("parses a non-interactive project setup", () => {
    expect(parseSetupOptions(["--codex", "--project", "--yes", "--dry-run"])).toEqual({
      mode: undefined,
      targets: ["codex"],
      project: true,
      yes: true,
      dryRun: true,
      help: false,
    });
  });

  it("deduplicates agent targets", () => {
    expect(parseSetupOptions(["--claude", "--claude"]).targets).toEqual(["claude"]);
  });

  it.each([
    [["--cli-only", "--skill-only"], "Choose only one"],
    [["--cli-only", "--codex"], "--cli-only cannot be combined"],
    [["--cli-only", "--project"], "--project has no effect"],
    [["--wat"], "Unknown setup option: --wat"],
  ] as const)("rejects invalid input %#", (args, message) => {
    expect(() => parseSetupOptions(args)).toThrow(message);
  });
});
