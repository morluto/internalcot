import { readFile } from "node:fs/promises";

const RUNTIME_WORKFLOW_URL = new URL("../runtime/internalcot-workflow.md", import.meta.url);
const COMMAND_BY_RUNNER = {
  installed: "internalcot",
  npx: "npx --yes internalcot@latest",
} as const;

/** Supported command runners for the rendered workflow. */
export type RuntimeSkillRunner = keyof typeof COMMAND_BY_RUNNER;

/** Read the workflow instructions bundled with the running CLI version. */
export async function readRuntimeSkill(
  runner: RuntimeSkillRunner = "installed",
): Promise<string> {
  try {
    const source = await readFile(RUNTIME_WORKFLOW_URL, "utf8");
    return source.replaceAll("{{internalcot}}", COMMAND_BY_RUNNER[runner]);
  } catch (cause: unknown) {
    throw new Error(
      "Runtime skill instructions are unavailable. Reinstall with: npx internalcot@latest setup",
      { cause },
    );
  }
}
