import { describe, expect, it } from "vitest";

import { parseNoteOptions } from "../src/note-options.js";

describe("parseNoteOptions", () => {
  it("paces output and keeps stdout quiet by default", () => {
    expect(parseNoteOptions(["Check", "the boundary."])).toEqual({
      notes: "Check the boundary.",
      receipt: false,
      paced: true,
      help: false,
    });
  });

  it("supports multiline notes", () => {
    expect(parseNoteOptions([
      "Goal: verify the claim.\nCheck: distinguish computation from proof.",
    ])).toEqual({
      notes: "Goal: verify the claim.\nCheck: distinguish computation from proof.",
      receipt: false,
      paced: true,
      help: false,
    });
  });

  it("supports immediate output and an explicit machine receipt", () => {
    expect(parseNoteOptions(["--no-pace", "--receipt", "Check this."])).toEqual({
      notes: "Check this.",
      receipt: true,
      paced: false,
      help: false,
    });
  });

  it("accepts notes beginning with a hyphen after the option terminator", () => {
    expect(parseNoteOptions(["--", "- check this"])).toMatchObject({
      notes: "- check this",
      receipt: false,
    });
  });

  it("rejects unknown options", () => {
    expect(() => parseNoteOptions(["--quiet"])).toThrow(
      'Unknown note option "--quiet". Run "internalcot note --help" for supported options.',
    );
  });
});
