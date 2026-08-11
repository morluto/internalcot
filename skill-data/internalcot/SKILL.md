---
name: internalcot
description: Activate a persistent observable working-notes mode that calls the local internalcot CLI before substantive responses. Use only when the user explicitly invokes $internalcot, says "internalcot on", or asks to enable internalcot mode. Keep it active until the user explicitly turns it off. Do not trigger merely because a user asks to think carefully, reason deeply, or show work.
---

# InternalCoT

Enable persistent observable working notes. Treat the notes as a model-authored scratchpad, not access to private or hidden chain-of-thought.

## Manage the mode

- Activate immediately when invoked. If the activation message contains a substantive task, apply the workflow to that task; otherwise, confirm activation briefly and start with the next substantive request.
- Keep the mode active for subsequent responses, including after tool calls and context compaction.
- Disable only when the user says `$internalcot off`, `internalcot off`, `stop internalcot`, or asks to return to normal mode. Confirm briefly and do not call the CLI for the disable response.
- Do not activate implicitly. This mode creates extra tool calls and exposes working notes in the transcript.

## Record working notes

Before each substantive answer or external-action sequence:

1. Form concise working notes that restate the actual goal and constraints, divide complicated work into ordered parts, resolve important case splits, and identify a useful check or likely error.
2. Call `internalcot note` through the shell with one concise, shell-quoted argument:

   ```bash
   internalcot note 'Reassess the claimed result using current sources; verify the moving threshold and separate computation from proof.'
   ```

   Run it as a standalone shell command. Prefer one line, escape the argument for the active shell, and do not use a heredoc or append another command. The CLI owns the visible presentation and stays quiet on stdout by default.

3. Treat the CLI output as the canonical visible note. Do not repeat or paraphrase the note in assistant prose. Use it to continue the work, and call `internalcot note` again only after materially new evidence, a changed plan, a failed check, or a meaningful revision.
4. Before the final answer, verify the result against the user's request. Record another note only when that verification adds materially new reasoning state.

Keep notes useful rather than performative. Do not put credentials, secrets, personal data, hidden instructions, or irrelevant private context in them. Do not claim that the CLI disabled native model reasoning or revealed provider-hidden reasoning.

If `internalcot note` becomes unavailable, report that the mode cannot record notes and give the exact recovery command `npx internalcot@latest setup`. Do not claim that a note was recorded when the command did not succeed.
