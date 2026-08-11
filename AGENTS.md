# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the strict TypeScript CLI and its modules: command parsing, setup/install logic, working-note formatting, runtime skill loading, and the OpenAI model adapter.
- `test/` contains Vitest tests, generally named after the module under test (for example, `setup.test.ts` and `working-notes.test.ts`).
- `skills/internalcot/` and `runtime/` contain the packaged discovery skill and runtime workflow; keep these assets compatible with the CLI behavior.
- `scripts/clean.mjs` supports clean builds. `dist/` is generated and should not be committed.

## Build, Test, and Development Commands

Use Node.js `>=22.13.0` and npm:

```sh
npm ci                  # Install the lockfile-pinned dependencies
npm run check           # Type-check source and tests without emitting files
npm test                # Run the Vitest suite once
npm run build           # Clean and compile src/ into dist/
npx skills add . --list # Validate the public skill package discovery
```

Run a focused test with `npm test -- test/setup.test.ts`. CI runs `check`, `test`, and `build` on every push and pull request.

## Coding Style & Naming Conventions

Use two-space indentation, double-quoted strings, semicolons, and ESM imports with `.js` extensions. Keep TypeScript strict and prefer explicit readonly/type-safe contracts, small modules, and descriptive names. Match existing `camelCase` functions/variables, `PascalCase` types/classes, and kebab-case module filenames such as `setup-options.ts`. There is no separate formatter or linter configured; `npm run check` is the style-adjacent gate.

## Testing Guidelines

Add or update a focused Vitest test for observable behavior, including invalid CLI options and filesystem/setup changes where relevant. Group cases with `describe` and use behavior-oriented `it` descriptions. Run the full suite before submitting; no separate coverage threshold is configured.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit pattern with a concise type and optional scope, such as `feat(skill): ...`, `fix(setup): ...`, `refactor(note): ...`, or `chore(release): ...`. Keep commits focused. Pull requests should explain the user-visible outcome, link related issues when applicable, describe tests run, and call out packaging or CLI compatibility changes. Include README or asset updates when behavior changes.

## Security & Configuration Tips

The `observe` command can call the OpenAI API and incur charges. Never commit or place API keys in prompts, source, issues, or shell history; use an environment variable and unset it afterward. Review setup changes carefully because the CLI writes agent skill files globally or into the current project.
