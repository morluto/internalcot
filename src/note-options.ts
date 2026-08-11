/** Parsed options accepted after `internalcot note`. */
export interface NoteOptions {
  readonly notes: string | undefined;
  readonly receipt: boolean;
  readonly paced: boolean;
  readonly help: boolean;
}

/** Parse transcript-oriented note options without interpreting note contents. */
export function parseNoteOptions(args: ReadonlyArray<string>): NoteOptions {
  const noteParts: Array<string> = [];
  let receipt = false;
  let paced = true;
  let help = false;
  let optionsEnded = false;

  for (const argument of args) {
    if (optionsEnded) {
      noteParts.push(argument);
      continue;
    }
    if (argument === "--") {
      optionsEnded = true;
      continue;
    }
    if (argument === "--receipt") {
      receipt = true;
      continue;
    }
    if (argument === "--no-pace") {
      paced = false;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(
        `Unknown note option "${argument}". Run "internalcot note --help" for supported options.`,
      );
    }
    noteParts.push(argument);
  }

  return {
    notes: noteParts.length === 0 ? undefined : noteParts.join(" "),
    receipt,
    paced,
    help,
  };
}
