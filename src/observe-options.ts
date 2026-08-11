import type { ReasoningEffort } from "./model.js";

const EFFORTS: ReadonlySet<string> = new Set(["none", "low", "medium", "high", "xhigh", "max"]);

/** Parsed options for the API-backed observation POC. */
export type ObserveOptions = {
  readonly model: string;
  readonly effort: ReasoningEffort;
  readonly maxTurns: number;
  readonly prompt: string | undefined;
  readonly help: boolean;
};

function nextValue(args: ReadonlyArray<string>, index: number, option: string): string {
  const value = args[index + 1];
  if (value === undefined) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

/** Parse options accepted after `internalcot observe`. */
export function parseObserveOptions(args: ReadonlyArray<string>): ObserveOptions {
  let model = "gpt-5.6-sol";
  let effort: ReasoningEffort = "none";
  let maxTurns = 8;
  let help = false;
  const promptParts: Array<string> = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--model" || argument === "-m") {
      model = nextValue(args, index, argument);
      index += 1;
      continue;
    }
    if (argument === "--effort" || argument === "-e") {
      const value = nextValue(args, index, argument);
      if (!EFFORTS.has(value)) {
        throw new Error(`Invalid effort: ${value}`);
      }
      effort = value as ReasoningEffort;
      index += 1;
      continue;
    }
    if (argument === "--max-turns") {
      const value = nextValue(args, index, argument);
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 1) {
        throw new Error(`Invalid max turns: ${value}`);
      }
      maxTurns = parsed;
      index += 1;
      continue;
    }
    if (argument?.startsWith("-")) {
      throw new Error(`Unknown observe option: ${argument}`);
    }
    if (argument !== undefined) {
      promptParts.push(argument);
    }
  }

  return {
    model,
    effort,
    maxTurns,
    prompt: promptParts.length === 0 ? undefined : promptParts.join(" "),
    help,
  };
}
