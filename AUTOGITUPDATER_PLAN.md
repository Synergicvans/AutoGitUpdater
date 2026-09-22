# AutoGitUpdater — implementation plan

Status: Personal automation deployed and verified. Public website deployed. The user's browser token connects and loads real status but lacks permission for Stop; full website write-flow verification is pending a suitably permissioned token.
Prepared: 2026-09-21.

## Working agreement

Read this file before implementation and use it as the project checklist. Update it with decisions, completed work, validation results, and remaining blockers. The user's later instructions take precedence. Latest request authorizes autonomous repair, implementation, testing, and publication.

## Intended result

Create a project named **AutoGitUpdater** under the user's GitHub account. It should automatically make three small code-change commits each day, scheduled for **7 PM Asia/Kolkata (13:30 UTC)**. GitHub's cloud runners do the work even when the user's laptop and browser are off. It continues while enabled and while GitHub permits execution.

Preserve the original request for a public website: other users should be able to connect GitHub, configure their own repository, and stop or resume their automation. Implement and verify the personal automation first, then complete the public website; the first milestone alone does not complete the full project.

## Existing project and reuse decision

- Reference: https://github.com/zhafranzainal/green-commit
- Its README describes a scheduled script that updates a timestamp file, selects a random commit message, and commits the result.
- On 2026-09-22, inspected every tracked file via GitHub's API at revision `32fc01cb536a59ecc25976c8c97fab27eb741378`: `.github/workflows/bot.yml`, `README.md`, `task.sh`, and `update.md`. There is no license file or license grant in the inspected README.
- The workflow triggers on pushes to main and cron `0 1/3 * * *` (eight scheduled times daily). It uses checkout v3, executes task.sh, then pushes with a temporary GitHub token through github-push-action v0.6.0 with force enabled. The script overwrites a timestamp, selects a random message, and commits using the original author's hard-coded identity. It does not generate code or implement the features named in those messages.
- Verified a successful scheduled run and its matching latest commit: only the timestamp in update.md changed. Automation is real; the feature/bug-fix messages do not describe actual development. Avoid copying the force-push behavior or hard-coded identity.
- Do not assume a public repository grants permission to copy, rebrand, and redistribute its code. Verify the license before copying implementation files. Preserve applicable copyright notices and attribution for reused code.
- If a suitable license cannot be verified, implement our own small generator and workflow, using the MIT-licensed `stefanzweifel/git-auto-commit-action` component for committing and pushing. Verify its license and pin a reviewed release to its full commit SHA during implementation.
- Give AutoGitUpdater its own documentation, configuration, interface, and improvements. Credit actual upstream dependencies and inspiration instead of presenting another author's work as newly written by us.
- Create a new repository with new project history; do not import the reference project's contribution history or backdate commits.

## Architecture

Personal automation:

`GitHub schedule -> temporary runner -> generate and validate a small change -> commit and push -> repeat for three changes -> runner exits`

Public website:

`User -> GitHub sign-in / app installation -> selected repository -> install workflow -> status / stop / resume`

The website manages setup and controls. GitHub Actions owns the daily schedule; the website does not have to remain open or receive a daily visit. A browser extension is unnecessary.

## Milestone 1: Personal repository automation

1. Verify the connected GitHub identity and check whether `AutoGitUpdater` already exists. Reuse only after inspecting its contents; never overwrite an unrelated repository.
2. Establish the user's preferred repository visibility and confirm a GitHub-associated commit email, including a valid GitHub noreply address if preferred. Do not use the reference author's identity.
3. Create a new `AutoGitUpdater` repository and retain this plan in its documentation.
4. Add `Project_github1/` for generated code. Keep the generator, workflow, and documentation outside that generated folder.
5. Generate a tiny valid Python example, such as a deterministic arithmetic function with randomly selected constants and a matching assertion. Mark it as generated and validate it before committing. Keep each file bounded in size.
6. Configure a scheduled workflow on the default branch for `30 13 * * *`, plus manual dispatch for verification.
7. Perform three sequential generation/validation/commit/push steps using the reused commit action. Stage only the intended generated files. Use descriptive messages such as `chore(auto): update generated example 1/3`.
8. Use the workflow's temporary `GITHUB_TOKEN` with `contents: write`. Avoid a long-lived personal token for scheduled execution. Pin third-party actions and grant no unnecessary permissions.
9. Add concurrency protection and durable per-day progress so retries or repeated manual dispatches finish missing steps instead of creating more than three automated commits for the same India-calendar day. Setup and human commits are separate from this limit.
10. Stop on validation or push failure; show the failure in Actions. Do not force-push or rewrite history. Apply bounded conflict handling if the branch changes during a run.
11. Document manual Stop/Resume through GitHub's workflow Disable/Enable controls. Stopping prevents future runs; cancel queued or active runs separately and explain that already-pushed commits remain.

