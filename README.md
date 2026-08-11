# internalcot

`internalcot` gives coding agents a persistent, observable working-notes mode. An installed skill tells the current agent to call a small local CLI before substantive responses, so its model-authored scratchpad appears in the tool transcript.

This does not reveal private or provider-hidden chain-of-thought. It records notes that the model deliberately writes for observation.

## Install the CLI and skill

Run the guided setup:

```sh
npx internalcot@latest setup
```

Setup always installs the persistent CLI and its skill together. Select Codex, Claude Code, or both; setup shows the exact global command and skill paths before it changes anything.

For a non-interactive Codex install:

```sh
npx internalcot@latest setup --codex --yes
```

Use `--project` to place the skill in the current repository instead of your home directory. Preview the complete installation without making changes:

```sh
# Preview without making changes
npx internalcot@latest setup --codex --project --dry-run
```

Setup writes only the bundled `internalcot` skill files. Re-running it reports an unchanged installation or updates those files while preserving unrelated files in the same directory.

You can also install each part manually:

```sh
npm install --global internalcot
npx skills add morluto/internalcot
```

Restart your coding agent if the new skill does not appear immediately.

## Turn working notes on

Explicitly invoke the skill without giving it a task:

```text
$internalcot
```

The mode remains active for subsequent requests. The agent calls `internalcot note` before substantive work and again only when it has materially new reasoning state. The CLI output is the visible note, so the agent does not repeat it in prose.

Turn it off with:

```text
$internalcot off
```

The toggle is conversational state carried by the skill instructions. It does not change the host's native reasoning setting or install a new first-class tool dynamically.

## Use the working-notes CLI directly

Pass a short note as one quoted argument:

```sh
internalcot note "Check the equality case before drafting."
```

The CLI displays the completed note in small, append-only chunks and writes nothing to stdout by default. This paced display works in hosts that stream process output and safely appears all at once in hosts that buffer it. It is presentation of an already-authored note, not token-by-token access to hidden reasoning.

For immediate output or a machine-readable receipt:

```sh
internalcot note --no-pace 'Check the equality case.'
internalcot note --receipt 'Check the equality case.'
```

The note is written to stderr with an `internalcot>` prefix. With `--receipt`, stdout receives:

```json
{"recorded":true,"next":"Continue the work. Record another note only for materially new reasoning state."}
```

The command does not use the network, require an API key, or save notes to disk. The coding agent's tool transcript is the record.

## Run the API observation POC

The separate `observe` command preserves the original experiment: it starts a second model through the OpenAI Responses API, sets its reasoning effort to `none` by default, forces an `internalcot` function call on the first turn, streams those tool arguments as a visible scratchpad, and then streams the final answer.

Create a project key in the [OpenAI dashboard](https://platform.openai.com/api-keys). Never paste a key into a prompt, issue, chat, source file, or shell command that will be saved in history. Revoke and replace any exposed key.

In Bash on macOS or Linux:

```sh
# Use OpenAI directly, not a previously configured compatible gateway.
unset OPENAI_BASE_URL

read -rsp "OpenAI API key: " OPENAI_API_KEY && echo
export OPENAI_API_KEY

internalcot observe --model gpt-5.6-luna \
  "Work out 17 * 23, then give only the product."

unset OPENAI_API_KEY
```

Scratchpad output goes to stderr and the final answer to stdout, so they can be captured separately:

```sh
internalcot observe "Check whether 17 * 23 = 391" \
  >answer.txt 2>scratchpad.txt
```

The default observation model is `gpt-5.6-sol`. See the [OpenAI model catalog](https://developers.openai.com/api/docs/models) and [API quickstart](https://developers.openai.com/api/docs/quickstart).

If you intentionally use an OpenAI-compatible gateway, set `OPENAI_BASE_URL` only for that gateway and use a credential issued by that provider.

## Development

```sh
npm install
npm run check
npm test
npm run build
npm link
```

Validate the bundled skill with:

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

Verify the packed `dist/cli.js` is executable and the `skills/internalcot` directory is included before publishing.

## Credit

The idea and original proof of concept are by [Can Bölük (@_can1357)](https://x.com/_can1357/status/2087228354399265125).
