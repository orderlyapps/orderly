---
name: commit
description: Commit the current worktree's changes with a well-formed commit message. Use when the user wants to commit work, or when another skill requires uncommitted changes to be committed first.
---

# Commit Changes

Create a commit for the changes in the current worktree.

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
- **Only commit changes from the current session.** The worktree may contain modifications made before this session started or by the user. Stage only files you changed during this session; leave everything else uncommitted.

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

### 3. Stage only this session's changes

Stage only the files you created or modified during this session:

```
git add <file>...
```

Do not use `git add -A`, `git add .`, or `git commit -a` — the worktree may contain changes that predate this session or were made by the user, and those must stay uncommitted. When unsure whether a change is yours, check the file's diff or ask the user before staging it.

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
