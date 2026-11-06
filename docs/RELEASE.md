# Release runbook: www.nexussecurityadvisors.com

The site deploys on Cloudflare Pages (project `nexussecurityadvisors`). **Every merge to `main` goes live within about a minute.** There is no separate release step, so the pull request is the release gate.

## 1. Before you open the PR

- Branch from `main`. Keep one change per PR so a rollback stays small.
- Run the checks locally (see [OPERATIONS.md](OPERATIONS.md)): `python3 tools/check_site.py` and, for page changes, `python3 tools/serve.py site` and look at the page.
- If you changed a file under `site/js/` that has a hash in its name, re-hash it and update the HTML that references it. `/js/*` is cached for a year, so an edited file that keeps its old name won't reach returning visitors.
- Add a line to [CHANGELOG.md](../CHANGELOG.md).

## 2. The PR

- CI must be green: headers, CSP, links and sitemap (`check_site.py`), Lighthouse, and CodeQL. A CodeQL "neutral / configuration not found" result on a new branch isn't a failure.
- **Preview.** Cloudflare builds a preview for every branch at `<branch>.nexussecurityadvisors.pages.dev`. Previews sit behind Cloudflare Access: open the preview link itself (not the `cloudflareaccess.com` login page) and sign in with the Cloudflare account email to get a one-time code.
- **Infrastructure prerequisites go in the PR description, under "Before merging".** Anything outside the repo has to happen *before* merge. That includes WAF custom-rule exceptions for new `POST` paths, new Pages secrets or bindings, and DNS. Example: a new `POST` endpoint needs its path added to the "Static site: allow only GET/HEAD/OPTIONS" rule, or the WAF blocks it in production.

## 3. Merge

- **Squash and merge only.** The org ruleset on default branches requires signed commits and linear history. A merge commit fails the linear-history rule. **Rebase and merge** copies the branch commits onto `main` without GitHub signing them, so unsigned branch commits get rejected. Squash produces one commit signed by GitHub, whether or not the branch commits were signed.
- Don't merge while a "Before merging" step is still open.

### Commit signing

- Signed commits on `main` are enforced from **2026-11-06**. History before that date includes unsigned branch commits (shown as "Unverified" on GitHub). Each one reached `main` through a reviewed PR whose merge commit GitHub signed. They are not rewritten, because re-signing them would need a force push to `main` and would change every SHA referenced by PRs, the changelog and Cloudflare deployments.
- Branch commits don't need to be signed, because the squash commit is what lands on `main`. Commits created through the GitHub web UI or API are signed by GitHub and show as Verified.

## 4. Verify (within 10 minutes of merge)

1. **Deployment.** In Cloudflare, go to Workers & Pages → nexussecurityadvisors → Deployments. The newest production deployment should show the merge commit with the status Success.
2. **Smoke check.** Load the changed pages on www.nexussecurityadvisors.com, on both a desktop and a phone-width window.
3. **Headers.** Run `python3 tools/check_site.py --live` to check the production headers and security.txt, or wait for the daily production monitor.
4. **If the change touched forms or `functions/`,** submit one real test through the form. Confirm the lead appears in Zoho CRM with the right Lead Source, then mark it as a test there.
5. **If the change touched analytics,** check that the page's events appear in PostHog's Activity view within a few minutes. Your own browser should be tagged with `?internal=1` so it's excluded from reports.

## 5. Roll back

- **Fastest (no code):** in Cloudflare, open Deployments, pick the last good production deployment, then choose ⋯ → **Rollback to this deployment**. It's live immediately.
- **Then fix forward:** open a `git revert` PR for the bad merge, so `main` matches what's live. A rollback in the dashboard doesn't change `main`, and the next merge would redeploy the bad code.
- If the problem is a WAF or secret change rather than code, revert that setting in Cloudflare. Rolling back the deployment won't help.

## 6. After the release

- Move the card on the Nexus Web Program board to **Done**. PRs move there on their own when merged; draft cards need moving by hand.
- If a rollback happened, add a one-line note to the CHANGELOG entry.
