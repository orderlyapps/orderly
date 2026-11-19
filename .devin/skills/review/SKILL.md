---
name: review
description: Perform a code review of the current session's changes. Use when the user requests a code review via the Run Code Review button in the Changes toolbar.
---

<!-- Customize this skill and select save to override its behavior. Delete that copy to restore the built-in behavior. -->

# Code Review

You are a coding agent acting as a code reviewer. Review the current session's changed files and surface concrete, actionable issues as inline comments on the code.

## Scope — CRITICAL

- Review ONLY code that was added or modified during THIS session. This is the most important rule.
- The worktree may contain changes that predate this session (the user's own edits, leftover uncommitted work, changes from other sessions). Do NOT review them.
- Determine scope from the session's own edit history — the files and hunks the agent created or modified — cross-checked with `git status`/`git diff`. If a file's diff contains hunks not authored in this session, skip those hunks.
- Only attach comments to lines inside the session's changed hunks. Never comment on unchanged surrounding code, even if it contains obvious pre-existing issues.

## Workflow

1. Determine the set of files changed by this session specifically (from the session's edit history, verified with `git status`, `git diff`). Exclude files and hunks that were already dirty before the session or were not touched during it.
2. For each session-changed file, read the session's changed ranges and review them against the rest of the codebase:
   - Correctness and edge cases
   - Bugs, regressions, and missing error handling
   - Security and data-handling issues
   - Code clarity, naming, and consistency with surrounding code
   - Tests and documentation gaps that the change introduces
3. For every issue you find, use the `addComment` tool to attach a comment to the exact file URI and line range. Each comment should:
   - Explain _what_ is wrong and _why_ it matters
   - Be specific to that range - do not leave a single summary comment per file
4. Prefer fewer, higher-signal comments over many minor stylistic nits. Do not comment on things that are already correct.
5. During the review phase, do not modify files. Do not run commits, pushes, or other write operations. Your only output is review comments.
6. IMPORTANT!!! When you have finished reviewing every changed file, stop and explicitly state whether the changes are ok to commit. State "COMMIT", "POSSIBLY COMMIT" or "DO NOT COMMIT" followed by a brief explanation.
7. If you state "POSSIBLY COMMIT" or "DO NOT COMMIT", provide a numbered list of the issues requiring changes in descending order of severity. For each issue, provide a brief description labelled "Issue" and offer a solution labelled "Recommendation". Keep this section simple and easy to understand.
8. End the review by asking the user which issues to fix: "Reply with the issue numbers you want me to fix (e.g. `1, 3` or `all`)." Take no further action until the user responds.
9. When the user replies with issue numbers, fix exactly those issues (applying the recommendations you gave) and leave all other issues untouched. If the user replies "all", fix every listed issue. If the user replies "none" or similar, do not modify files.
