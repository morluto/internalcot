import { describe, expect, it } from "vitest";

import { readRuntimeSkill } from "../src/runtime-skill.js";

describe("readRuntimeSkill", () => {
  it("loads the workflow matching the package", async () => {
    const instructions = await readRuntimeSkill();

    expect(instructions).toContain("# InternalCoT workflow");
    expect(instructions).not.toContain("name: internalcot");
    expect(instructions).toContain("internalcot note '");
    expect(instructions).toContain("Keep the mode active for every response");
    expect(instructions).toContain("you MUST reason through the work in internalcot");
    expect(instructions).toContain("Before the final answer, call `internalcot note`");
    expect(instructions).toContain("Do not substitute ordinary commentary");
    expect(instructions).not.toContain("Form concise working notes");
    expect(instructions).not.toContain("{{internalcot}}");
  });

  it("renders a self-contained npx workflow for skill-only installs", async () => {
    const instructions = await readRuntimeSkill("npx");

    expect(instructions).toContain("npx --yes internalcot@latest note '");
    expect(instructions).not.toContain("`internalcot note`");
    expect(instructions).not.toContain("{{internalcot}}");
  });
});
