# Independent timer for AutoGitUpdater

This Worker asks GitHub to run the existing updater, even if GitHub's own scheduled trigger is missed. Your website address does not change. This deployment serves **one configured repository**, not every visitor to the website.

## Cost

This project uses Workers Free, with 30 timer invocations per day, three cron entries, and no paid storage, custom domain, or public HTTP route. On 2026-09-23 the account dashboard confirmed **Free — $0 — Current plan**. The current free allowance is 100,000 requests/day, five cron entries/account, and 10 ms CPU/invocation. The timer makes at most 12 GitHub API calls per invocation, below the 50-subrequest limit. If a limit is exceeded, investigate or reduce work; do not upgrade automatically. Other applications share account limits. See [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/). Service pricing can change; no permanent free guarantee is made.

## What happens

Cloudflare wakes the timer at 7 PM India time and every ten minutes until 11:50 PM. The timer checks the three example files on GitHub's default branch. If all have today's date, it does nothing. If updates are missing and no updater run is pending, it starts the GitHub workflow. A later tick checks completion and retries a failed run. The GitHub workflow makes the commits with its own temporary GITHUB_TOKEN.

No computer or browser needs to stay open. Cloudflare and GitHub must both remain available. A successful dispatch only means GitHub accepted the request; look for `complete` in later timer logs and verify the GitHub run. An old queued/waiting run blocks retries until it finishes or is canceled.

## Deploy

1. Sign into your own Cloudflare account. Use Workers Free unless you intentionally choose a paid plan.
2. Create a fine-grained GitHub token restricted to the automation repository, with **Contents: read** and **Actions: read and write**. An existing website token with these permissions can also work. Never paste it into source code, GitHub, or chat.
3. From this directory, run `npx wrangler@4 login`, then `npx wrangler@4 deploy`. Review Cloudflare's authorization request. The configuration starts in **DRY_RUN=true**; no dispatch is made yet.
4. In Cloudflare, open **Workers & Pages → autogitupdater-timer → Settings → Variables and Secrets**. Add **GITHUB_TOKEN** with type **Secret**. Paste the token directly into that field and save/deploy.
5. Check configuration: `GITHUB_REPOSITORY=Synergicvans/AutoGitUpdater`, `ENABLED=true`, `DRY_RUN=true`. Change the repository if deploying your own copy.
6. Look under **Settings → Trigger Events** for the three UTC cron entries in `wrangler.jsonc`. Together they cover 19:00–23:50 Asia/Kolkata. New triggers may take up to 15 minutes to propagate.
7. In **Observability**, a timer invocation should log `would-dispatch`, `complete`, or `run-pending`. Read access alone cannot prove dispatch permission.
8. Set **DRY_RUN=false** and deploy the setting. At the next tick, verify a `dispatched` log, then a successful run in GitHub **Actions**, then `complete` on a later tick. A GitHub API 403 requires checking the token's repository selection and Actions write permission.

For CLI secret entry, `npx wrangler@4 secret put GITHUB_TOKEN` prompts securely. Never put the token in a command argument or config file. Before later CLI deployments, update the checked-in DRY_RUN value to match your intended mode: deploying the initial config again intentionally restores dry-run mode.

## Stop, resume, and maintenance

- **Stop:** disable the GitHub workflow using the website or GitHub Actions. The timer respects that state and never re-enables it. Cancel any already-running GitHub job separately.
- **Pause only the independent timer:** set `ENABLED=false` in Cloudflare. GitHub's original daily cron remains enabled unless separately stopped.
- **Resume:** enable the workflow and set `ENABLED=true`, `DRY_RUN=false` in Cloudflare.
- Replace the Cloudflare secret before the personal token expires. The website's in-memory token and this stored secret are separate.
- HTTP access returns 404 and cannot trigger commits. No custom domain is needed. Cloudflare account access and secret management are separate from the existing Sites hosting.
- Check Cloudflare plan usage and GitHub run failures. No schedule guarantees exact timing or contribution-chart credit.

## Local verification

From the repository root: `node --test tests/cloudflare-timer.test.mjs tests/generate-update.test.mjs`.

Sources: [Cloudflare cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [GitHub dispatch API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event).
