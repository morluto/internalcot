export type SetupMode = "bundle" | "cli-only" | "skill-only";

export type SetupTarget = "codex" | "claude";

export interface SetupOptions {
  readonly mode: SetupMode | undefined;
  readonly targets: ReadonlyArray<SetupTarget>;
  readonly project: boolean;
  readonly yes: boolean;
  readonly dryRun: boolean;
  readonly help: boolean;
}

export function parseSetupOptions(args: ReadonlyArray<string>): SetupOptions {
  let mode: SetupMode | undefined;
  const targets: Array<SetupTarget> = [];
  let project = false;
  let yes = false;
  let dryRun = false;
  let help = false;

  for (const arg of args) {
    switch (arg) {
      case "--codex":
        addTarget(targets, "codex");
        break;
      case "--claude":
        addTarget(targets, "claude");
        break;
      case "--cli-only":
        mode = setMode(mode, "cli-only");
        break;
      case "--skill-only":
        mode = setMode(mode, "skill-only");
        break;
      case "--project":
      case "-p":
        project = true;
        break;
      case "--yes":
      case "-y":
        yes = true;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--help":
      case "-h":
        help = true;
        break;
      default:
        throw new Error(`Unknown setup option: ${arg}`);
    }
  }

  if (mode === "cli-only" && targets.length > 0) {
    throw new Error("--cli-only cannot be combined with --codex or --claude");
  }
  if (mode === "cli-only" && project) {
    throw new Error("--project has no effect with --cli-only");
  }

  return { mode, targets, project, yes, dryRun, help };
}

function addTarget(targets: Array<SetupTarget>, target: SetupTarget): void {
  if (!targets.includes(target)) {
    targets.push(target);
  }
}

function setMode(current: SetupMode | undefined, next: SetupMode): SetupMode {
  if (current !== undefined && current !== next) {
    throw new Error("Choose only one of --cli-only or --skill-only");
  }
  return next;
}
