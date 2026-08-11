import { readFile } from "node:fs/promises";

const RUNTIME_SKILL_URL = new URL("../skill-data/internalcot/SKILL.md", import.meta.url);

/** Read the workflow instructions bundled with the running CLI version. */
export async function readRuntimeSkill(): Promise<string> {
  try {
    return await readFile(RUNTIME_SKILL_URL, "utf8");
  } catch (cause: unknown) {
    throw new Error(
      "Runtime skill instructions are unavailable. Reinstall with: npx internalcot@latest setup",
      { cause },
    );
  }
}
