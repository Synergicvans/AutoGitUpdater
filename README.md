# AutoGitUpdater

**Make three small, clearly labeled automated GitHub commits each day, scheduled for 7 PM India time. Your laptop can be off.**

[Open the website](https://autogitupdater-synergicvans.avnish123pandeys.chatgpt.site/) · [See this project's runs](https://github.com/Synergicvans/AutoGitUpdater/actions) · [Publish your own website](DEPLOYMENT.md) · [Full explanation](AUTOGITUPDATER_EXPLAINED.txt)

## Start here

| What do you want? | Where to start |
| --- | --- |
| Manage Synergicvans' existing automation | Section A — it is already installed |
| Set it up for your own GitHub account | Section B |
| Stop or restart it | Section C |
| Publish your own copy of the website | [Deployment guide](DEPLOYMENT.md) |
| Understand every file and API call | [Plain-text explanation](AUTOGITUPDATER_EXPLAINED.txt) |

**Nothing to install on your computer or phone.** You need a browser and a GitHub account. A “repository” is your project folder on GitHub. A “token” is a secret key that gives the website limited access to your account.

## A. Use the existing setup

The automation is already installed in **Synergicvans/AutoGitUpdater**. You do not need to create another repository or press “Set up daily updates” again.

1. Open the [public website](https://autogitupdater-synergicvans.avnish123pandeys.chatgpt.site/). Do not use the old `localhost:4173` preview.
2. Paste your GitHub token and press **Connect**. If you need a token, follow step B2 below.
3. In **Repository**, type `Synergicvans/AutoGitUpdater`.
4. Press **Load**.
5. Look for **Enabled** and the recent run list.
6. Press **Run today** only if you want to test now. Press **Refresh** after a short wait to see the result.

Only an account/token with access to this repository can manage it. Friends should set up their own repository using section B.

**Already updated today?** A successful rerun can create zero new commits. That is expected: it avoids duplicates.

## B. Set up your own account

### B1. Create a project folder on GitHub

1. Sign in to GitHub.
2. Open [Create a new repository](https://github.com/new).
3. Enter **AutoGitUpdater** as the repository name.
4. Choose **Public** if you want anyone to see its code. Choose **Private** if you do not.
5. Turn on **Add a README file**. This creates the first branch.
6. Press **Create repository**.

If you already have a repository with this name, inspect it first. Use another name if it contains unrelated work. Do not delete existing work.

### B2. Make a secret access key

1. Open [GitHub's fine-grained token page](https://github.com/settings/personal-access-tokens/new).
2. Name the token **AutoGitUpdater website**.
3. Choose an expiration date, such as 30 days.
4. Set **Resource owner** to your own account.
5. Under **Repository access**, choose **Only select repositories**.
6. Select the repository you created in B1.
7. Under **Repository permissions**, give these permissions:

| Permission | Choose | Why |
| --- | --- | --- |
| Contents | Read and write | Add files and commits |
| Workflows | Read and write | Install the daily workflow |
| Actions | Read and write | Start, stop, resume, and read runs |

8. Press **Generate token** and copy it.

**Keep the token secret.** Paste it only into the website's token box. Do not put it in README files, screenshots, commits, or chat messages. GitHub may ask you to confirm your identity during token creation. Organization accounts may require administrator approval.

[GitHub token instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

### B3. Connect and install

1. Open [AutoGitUpdater](https://autogitupdater-synergicvans.avnish123pandeys.chatgpt.site/).
2. Paste the token into **GitHub access token**.
3. Press **Connect**. Check that it shows your username.
4. In **Repository**, enter `YOUR-USERNAME/AutoGitUpdater`. Replace `YOUR-USERNAME` with your actual GitHub username.
5. Press **Load**.
6. Press **Set up daily updates** once.
7. Wait for the setup message, then press **Refresh** if the workflow has not appeared.
8. Look for **Enabled**.

The website adds the workflow, generator, tests, installation marker, and generated-file folder. It uses your connected account's identity for future automated commits.

Use a dedicated repository. Setup refuses conflicting files in an unrecognized repository. Reinstalling into an already managed repository may replace its managed scripts with the bundled version.

**Skip “Create AutoGitUpdater” for this beginner route.** You already created the repository in B1. That alternative button needs extra repository-creation access that your restricted token may not have.

### B4. Test that it works

1. Press **Run today**.
2. Wait a short while, then press **Refresh**.
3. Click the run to open its GitHub logs. Check for **success**.
4. Open your GitHub repository's **Code** tab.
5. Open **Project_github1**. You should see `example-1.js`, `example-2.js`, and `example-3.js`.
6. Open the commit history. On a fresh day, expect three commits labeled `chore(auto)`.
7. You may run it again to check duplicate protection: it should skip files already updated today.

A “run requested” message is not proof of success. Always inspect the finished run and its commits.

## C. Stop, resume, or disconnect

| Button | What happens |
| --- | --- |
| Run today | Requests a run now; already-updated files are skipped |
| Stop | Disables future runs and tries to cancel pending/active runs |
| Resume | Enables future scheduled runs; missed days are not backfilled |
| Refresh | Fetches the latest status and five recent runs |
| Disconnect | Forgets the website token; the daily schedule keeps running |

Already-pushed commits remain after Stop. Cancellation may take time; check GitHub Actions.

**You can also stop without using this website:**

1. Open your repository on GitHub.
2. Select **Actions**, then **AutoGitUpdater**.
3. Open the workflow's **…** menu.
4. Choose **Disable workflow**. Choose **Enable workflow** when you want it back.
5. To stop a job that has already started, open that run and choose **Cancel workflow**.

## D. Can I close the website and turn off my computer?

**Yes.** GitHub stores the schedule and starts a temporary cloud computer each day. Your laptop and website are not the scheduler.

```text
GitHub's daily timer
    -> starts a cloud computer
    -> downloads your repository
    -> tests and generates three small examples
    -> commits and pushes changed examples
    -> shuts down the cloud computer
```

The website token is kept only in page memory and forgotten on reload/disconnect. The cloud workflow uses GitHub's separate temporary `GITHUB_TOKEN`. Your website token expiring does not itself stop an installed workflow.

The schedule is `30 13 * * *`: **13:30 UTC = 7 PM India time**. GitHub can delay or drop scheduled jobs. Disabled workflows, permission changes, service problems, or usage limits can interrupt automation. Public schedules may be disabled after 60 days without repository activity. [Scheduling rules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## E. What happens to the green chart?

Eligible commits can count toward your GitHub contribution calendar. Three commits contribute to one day's square, not three squares. The author email, repository, and branch must meet GitHub's rules. Private contribution visibility is controlled in your profile settings.

A green Actions check means a run succeeded; it is different from the profile's green square. Neither promises meaningful human coding. These commits are explicitly automated. [Contribution rules](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference)

## F. Publish your own website

**This is optional. The website linked above already works.** Friends can use it with their own tokens and repositories.

For a separate website address, follow [DEPLOYMENT.md](DEPLOYMENT.md). It explains how to upload five files and turn on GitHub Pages using only your browser. This does not move or alter the existing Sites deployment.

## G. If something goes wrong

| What you see | What to do |
| --- | --- |
| Token rejected / 401 | Check expiration, copy the token carefully, and reconnect |
| GitHub denied access / 403 | Check the three permissions in B2, the selected repository, organization restrictions, and rate limits |
| Repository missing / 404 | Check the exact owner/name and that the token can access it |
| Not installed / unavailable | Wait briefly and Refresh; check Actions access and the workflow's location |
| Setup refuses existing files | Use a dedicated new repository; do not overwrite unrelated work |
| Create repository fails | Create it on GitHub using B1, then connect |
| Run succeeds but no new commits | Check whether today's files were already updated |
| Run fails | Open the run, then the failed step, and read its error; resolve it before retrying |
| Nothing at exactly 7 PM | Scheduling can be delayed; inspect Actions rather than assuming it stopped |
| You see localhost:4173 | Open the public HTTPS website; localhost was a development preview |

The workflow must be at `.github/workflows/daily-update.yml` in the repository root, not inside `scripts/.github`.

**Known verification limit:** The first cloud run created three commits; a rerun made no duplicates. Seven local tests passed. A live website token connected and read history, but GitHub denied Stop for that token. Full website write/setup testing still needs a token with effective write permission. Do not treat readable status as proof that write controls are authorized.

## H. Files, development, and credits

- [Full file-by-file explanation](AUTOGITUPDATER_EXPLAINED.txt)
- [Implementation plan](AUTOGITUPDATER_PLAN.md)
- [Verification status](PROJECT_STATUS.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Developers can install Node.js and run these commands from the project root. Ordinary users do not need them:

```sh
node --test tests/generate-update.test.mjs tests/website.test.mjs
node scripts/preview.mjs
```

No npm installation is needed. The frontend is static; browser requests go directly to GitHub. There is no separate application backend or database. The current frontend is hosted through Sites on Cloudflare-backed infrastructure, and GitHub Actions runs the jobs.

Inspired by [green-commit](https://github.com/zhafranzainal/green-commit), without copying its unlicensed implementation. Reuses the MIT-licensed [actions/checkout](https://github.com/actions/checkout) and [git-auto-commit-action](https://github.com/stefanzweifel/git-auto-commit-action), pinned to specific revisions.
## Independent cloud timer

An optional Cloudflare Worker can trigger the updater when GitHub's own daily schedule is missed. See [the Cloudflare setup guide](cloudflare/README.md). This needs a separate Cloudflare deployment and a GitHub token stored as a Worker secret; entering a token into the website alone does not install it. The timer respects a disabled GitHub workflow and skips completed days.
