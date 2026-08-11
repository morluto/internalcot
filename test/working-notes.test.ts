import { describe, expect, it } from "vitest";

import { formatWorkingNote } from "../src/working-notes.js";

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
      next: "Continue the work. Record another note only for materially new reasoning state.",
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
      message: "Provide working notes as arguments or through stdin",
    });
  });
});
