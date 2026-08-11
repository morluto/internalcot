#!/usr/bin/env node

import OpenAI from "openai";

import { parseCliOptions } from "./cli-options.js";
import { runInternalCot } from "./internalcot.js";
import { OpenAIModelClient } from "./openai-model.js";

const USAGE = `Usage: internalcot [options] [prompt]

Show a model-authored scratchpad before the final answer.
If no prompt is provided, internalcot reads it from stdin.

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

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const prompt = options.prompt ?? (process.stdin.isTTY ? "" : await readStdin());
  if (prompt.length === 0) {
    throw new Error("Provide a prompt as arguments or through stdin");
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

main().catch((cause: unknown) => {
  const message = cause instanceof Error ? cause.message : String(cause);
  process.stderr.write(`internalcot: ${message}\n`);
  process.exitCode = 1;
});
