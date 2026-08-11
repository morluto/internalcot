# internalcot

`internalcot` asks a model to put its working notes in a visible function call before answering.
The notes are model-authored scratchpad text, not access to hidden reasoning tokens.

## Install

```sh
npm install --global internalcot
```

Set `OPENAI_API_KEY` before running the CLI. `OPENAI_BASE_URL` can point the OpenAI SDK at a compatible gateway.

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
