import { describe, expect, it } from "vitest";

import {
  formatWorkingNote,
  splitWorkingNoteOutput,
  workingNoteDelayMs,
} from "../src/working-notes.js";

describe("formatWorkingNote", () => {
  it("emits the scratchpad separately from its receipt", () => {
    const result = formatWorkingNote("  Check the boundary case.  ", false);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.output.stderr).toBe("internalcot> Check the boundary case.\n");
    expect(JSON.parse(result.output.stdout)).toEqual({
      recorded: true,
      next:
        "Continue the derivation in internalcot. Record intermediate reasoning, alternatives, evidence, and checks before the next substantive step.",
    });
  });

  it("preserves multiline notes and adds terminal styling only when requested", () => {
    const result = formatWorkingNote("Goal: prove descent\nCheck: equality", true);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.output.stderr).toBe(
      "\u001B[3minternalcot> Goal: prove descent\nCheck: equality\u001B[0m\n",
    );
  });

  it("rejects an empty note", () => {
    expect(formatWorkingNote(" \n ", false)).toEqual({
      ok: false,
      message:
        "No working note was provided. Pass one quoted argument, for example: " +
        "internalcot note 'Check the boundary case before drafting.'",
    });
  });

  it("paces output with exact append-only chunks", () => {
    const output = "\u001B[3minternalcot> Check the boundary case before drafting.\u001B[0m\n";
    const chunks = splitWorkingNoteOutput(output);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(output);
    expect(workingNoteDelayMs(chunks.length) * (chunks.length - 1)).toBeLessThanOrEqual(700);
  });

  it("does not delay a single output chunk", () => {
    expect(splitWorkingNoteOutput("internalcot>\n")).toEqual(["internalcot>\n"]);
    expect(workingNoteDelayMs(1)).toBe(0);
  });

  it("bounds chunk count and total pacing time for long notes", () => {
    const output = `${Array.from({ length: 200 }, (_, index) => `word${index}`).join(" ")}\n`;
    const chunks = splitWorkingNoteOutput(output);

    expect(chunks.length).toBeLessThanOrEqual(24);
    expect(chunks.join("")).toBe(output);
    expect(workingNoteDelayMs(chunks.length) * (chunks.length - 1)).toBeLessThanOrEqual(700);
  });
});
