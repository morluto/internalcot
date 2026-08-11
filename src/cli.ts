#!/usr/bin/env node

import OpenAI from "openai";

import { runInternalCot } from "./internalcot.js";
import { OpenAIModelClient } from "./openai-model.js";
import { parseObserveOptions } from "./observe-options.js";
import { runSetup } from "./setup-command.js";
import { formatWorkingNote } from "./working-notes.js";

const USAGE = `Usage: internalcot <command> [options]

Commands:
  setup                 Install the CLI and agent skill
  note [working notes]  Record visible working notes locally
  observe [prompt]      Run the API-backed observation POC

Run internalcot <command> --help for command details.`;

const NOTE_USAGE = `Usage: internalcot note [working notes]

Record model-authored working notes in the tool transcript without a network call.
If no notes are provided as arguments, internalcot reads them from stdin.`;

const OBSERVE_USAGE = `Usage: internalcot observe [options] [prompt]

Run a second model through the Responses API, force a visible scratchpad tool call,
then stream its final answer. If no prompt is provided, read it from stdin.

Options:
  -m, --model <model>       Model to use (default: gpt-5.6-sol)
  -e, --effort <effort>     none, low, medium, high, xhigh, or max
      --max-turns <number>  Maximum tool rounds (default: 8)
  -h, --help                Show this help`;

async function readStdin(): Promise<string> {
  const chunks: Array<Buffer> = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function runNote(args: ReadonlyArray<string>): Promise<void> {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    process.stdout.write(`${NOTE_USAGE}\n`);
    return;
  }

  const notes = args.length > 0 ? args.join(" ") : process.stdin.isTTY ? "" : await readStdin();
  const result = formatWorkingNote(notes, process.stderr.isTTY);
  if (!result.ok) {
    throw new Error(result.message);
  }
  process.stderr.write(result.output.stderr);
  process.stdout.write(result.output.stdout);
}

async function runObserve(args: ReadonlyArray<string>): Promise<void> {
  const options = parseObserveOptions(args);
  if (options.help) {
    process.stdout.write(`${OBSERVE_USAGE}\n`);
    return;
  }

  const prompt = options.prompt ?? (process.stdin.isTTY ? "" : await readStdin());
  if (prompt.length === 0) {
    throw new Error("Provide an observation prompt as arguments or through stdin");
  }

  let scratchpadStarted = false;
  let answerStarted = false;
  const italic = process.stderr.isTTY ? "\u001B[3m" : "";
  const reset = process.stderr.isTTY ? "\u001B[0m" : "";

  await runInternalCot(new OpenAIModelClient(new OpenAI()), {
    prompt,
    model: options.model,
    effort: options.effort,
    maxTurns: options.maxTurns,
    onScratchpadDelta(delta) {
      if (!scratchpadStarted) {
        process.stderr.write(`${italic}internalcot> `);
        scratchpadStarted = true;
      }
      process.stderr.write(delta);
    },
    onAnswerDelta(delta) {
      if (!answerStarted) {
        if (scratchpadStarted) {
          process.stderr.write(`${reset}\n`);
        }
        answerStarted = true;
      }
      process.stdout.write(delta);
    },
  });

  if (scratchpadStarted && !answerStarted) {
    process.stderr.write(`${reset}\n`);
  }
  if (answerStarted) {
    process.stdout.write("\n");
  }
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === undefined || command === "--help" || command === "-h") {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  if (command === "note") {
    await runNote(args);
    return;
  }
  if (command === "setup") {
    await runSetup(args);
    return;
  }
  if (command === "observe") {
    await runObserve(args);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((cause: unknown) => {
  if (cause instanceof Error && cause.name === "ExitPromptError") {
    process.stderr.write("internalcot: Setup cancelled; no changes made.\n");
    process.exitCode = 130;
    return;
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  process.stderr.write(`internalcot: ${message}\n`);
  process.exitCode = 1;
});
