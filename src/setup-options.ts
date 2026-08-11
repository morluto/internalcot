export type SetupTarget = "codex" | "claude";

export interface SetupOptions {
  readonly targets: ReadonlyArray<SetupTarget>;
  readonly project: boolean;
  readonly yes: boolean;
  readonly dryRun: boolean;
  readonly help: boolean;
}

export function parseSetupOptions(args: ReadonlyArray<string>): SetupOptions {
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

  return { targets, project, yes, dryRun, help };
}

function addTarget(targets: Array<SetupTarget>, target: SetupTarget): void {
  if (!targets.includes(target)) {
    targets.push(target);
  }
}
