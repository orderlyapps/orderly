---
name: sync-base
description: Retrieve all changes from the base branch into the current worktree. Use when working in a worktree and the user wants to update their topic branch with the latest changes from the base branch.
---

# Sync Changes from Base Branch

Merge the base branch into the topic branch (checked out in the current worktree). This is the reverse of the `merge` skill — it brings the current worktree up to date with the base branch rather than pushing work back to it. The context block appended to the prompt contains the source branch, target branch, and main worktree path.

## Guidelines

- **Never rebase or force-push** (`--force`, `--force-with-lease`) without explicit user approval — use a merge commit.
- **Never skip hooks** (do not use `--no-verify`).
- **Never rewrite or drop commits** without asking the user.
- When in doubt about conflict resolution — ask the user.

## Workflow

### 1. Commit uncommitted changes in the current worktree

Check for uncommitted changes:

```
git status --porcelain
```

If there are uncommitted changes, use the `/commit` skill to commit them before continuing. Do not merge into a dirty worktree.

### 2. Fetch the latest base branch

Fetch from the remote so remote changes to the base branch are included:

```
git fetch origin <base-branch>
```

If the repository has no remote or the base branch does not track one, skip this step.

### 3. Merge the base branch into the current branch

Merge the local base branch in the current worktree (no `-C` flag needed):

```
git merge <base-branch>
```

If this merge reports conflicts, resolve them via step 4 before continuing — do not attempt another merge while the worktree is in a conflicted (MERGING) state.

If you fetched in step 2, check whether the remote-tracking ref exists and has commits not yet in the current branch, then merge it too:

```
git rev-parse --verify -q origin/<base-branch> >/dev/null && \
  (git merge-base --is-ancestor origin/<base-branch> HEAD || git merge origin/<base-branch>)
```

If this merge also reports conflicts, resolve them via step 4 before continuing.

### 4. Handle merge conflicts

If the merge reports conflicts:

4.1. List conflicted files:

```
git diff --name-only --diff-filter=U
```

4.2. For each conflicted file, read the file content, resolve the conflict by preserving the intent of both sides, and stage the resolved file:

```
git add <resolved-file>
```

4.3. When in doubt on how to resolve a merge conflict, ask the user for guidance. If the user wants to abort, run:

```
git merge --abort
```

4.4. Once all conflicts are resolved and staged, commit the merge:

```
git commit --no-edit
```

### 5. Verify the worktree still builds and tests pass

After every merge — whether it was clean or required conflict resolution — run the project's validation (`vp check` and `vp test`) to confirm the merged code is consistent before finishing.

## Validation

After the merge completes, verify the result:

1. Confirm the current worktree is clean:

```
git status --porcelain
```

2. Confirm every merged base ref is an ancestor of the current branch (i.e. all base changes are merged):

```
git merge-base --is-ancestor <base-branch> HEAD
```

If you merged `origin/<base-branch>` in step 3, verify it as well:

```
git merge-base --is-ancestor origin/<base-branch> HEAD
```
