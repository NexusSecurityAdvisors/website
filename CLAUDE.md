# CLAUDE.md

Instructions for Claude Code sessions in this repo. Repo conventions also live in
[.github/copilot-instructions.md](.github/copilot-instructions.md) and [docs/RELEASE.md](docs/RELEASE.md).

## Commits and pull requests

- `main` is protected and requires signed commits. Every commit must be signed.
- Never pass `--no-gpg-sign` or `-c commit.gpgsign=false`. After each commit, run
  `git log --show-signature -1` and stop if it does not show a good signature.
- If this session cannot sign (no signing key available), say so before pushing.
  Do not push unsigned commits; leave the branch local or hand it back for re-signing.
- No `Co-Authored-By`, `Claude-Session`, or "Generated with/by Claude" lines in
  commit messages, squash messages, or PR descriptions.
- Add a line to CHANGELOG.md in the same PR as the change.
