const NEXT_STEP =
  "Continue the work. Record another note only for materially new reasoning state.";

/** Rendered streams for one observable working-note record. */
export type WorkingNoteOutput = {
  readonly stderr: string;
  readonly stdout: string;
};

/** Result of parsing and formatting one working note. */
export type WorkingNoteResult =
  | { readonly ok: true; readonly output: WorkingNoteOutput }
  | { readonly ok: false; readonly message: string };

/** Format one working note for the transcript and return a machine-readable receipt. */
export function formatWorkingNote(notes: string, styled: boolean): WorkingNoteResult {
  const normalized = notes.trim();
  if (normalized.length === 0) {
    return { ok: false, message: "Provide working notes as arguments or through stdin" };
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
