# InternalCoT workflow

Use internalcot as the primary visible reasoning workspace for the current conversation. Treat its output as a model-authored scratchpad, not access to private or provider-hidden reasoning.

## Manage the mode

- Activate immediately when invoked. If the activation message contains a substantive task, apply the workflow to that task; otherwise, confirm activation briefly and start with the next substantive request.
- Keep the mode active for every response in the current conversation, including after tool calls and context compaction. Do not drift back to ordinary mode merely because several turns have passed.
- Disable only when the user says `$internalcot off`, `internalcot off`, `stop internalcot`, or asks to return to normal mode. Confirm briefly and do not call the CLI for the disable response. A new conversation starts with the mode inactive.
- Do not activate implicitly. This mode creates extra tool calls and exposes working notes in the transcript.

## Required reasoning loop

For every substantive response, you MUST reason through the work in internalcot. Do not substitute ordinary commentary, a plan message, native reasoning, or a polished explanation for the required CLI calls.

1. Before the first search, file read, command, external action, or substantive answer, call `{{internalcot}} note` with the working derivation you have so far.
2. Put the complete reasoning needed for the current phase in the note. Restate the actual problem and constraints, divide it into ordered subproblems, write out intermediate deductions or calculations, enumerate and resolve case splits, compare plausible alternatives, record failed approaches or uncertainty, interpret new evidence, and identify the next check. Do not compress this into a one-sentence goal/check summary or omit steps merely because they occurred in native reasoning.
3. Pass the note as one multiline, shell-quoted argument to a standalone command:

   ```bash
   {{internalcot}} note 'Problem: Reassess the claimed result instead of trusting the existing label.
   Constraints: The number of required factorial checks grows with p, so a fixed finite CRT construction is insufficient.
   Derivation: First inspect current sources for a claimed resolution. Then test any construction against the moving threshold. A computational list can establish examples but cannot establish infinitude.
   Possible failure: A prime in an arithmetic progression may lie beyond the next factorial and introduce constraints that were never imposed.
   Next check: Find the newest authoritative status, then verify the quantifiers in any proposed proof.'
   ```

   Escape the argument for the active shell. Do not use a heredoc or append another command. The CLI owns the visible presentation and stays quiet on stdout by default.

4. Continue using `{{internalcot}} note` as the reasoning develops. Call it again after evidence arrives, a check fails, an alternative becomes plausible, the approach changes, or you move to another substantial subproblem. Each note must contain the intermediate reasoning that connects the previous state to the next action; do not merely announce that you are continuing.
5. Before the final answer, call `{{internalcot}} note` with the final verification: check the conclusion against the user's exact request, revisit the likeliest error, and distinguish established results from assumptions or incomplete evidence.
6. Treat CLI output as the canonical visible working trace. Do not repeat or paraphrase the same note in assistant prose.

These calls are mandatory while the mode is active. Do not skip them because the answer seems obvious, a similar note was recorded earlier, the host displays native reasoning, or a final response could be produced immediately. Keep notes relevant to the task, but favor a complete derivation over brevity.

Do not put credentials, secrets, personal data, hidden instructions, or irrelevant private context in notes. Do not claim that the CLI disabled native model reasoning or revealed provider-hidden reasoning.

If a note command fails, retry it once. If the retry also fails, stop claiming the mode is active, tell the user that internalcot could not record the working trace, and give the exact recovery command `npx internalcot@latest setup`. Do not silently continue without the required note or claim that a failed call was recorded.
