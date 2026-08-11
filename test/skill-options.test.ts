import { describe, expect, it } from "vitest";

import { parseSkillOptions } from "../src/skill-options.js";

describe("parseSkillOptions", () => {
  it("uses the installed CLI by default", () => {
    expect(parseSkillOptions([])).toEqual({ runner: "installed", help: false });
  });

  it("selects npx-rendered instructions", () => {
    expect(parseSkillOptions(["--npx"])).toEqual({ runner: "npx", help: false });
  });

  it("rejects unknown options with a recovery command", () => {
    expect(() => parseSkillOptions(["--runner"])).toThrow(
      'Unknown skill option "--runner". Run "internalcot skill --help" for supported options.',
    );
  });
});
