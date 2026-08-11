import { checkbox, confirm } from "@inquirer/prompts";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { parseSetupOptions, type SetupTarget } from "./setup-options.js";
import { applySetup, formatSetupPlan, planSetup } from "./setup.js";

export const SETUP_USAGE = `Usage: internalcot setup [options]

Install the internalcot CLI and skill for your coding agent.

Options:
      --codex       Install the skill for Codex
      --claude      Install the skill for Claude Code
  -p, --project     Install skills in the current project instead of globally
  -y, --yes         Accept the displayed plan without prompting
      --dry-run     Display the plan without changing anything
  -h, --help        Show this help

Non-interactive example:
  npx internalcot@latest setup --codex --yes`;

const promptContext = { output: process.stderr } as const;

export async function runSetup(args: ReadonlyArray<string>): Promise<void> {
  const options = parseSetupOptions(args);
  if (options.help) {
    process.stdout.write(`${SETUP_USAGE}\n`);
    return;
  }

  const interactive = process.stdin.isTTY && process.stderr.isTTY && !options.yes;
  const targets = options.targets.length > 0
    ? options.targets
    : interactive
      ? await promptForTargets()
      : nonInteractiveTargetsRequired();

  const plan = await planSetup({ targets, project: options.project });
  process.stderr.write(formatSetupPlan(plan));

  if (options.dryRun) {
    process.stdout.write("Dry run complete; no changes made.\n");
    return;
  }

  if (interactive) {
    const accepted = await confirm({ message: "Apply this setup plan?", default: true }, promptContext);
    if (!accepted) {
      process.stdout.write("Setup cancelled; no changes made.\n");
      return;
    }
  }

  const result = await applySetup(plan);
  process.stdout.write(formatResult(result.skillDirectories));
}

async function promptForTargets(): Promise<ReadonlyArray<SetupTarget>> {
  const home = homedir();
  const [codexDetected, claudeDetected] = await Promise.all([
    pathExists(join(home, ".codex")),
    pathExists(join(home, ".claude")),
  ]);

  while (true) {
    const targets = await checkbox<SetupTarget>({
      message: "Install the skill for:",
      choices: [
        { name: detectedLabel("Codex", codexDetected), value: "codex", checked: codexDetected },
        { name: detectedLabel("Claude Code", claudeDetected), value: "claude", checked: claudeDetected },
      ],
    }, promptContext);
    if (targets.length > 0) {
      return targets;
    }
    process.stderr.write("Select at least one agent, or press Ctrl+C to cancel.\n");
  }
}

function nonInteractiveTargetsRequired(): never {
  throw new Error(
    "Choose a skill target in non-interactive mode. Try --codex or --claude.",
  );
}

function detectedLabel(label: string, detected: boolean): string {
  return detected ? `${label} (detected)` : label;
}

function formatResult(directories: ReadonlyArray<string>): string {
  const lines = ["internalcot setup complete.", "CLI: installed"];
  for (const directory of directories) {
    lines.push(`Skill: ${directory}`);
  }
  if (directories.length > 0) {
    lines.push("Next: restart your coding agent if $internalcot is not immediately available.");
  }
  return `${lines.join("\n")}\n`;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (cause: unknown) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      return false;
    }
    throw cause;
  }
}
