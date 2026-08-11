import { checkbox, confirm, select } from "@inquirer/prompts";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { parseSetupOptions, type SetupMode, type SetupTarget } from "./setup-options.js";
import { applySetup, formatSetupPlan, planSetup } from "./setup.js";

export const SETUP_USAGE = `Usage: internalcot setup [options]

Install the internalcot CLI and skill for your coding agent.

Options:
      --codex       Install the skill for Codex
      --claude      Install the skill for Claude Code
      --cli-only    Install only the persistent CLI command
      --skill-only  Install only the skill (requires an existing CLI)
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
  const mode = options.mode ?? (interactive ? await promptForMode() : "bundle");
  const targets = mode === "cli-only"
    ? []
    : options.targets.length > 0
      ? options.targets
      : interactive
        ? await promptForTargets()
        : nonInteractiveTargetsRequired();

  const plan = await planSetup({ mode, targets, project: options.project });
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
  process.stdout.write(formatResult(result.cliInstalled, result.skillDirectories));
}

async function promptForMode(): Promise<SetupMode> {
  return select<SetupMode>({
    message: "What should internalcot install?",
    choices: [
      {
        name: "CLI + skill (recommended)",
        value: "bundle",
        description: "Install the persistent command and agent instructions.",
      },
      {
        name: "Skill only",
        value: "skill-only",
        description: "Use this when the internalcot command is already installed.",
      },
      {
        name: "CLI only",
        value: "cli-only",
        description: "Install the command without agent instructions.",
      },
    ],
  }, promptContext);
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

function formatResult(cliInstalled: boolean, directories: ReadonlyArray<string>): string {
  const lines = ["internalcot setup complete."];
  if (cliInstalled) {
    lines.push("CLI: installed");
  }
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
