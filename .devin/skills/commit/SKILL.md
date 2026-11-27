---
name: commit
description: Commit the current worktree's changes with a well-formed commit message. Use when the user wants to commit work, or when another skill requires uncommitted changes to be committed first.
---

# Commit Changes

Create a commit for the changes in the current worktree.

## Scope — CRITICAL

- Commit ONLY files that were created or modified during THIS session chain. This is the most important rule.
- **Sessions form a chain**: when a session is continued/forked from a parent session, uncommitted changes left behind by the parent session belong to this session too — commit them together with this session's own changes. The child session is a continuation of the parent's work, so the parent's uncommitted work is not "foreign" — it is part of the same unit of work.
- The worktree may still contain changes that are foreign to the whole chain (the user's own edits, unrelated leftover work). Do NOT stage or commit those.
- Determine what belongs to the chain from the session's own edit history plus any parent-session context you were given, cross-checked with `git status`/`git diff`. Never rely on `git status` alone to decide what to stage.
- Pre-existing uncommitted changes in files that the session chain's work builds on or continues are a strong signal they came from the parent session. When the diffs look like a coherent continuation of the current task, treat them as part of the chain and stage them.
- Stage files explicitly by path. NEVER use `git add -A`, `git add .`, `git commit -a`, or any other blanket staging — these will sweep up changes that are not part of the chain.
- If a file contains both chain changes and foreign changes, warn the user that their unrelated changes in the same file will be included — or ask before staging.
- When unsure whether a change belongs to this session chain, ask the user before staging it.

## Guidelines

- **Never commit secrets** — check the diff for credentials, tokens, or keys before staging.
- **Never skip hooks** (do not use `--no-verify`).
- **Never amend or rewrite commits** without explicit user approval.
- **Do not push** unless the user explicitly asks.
- **Do not commit** if there are no changes.
- **Never update git config.** If the commit fails because no author identity is set, ask the user which identity to use; if they decline, pass one for that commit only:
  ```
  git -c user.name="Devin" -c user.email="158243242+devin-ai-integration[bot]@users.noreply.github.com" commit ...
  ```
- **Only commit changes from the current session chain.** Stage files changed during this session, plus uncommitted changes inherited from a parent session this one continues. Leave everything else (the user's unrelated edits, foreign leftover work) uncommitted.

## Workflow

### 1. Review the changes

Inspect the worktree state, the full diff, and recent commit history (to match the repo's message style):

```
git status
git diff
git diff --staged
git log --oneline -10
```

Note: `git diff` does not show the contents of untracked files. Read any untracked files directly (or stage them and inspect `git diff --staged`) before committing — the secrets check must cover them too.

### 2. Draft the commit message

- Keep it concise and focused on **why** the change was made, not just what changed.
- Match the style of recent commits (conventional prefixes, capitalization, length).
- Scan the staged content for sensitive information — if any is found, stop and alert the user.

### 3. Stage only this session chain's changes

Stage the files created or modified during this session, plus any uncommitted files inherited from a parent session this one continues:

```
git add <file>...
```

Do not use `git add -A`, `git add .`, or `git commit -a` — the worktree may contain changes foreign to the session chain (the user's unrelated edits), and those must stay uncommitted. When unsure whether a change belongs to the chain, check the file's diff or ask the user before staging it.

### 4. Commit

```
git commit -m "$(cat <<'EOF'
Commit message here.

Generated with [Devin](https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
EOF
)"
```

### 5. Handle pre-commit hook modifications

If a hook reformats or modifies files and the commit fails, stage the modified files and retry the commit once.

## Validation

Confirm the commit landed and the worktree state is as expected:

```
git status --porcelain
git log --oneline -3
```
