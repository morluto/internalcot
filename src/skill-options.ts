/** Parsed options accepted after `internalcot skill`. */
export interface SkillOptions {
  readonly runner: "installed" | "npx";
  readonly help: boolean;
}

/** Parse runtime-skill rendering options. */
export function parseSkillOptions(args: ReadonlyArray<string>): SkillOptions {
  let runner: SkillOptions["runner"] = "installed";
  let help = false;

  for (const argument of args) {
    if (argument === "--npx") {
      runner = "npx";
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    throw new Error(
      `Unknown skill option "${argument}". Run "internalcot skill --help" for supported options.`,
    );
  }

  return { runner, help };
}
