# internalcot

`internalcot` asks a model to put its working notes in a visible function call before answering.
The notes are model-authored scratchpad text, not access to hidden reasoning tokens.

## Install

```sh
npm install --global internalcot
```

Or run it without a global install:

```sh
npx internalcot@latest --help
```

## Test with an OpenAI API key

Create a project key in the [OpenAI dashboard](https://platform.openai.com/api-keys). Never paste a key into a prompt, issue, chat, source file, or command that will be saved in shell history. Revoke and replace any key that has been exposed.

In Bash on macOS or Linux, read the key silently into the current shell and run a small test:

```sh
# Use OpenAI directly, not a previously configured compatible gateway.
unset OPENAI_BASE_URL

read -rsp "OpenAI API key: " OPENAI_API_KEY && echo
export OPENAI_API_KEY

npx --yes internalcot@latest --model gpt-5.6-luna \
  "Work out 17 * 23, then give only the product."
```

The terminal should first show an italic `internalcot>` scratchpad, followed by the final answer. The scratchpad is written to stderr and the answer to stdout. To inspect them separately:

```sh
npx --yes internalcot@latest --model gpt-5.6-luna \
  "Check whether 17 * 23 = 391" \
  >answer.txt 2>scratchpad.txt
```

Remove the key from the shell when you are finished:

```sh
unset OPENAI_API_KEY
```

The smoke test uses `gpt-5.6-luna` to keep cost down. The default is `gpt-5.6-sol`; both support function tools and `reasoning.effort: none`. See the [OpenAI model catalog](https://developers.openai.com/api/docs/models) and [API quickstart](https://developers.openai.com/api/docs/quickstart).

If you intentionally use an OpenAI-compatible gateway, set `OPENAI_BASE_URL` only for that gateway and use a credential issued by that provider.

## Usage

```sh
internalcot "Solve this problem"
cat problem.md | internalcot
internalcot --model gpt-5.6-sol --effort none "Check this proof"
```

Scratchpad output goes to stderr; the final answer goes to stdout so it can be redirected or piped.

```sh
internalcot "Check this proof" >answer.md 2>scratchpad.txt
```

Run `internalcot --help` for all options.

## How it works

The CLI owns the Responses API request. It sets native reasoning effort to `none` by default,
requires an `internalcot` function call on the first turn, displays that call's arguments, and
then returns the tool result so the model can produce its final answer.

This does not reveal private or hidden chain-of-thought. It elicits a separate, observable
scratchpad whose usefulness and faithfulness should be evaluated independently.

## Credit

The idea and original proof of concept are by [Can Bölük (@_can1357)](https://x.com/_can1357/status/2087228354399265125).

## Development

```sh
npm install
npm run check
npm test
npm run build
npm link
```

## Publishing

The package is public and unscoped. Before the first release:

```sh
npm login
npm whoami
npm run prepublishOnly
npm pack --dry-run
npm publish
```

Check that `internalcot` is still available on npm immediately before publishing.
