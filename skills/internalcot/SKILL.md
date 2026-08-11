---
name: internalcot
description: Activate a persistent observable working-notes mode that calls the local internalcot CLI before substantive responses. Use only when the user explicitly invokes $internalcot, says "internalcot on", or asks to enable internalcot mode. Keep it active until the user explicitly turns it off. Do not trigger merely because a user asks to think carefully, reason deeply, or show work.
---

# InternalCoT

Install the CLI and this skill together with:

```bash
npx internalcot@latest setup
```

This file is a stable discovery skill. The installed CLI owns the version-matched workflow instructions.

## Load the current workflow

When this skill is invoked:

1. Run this standalone command before substantive work:

   ```bash
   internalcot skill
   ```

2. Treat the returned Markdown as the authoritative instructions for the installed CLI version and follow it for the current conversation, including any substantive task in the invocation message.
3. If the command is unavailable or does not support `skill`, do not improvise an older workflow or install software silently. Tell the user to run `npx internalcot@latest setup`, restart the coding agent if needed, and invoke `$internalcot` again.