## Milestone 2: Public website

- Brand the website **AutoGitUpdater** and publish it at a public HTTPS address.
- Provide GitHub connection, repository selection, schedule summary, setup/start, actual recent run status, Stop, and Resume.
- User selected browser-only token authentication on 2026-09-22, superseding the originally proposed GitHub App. The static site sends API requests directly to api.github.com, keeps tokens only in memory, and forgets them on disconnect/reload. Recommend a fine-grained token restricted to the target repository with Contents, Workflows, and Actions read/write permissions.
- For other users, guide repository creation when necessary, then install the app on that repository. Do not assume an installation token can create a new repository for an arbitrary user.
- Keep app private keys and any client secrets in hosted server secrets. Use secure sessions, OAuth state validation, CSRF protection, server-side authorization, and short-lived installation tokens. Never embed secrets in client JavaScript or commit them to Git.
- Verify repository ownership/access on every management operation. Never accept a browser-supplied installation ID as proof of authorization.
- Handle disconnected accounts, revoked access, missing repositories, permission errors, partial installation, disabled workflows, and failed runs. Refresh state from GitHub rather than displaying simulated success.
- Stop disables future runs and attempts to cancel active/queued runs, reporting any race or failure. Resume enables future scheduled runs without backfilling missed days.
- Use Sites for the public website unless the user selects another provider. Confirm required outbound GitHub APIs and secret storage are supported before choosing the final server implementation.
- No GitHub App registration, OAuth callback, hosted secret, or app database is required for the chosen token mode. The GitHub App/session requirements above describe the superseded design and are not requirements of this implementation.

## Proposed files

Exact website paths depend on the selected starter; preserve this plan when initializing it.

| File / directory | Purpose |
| --- | --- |
| `AUTOGITUPDATER_PLAN.md` | Living plan and progress record |
| `README.md` | Setup, use, stopping, limitations, and credits |
| `.github/workflows/daily-update.yml` | Cloud schedule and three-step execution |
| `scripts/generate_update.py` | Validated, bounded generated-code changes |
| `Project_github1/` | Generated example and per-day progress |
| `tests/` | Meaningful checks for generation and daily run limits |
| `app/` | Website and server routes, if using the Sites starter |
| `.env.example` | Required variable names without secret values |
| `THIRD_PARTY_NOTICES.md` | Applicable dependency attribution |

## Verification and release checklist

- [x] Write the implementation plan without creating application code.
- [x] Verify reuse licensing and record the selected upstream version.
- [x] Confirm account, repository visibility, and author identity.
- [x] Implement and test valid generation, bounded changes, partial-run recovery, and daily commit limits.
- [x] Verify schedule conversion: 19:00 Asia/Kolkata = 13:30 UTC.
- [x] Push the prepared repository and enable the workflow.
- [x] Trigger a real manual run and inspect three separate commits on the default branch with the intended author.
- [x] Retry that day's run and verify it creates no duplicate automated commits.
- [ ] Verify Stop/Resume and active-run cancellation behavior.
- [ ] Observe a scheduled run; until then distinguish manual success from scheduled execution not yet observed.
- [x] Build the public website with browser-only GitHub token connection, setup, run, stop/resume, and recent run status.
- [ ] Verify the website's complete connection/install flow with a user-supplied token; no token was supplied to the assistant.
- [x] Verify memory-only token request handling and failure states; no shared server accounts/database are used.
- [x] Publish the website publicly. OAuth callback is not applicable to the chosen browser-token mode.
- [ ] Record the repository URL, website URL, verification results, and any remaining limitations here.

