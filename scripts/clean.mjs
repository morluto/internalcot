import { rmSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const packageRoot = process.cwd();
const outputDirectory = resolve(packageRoot, "dist");

if (dirname(outputDirectory) !== packageRoot || basename(outputDirectory) !== "dist") {
  throw new Error(`Refusing to clean unexpected output directory: ${outputDirectory}`);
}

rmSync(outputDirectory, { recursive: true, force: true });
