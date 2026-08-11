import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import type { SetupMode, SetupTarget } from "./setup-options.js";

const SKILL_FILES = ["SKILL.md", "agents/openai.yaml"] as const;

export type InstallStatus = "create" | "update" | "unchanged";

export interface SkillInstall {
  readonly target: SetupTarget;
  readonly label: string;
  readonly directory: string;
  readonly status: InstallStatus;
}

export interface SetupPlan {
  readonly mode: SetupMode;
  readonly scope: "global" | "project";
  readonly installCli: boolean;
  readonly packageSpec: string;
  readonly skills: ReadonlyArray<SkillInstall>;
}

export interface PlanSetupInput {
  readonly mode: SetupMode;
  readonly targets: ReadonlyArray<SetupTarget>;
  readonly project: boolean;
  readonly cwd?: string;
  readonly home?: string;
  readonly packageVersion?: string;
}

export interface ApplySetupResult {
  readonly cliInstalled: boolean;
  readonly skillDirectories: ReadonlyArray<string>;
}

export interface SetupRuntime {
  readonly installCli?: (packageSpec: string) => Promise<void>;
}

export async function planSetup(input: PlanSetupInput): Promise<SetupPlan> {
  const root = input.project ? (input.cwd ?? process.cwd()) : (input.home ?? homedir());
  const skills = input.mode === "cli-only"
    ? []
    : await Promise.all(input.targets.map(async (target) => {
        const directory = skillDirectory(target, input.project, root);
        return {
          target,
          label: target === "codex" ? "Codex" : "Claude Code",
          directory,
          status: await inspectSkill(directory),
        } satisfies SkillInstall;
      }));

  return {
    mode: input.mode,
    scope: input.project ? "project" : "global",
    installCli: input.mode !== "skill-only",
    packageSpec: `internalcot@${input.packageVersion ?? await readPackageVersion()}`,
    skills,
  };
}

export function formatSetupPlan(plan: SetupPlan): string {
  const lines = ["Setup plan"];
  if (plan.installCli) {
    lines.push(`  install  CLI ${plan.packageSpec} globally`);
  }
  for (const skill of plan.skills) {
    const verb = skill.status === "unchanged" ? "keep" : skill.status;
    lines.push(`  ${verb.padEnd(7)} ${skill.label} skill at ${skill.directory}`);
  }
  return `${lines.join("\n")}\n`;
}

export async function applySetup(
  plan: SetupPlan,
  runtime: SetupRuntime = {},
): Promise<ApplySetupResult> {
  if (plan.installCli) {
    await (runtime.installCli ?? installPersistentCli)(plan.packageSpec);
  }

  const installed: Array<string> = [];
  for (const skill of plan.skills) {
    if (skill.status !== "unchanged") {
      await installSkill(skill.directory);
    }
    installed.push(skill.directory);
  }

  return { cliInstalled: plan.installCli, skillDirectories: installed };
}

export function skillDirectory(target: SetupTarget, project: boolean, root: string): string {
  if (target === "codex") {
    return join(root, ".agents", "skills", "internalcot");
  }
  return join(root, ".claude", "skills", "internalcot");
}

async function inspectSkill(directory: string): Promise<InstallStatus> {
  const directoryExists = await exists(directory);
  if (!directoryExists) {
    return "create";
  }

  for (const relativePath of SKILL_FILES) {
    const [source, target] = await Promise.all([
      readFile(join(sourceSkillDirectory(), relativePath)),
      readFileIfPresent(join(directory, relativePath)),
    ]);
    if (target === undefined || !source.equals(target)) {
      return "update";
    }
  }
  return "unchanged";
}

async function installSkill(directory: string): Promise<void> {
  for (const relativePath of SKILL_FILES) {
    const target = join(directory, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(join(sourceSkillDirectory(), relativePath)));
  }
}

async function installPersistentCli(packageSpec: string): Promise<void> {
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, ["install", "--global", packageSpec], {
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(
        signal === null
          ? `npm install exited with code ${code ?? "unknown"}`
          : `npm install was terminated by ${signal}`,
      ));
    });
  });
}

function sourceSkillDirectory(): string {
  return fileURLToPath(new URL("../skills/internalcot/", import.meta.url));
}

async function readPackageVersion(): Promise<string> {
  const contents = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const value: unknown = JSON.parse(contents);
  if (
    typeof value !== "object"
    || value === null
    || !("version" in value)
    || typeof value.version !== "string"
  ) {
    throw new Error("Could not read the internalcot package version");
  }
  return value.version;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (cause: unknown) {
    if (isMissing(cause)) {
      return false;
    }
    throw cause;
  }
}

async function readFileIfPresent(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path);
  } catch (cause: unknown) {
    if (isMissing(cause)) {
      return undefined;
    }
    throw cause;
  }
}

function isMissing(cause: unknown): boolean {
  return cause instanceof Error && "code" in cause && cause.code === "ENOENT";
}