## Practical limits to communicate

- Three eligible commits can contribute to one day's square; they do not create three separate squares or prove three manual coding sessions.
- Commit attribution requires an email associated with the account and eligible repository/branch conditions. A fork alone is not a reliable route to contribution credit. Private contribution visibility must be enabled if desired.
- GitHub schedules are best effort: jobs can be delayed or dropped. Do not promise exact timing or uninterrupted daily activity.
- Public scheduled workflows can be disabled after 60 days without repository activity. Revoked permissions, account restrictions, Actions policies, and applicable usage limits can also interrupt execution.
- Successful manual execution is not evidence that a future schedule has already run. Contribution graph updates may lag behind successful pushes.
- The workflow normally requires no separate always-on server. Public website hosting and private Actions usage depend on the applicable service allowances; verify before promising free operation.

## Sources

- Reference project: https://github.com/zhafranzainal/green-commit
- Reusable commit action: https://github.com/stefanzweifel/git-auto-commit-action
- GitHub licensing guidance: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
- Scheduling behavior: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- Contribution eligibility: https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference

## Progress record

2026-09-22 implementation: User authorized completing the project. Confirmed public repository Synergicvans/AutoGitUpdater and write access. Existing workflow was misplaced at scripts/.github/workflows/daily-update.yml and contained only a schedule; scripts/update.sh was empty. Repair these without losing Git history. Use Node.js (available locally and on GitHub runners) instead of Python for a dependency-free generator and tests; generate tiny valid JavaScript examples. Verified MIT license and pinned v7 revisions for checkout and git-auto-commit-action. Commit identity will use the account's public numeric-ID noreply address. Public-site authentication choice requested while personal automation proceeds.

2026-09-21: Inspected the workspace and reference README. Created this plan only. Upstream source/license verification, implementation, GitHub authorization, repository publication, and website deployment remain pending.

2026-09-22: User requested manual, browser-based learning with assistant guidance. Read all four upstream files and checked recent runs plus the latest commit diff. Explain each step and let the user perform repository changes; do not autonomously publish or implement while following this learning request. Begin with understanding the workflow and a browser-only setup; the public website remains a later milestone. No local application files have been created.

2026-09-22 verification: Cloud run https://github.com/Synergicvans/AutoGitUpdater/actions/runs/35759176731 succeeded, creating commits 015301ed195fabe879dfe8b9cc503b7c94fa7a44, 3f95750523c02596cd9ef6584fb8520801905d9b, and 83040ff073bc842860a625f891c37f9428bd9a88, all attributed to Synergicvans. Attempt 2 succeeded with HEAD unchanged, proving duplicate prevention in a real rerun. Seven local tests passed (generator, day boundary, partial recovery, existing-file protection, token request handling, stop/cancellation behavior, credential errors). Website cancellation uses mocked GitHub responses in tests; live website token management remains unverified. No scheduled run has yet been observed.

2026-09-22 publication: Website source uploaded to Sites at commit 9c7a85113ef87ee06ac6e74da4fcf7d872c4f22e. Elevated local packaging was rejected by automatic approval review due to a usage limit. Used the Sites tool's documented hosted-build fallback, without retrying local execution. Saved version 1; deployment appgdep_6ab2ba7907d48191a2ac848d96a104f9 is in progress. Public access is configured. Never store credentials in this plan.

2026-09-22 final deployment: Sites reports deployment succeeded. Public URL: https://autogitupdater-synergicvans.avnish123pandeys.chatgpt.site. User connected their token in the local preview; real account connection, repository load, and workflow history succeeded. GitHub denied the Stop write request; asked the user to add Actions write permission (plus Contents/Workflows write for setup) and reconnect. The workflow is still enabled. WebMCP status tool verified with valid and invalid inputs. Source, plan, status, and website will be mirrored to the user's GitHub repository.
