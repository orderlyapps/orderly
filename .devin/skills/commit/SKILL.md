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

### 3. Stage the relevant files

Stage the files that belong to this change:

```
git add <file>...
```

Do not blindly stage unrelated changes left in the worktree.

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
