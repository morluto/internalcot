# internalcot

[English](README.md) · [简体中文](README.zh-CN.md)

**Make agents show their full chain of thought.**

`internalcot` adds an opt-in reasoning workspace to Codex and Claude Code. Turn it on once and the agent must externalize its problem decomposition, intermediate derivation, alternatives, evidence, uncertainty, and checks in the normal tool transcript for the full conversation.

```sh
npx internalcot@latest setup
```

```text
› $internalcot

• internalcot mode is active for this conversation.

› Recheck this proof. I think the published answer is wrong.

• internalcot> Problem: reassess the proof instead of trusting its prior conclusion.
  Derivation: the required factorials depend on p, so a fixed finite congruence
  construction does not prove the claim. I need to test any proposed family
  against the next factorial threshold.
  Next check: locate the newest claimed proof, then verify that exact gap.
```

The result is a persistent, readable chain of thought you can inspect as the agent works. The agent writes its reasoning into visible working notes.

## Install

The setup command above installs the CLI and skill together. It detects Codex and Claude Code, shows the exact global command and skill paths, and asks before changing anything. After installation, restart your coding agent if the skill does not appear immediately.

For unattended Codex setup:

```sh
npx internalcot@latest setup --codex --yes
```

Use `--project` to install the skill in the current repository instead of your home directory. Preview every change without applying it:

```sh
npx internalcot@latest setup --codex --project --dry-run
```

Re-running setup updates internalcot's own files and preserves unrelated files in the same skill directory.

## Use it

Enable visible working notes:

```text
$internalcot
```

The mode remains active for every response in the current conversation, including across tool calls and context compaction. The agent must record detailed reasoning before its first substantive tool or answer, continue the trace between reasoning phases, and record a final verification before answering.

Disable it explicitly:

```text
$internalcot off
```

The mode is conversational state. It does not change the host's native reasoning setting, and a new conversation starts with internalcot off.

## What appears in the transcript

A useful note exposes the derivation, not merely a polished goal/check summary:

```text
internalcot> Goal: find why the refresh token is rejected only after rotation.
Constraint: preserve existing session data and do not weaken replay protection.
Derivation: rotation updates the token family inside a transaction. The second
request can read the old family before that transaction commits, so validation
compares the presented token against stale state. Weakening replay protection
would hide the race rather than fix it.
Alternatives: serialize rotation per family, or make the read participate in the
same transactional boundary. First reproduce through the public login flow to
distinguish those cases.
```

The CLI prints notes in small, append-only chunks so hosts that stream process output can display them progressively. Hosts that buffer output show the same completed note at once. Either way, the note was authored before the command began; pacing is presentation, not access to hidden token generation.

## Install from skills.sh

The discovery skill is also available on [skills.sh](https://www.skills.sh/morluto/internalcot/internalcot):

```sh
npx skills add morluto/internalcot
```

This installs only the skill. If the persistent CLI is unavailable, the skill runs the current package through npx instead:

```sh
npx --yes internalcot@latest skill --npx
```

That workflow uses `npx --yes internalcot@latest note` for its notes. The recommended `setup` command remains faster because it installs the CLI persistently.

## How the skill stays current

The installed `SKILL.md` is a small discovery stub. On activation it asks the CLI for instructions matching the installed version:

```sh
internalcot skill
```

The full workflow ships inside the npm package. Updating the CLI therefore updates the note contract without leaving an older copied skill behind.

## Use the note command directly

You can write a visible note without enabling the conversational mode:

```sh
internalcot note 'Check the equality case before drafting.'
```

Notes go to stderr with an `internalcot>` prefix. Output is paced and stdout stays empty by default. Use `--no-pace` for immediate output or `--receipt` for a machine-readable result:

```sh
internalcot note --no-pace 'Check the equality case.'
internalcot note --receipt 'Check the equality case.'
```

```json
{"recorded":true,"next":"Continue the derivation in internalcot. Record intermediate reasoning, alternatives, evidence, and checks before the next substantive step."}
```

The command does not use the network, require an API key, or save notes separately. The coding agent's tool transcript is the record.

## API observation POC

`internalcot observe` preserves the original experiment behind this project. It starts a separate model through the OpenAI Responses API, forces a visible scratchpad tool call, streams that tool input, and then streams the answer.

This is a test harness for a separate API request, not the normal skill workflow. It requires an OpenAI API key and may incur API charges.

Create a project key in the [OpenAI dashboard](https://platform.openai.com/api-keys). Never paste a key into a prompt, issue, source file, or shell command saved in history.

```sh
unset OPENAI_BASE_URL

read -rsp "OpenAI API key: " OPENAI_API_KEY && echo
export OPENAI_API_KEY

internalcot observe --model gpt-5.6-luna \
  'Work out 17 * 23, then give only the product.'

unset OPENAI_API_KEY
```

Scratchpad output goes to stderr and the final answer to stdout:

```sh
internalcot observe 'Check whether 17 * 23 = 391' \
  >answer.txt 2>scratchpad.txt
```

The default observation model is `gpt-5.6-sol`. See the [OpenAI model catalog](https://developers.openai.com/api/docs/models) and [API quickstart](https://developers.openai.com/api/docs/quickstart).

## Development

```sh
npm install
npm run check
npm test
npm run build
npm link
```

Validate the public discovery skill with:

```sh
npx skills add . --list
```

## Publishing

```sh
npm whoami
npm run prepublishOnly
npm pack --dry-run --json
npm publish
```

Verify that the packed `dist/cli.js` is executable and that both `skills/internalcot` and `runtime/internalcot-workflow.md` are included.

## Credit

The idea and [original Python proof of concept](https://pasta.can.ac/omegiligox.py) are by [Can Bölük (@_can1357)](https://x.com/_can1357/status/2087228354399265125).

## License

[MIT](LICENSE)
