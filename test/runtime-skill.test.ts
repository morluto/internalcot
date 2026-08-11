import { describe, expect, it } from "vitest";

import { readRuntimeSkill } from "../src/runtime-skill.js";

describe("readRuntimeSkill", () => {
  it("loads the workflow matching the package", async () => {
    const instructions = await readRuntimeSkill();

    expect(instructions).toContain("# InternalCoT");
    expect(instructions).toContain("internalcot note '");
    expect(instructions).toContain("Keep the mode active for subsequent responses");
  });
});
