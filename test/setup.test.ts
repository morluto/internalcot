import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { applySetup, formatSetupPlan, planSetup } from "../src/setup.js";

const temporaryDirectories: Array<string> = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("setup", () => {
  it("rejects a CLI-only plan without a skill target", async () => {
    await expect(planSetup({
      targets: [],
      project: false,
      home: "/example/home",
      packageVersion: "1.2.3",
    })).rejects.toThrow("Setup requires at least one skill target");
  });

  it("plans exact project paths without changing the project", async () => {
    const root = await temporaryDirectory();

    const plan = await planSetup({
      targets: ["codex", "claude"],
      project: true,
      cwd: root,
      packageVersion: "1.2.3",
    });

    expect(plan).toEqual({
      packageSpec: "internalcot@1.2.3",
      skills: [
        {
          target: "codex",
          label: "Codex",
          directory: join(root, ".agents", "skills", "internalcot"),
          status: "create",
        },
        {
          target: "claude",
          label: "Claude Code",
          directory: join(root, ".claude", "skills", "internalcot"),
          status: "create",
        },
      ],
    });
    expect(formatSetupPlan(plan)).toContain("install  CLI internalcot@1.2.3 globally");
  });

  it("installs the CLI and skill, preserves unrelated files, and becomes repeat-safe", async () => {
    const root = await temporaryDirectory();
    const skillDirectory = join(root, ".agents", "skills", "internalcot");
    await mkdir(skillDirectory, { recursive: true });
    await writeFile(join(skillDirectory, "personal-notes.md"), "keep me\n");

    const initial = await planSetup({
      targets: ["codex"],
      project: true,
      cwd: root,
      packageVersion: "1.2.3",
    });
    expect(initial.skills[0]?.status).toBe("update");

    const installCli = async () => undefined;
    await applySetup(initial, { installCli });

    const installedSkill = await readFile(join(skillDirectory, "SKILL.md"), "utf8");
    expect(installedSkill).toContain("name: internalcot");
    expect(installedSkill).toContain("internalcot skill");
    expect(installedSkill).not.toContain("internalcot note '");
    expect(await readFile(join(skillDirectory, "personal-notes.md"), "utf8")).toBe("keep me\n");

    const repeated = await planSetup({
      targets: ["codex"],
      project: true,
      cwd: root,
      packageVersion: "1.2.3",
    });
    expect(repeated.skills[0]?.status).toBe("unchanged");
    await expect(applySetup(repeated, { installCli })).resolves.toEqual({
      skillDirectories: [skillDirectory],
    });
  });

  it("installs the exact CLI version before writing its dependent skill", async () => {
    const root = await temporaryDirectory();
    const calls: Array<string> = [];
    const plan = await planSetup({
      targets: ["codex"],
      project: true,
      cwd: root,
      packageVersion: "1.2.3",
    });

    await applySetup(plan, {
      installCli: async (packageSpec) => {
        calls.push(packageSpec);
      },
    });

    expect(calls).toEqual(["internalcot@1.2.3"]);
    expect(await readFile(join(root, ".agents", "skills", "internalcot", "SKILL.md"), "utf8"))
      .toContain("name: internalcot");
  });

  it("does not install a dependent skill when the CLI install fails", async () => {
    const root = await temporaryDirectory();
    const plan = await planSetup({
      targets: ["codex"],
      project: true,
      cwd: root,
      packageVersion: "1.2.3",
    });

    await expect(applySetup(plan, {
      installCli: async () => {
        throw new Error("registry unavailable");
      },
    })).rejects.toThrow("registry unavailable");
    await expect(readFile(join(root, ".agents", "skills", "internalcot", "SKILL.md")))
      .rejects.toMatchObject({ code: "ENOENT" });
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(process.cwd(), ".internalcot-test-"));
  temporaryDirectories.push(directory);
  return directory;
}
