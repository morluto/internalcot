const NEXT_STEP =
  "Continue the derivation in internalcot. Record intermediate reasoning, alternatives, evidence, and checks before the next substantive step.";

/** Rendered streams for one observable working-note record. */
export type WorkingNoteOutput = {
  readonly stderr: string;
  readonly stdout: string;
};

/** Result of parsing and formatting one working note. */
export type WorkingNoteResult =
  | { readonly ok: true; readonly output: WorkingNoteOutput }
  | { readonly ok: false; readonly message: string };

/** Split rendered output into append-only chunks without changing its contents. */
export function splitWorkingNoteOutput(output: string): ReadonlyArray<string> {
  const words = output.match(/\S+\s*/g) ?? [];
  const wordsPerChunk = Math.max(1, Math.ceil(words.length / 24));
  const chunks: Array<string> = [];
  for (let index = 0; index < words.length; index += wordsPerChunk) {
    chunks.push(words.slice(index, index + wordsPerChunk).join(""));
  }
  return chunks;
}

/** Choose a bounded inter-chunk delay targeting roughly 700 ms total. */
export function workingNoteDelayMs(chunkCount: number): number {
  if (chunkCount <= 1) {
    return 0;
  }
  return Math.max(0, Math.min(55, Math.floor(700 / (chunkCount - 1))));
}

/** Format one working note for the transcript and return a machine-readable receipt. */
export function formatWorkingNote(notes: string, styled: boolean): WorkingNoteResult {
  const normalized = notes.trim();
  if (normalized.length === 0) {
    return {
      ok: false,
      message:
        "No working note was provided. Pass one quoted argument, for example: " +
        "internalcot note 'Check the boundary case before drafting.'",
    };
  }

  const italic = styled ? "\u001B[3m" : "";
  const reset = styled ? "\u001B[0m" : "";
  return {
    ok: true,
    output: {
      stderr: `${italic}internalcot> ${normalized}${reset}\n`,
      stdout: `${JSON.stringify({ recorded: true, next: NEXT_STEP })}\n`,
    },
  };
}
