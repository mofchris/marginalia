# SignPath Foundation: getting the Windows installers signed

SignPath Foundation signs open-source apps for free. Once it is set up, Windows stops showing
"Windows protected your PC" for new Marginalia downloads. (SmartScreen may still warn for a short
while on the first signed release, until the new certificate builds up reputation.)

The macOS build stays unsigned. Apple signing costs $99 a year.

## What you need to do

1. Make sure your GitHub account uses two-factor authentication (Settings > Password and authentication). SignPath requires it.
2. Merge the pull request that adds the license, the code signing policy and the signing workflow.
3. Open https://signpath.org/apply and fill in the form. The answers are below. Copy and paste them.
4. Wait for SignPath's email. They may ask questions. Reply to them.
5. When you are approved, sign in to SignPath at https://app.signpath.io. Turn on two-factor authentication there too.
6. In SignPath, find your **organization ID** (it is in the address bar and under Settings). Check the **project slug** and the **signing policy slug** (usually `release-signing`).
7. In SignPath, create an **API token** for a user with the Submitter role. Copy it. Do not share it with anyone, and do not paste it in a chat.
8. In GitHub, open the marginalia repo > Settings > Secrets and variables > Actions.
   - **Secrets** tab > New repository secret: name `SIGNPATH_API_TOKEN`, value = the token.
   - **Variables** tab > New repository variable: name `SIGNPATH_ORGANIZATION_ID`, value = the organization ID.
   - Only if your slugs differ from the defaults: add variable `SIGNPATH_PROJECT_SLUG` (default `marginalia`) and/or `SIGNPATH_SIGNING_POLICY_SLUG` (default `release-signing`).
9. In SignPath, set the artifact configuration to the one at the end of this page (if the SignPath team has not set one up already).
10. Release as usual: push a new version tag. The Windows jobs will wait for you. Open SignPath and click **Approve** on the signing request within one hour.
11. Check the draft release on GitHub. The Windows files are now signed. Publish the release as usual.

Until step 8 is done, releases keep working exactly as now, just unsigned.

## Answers for the application form

The form may ask these in a different order or wording. Use the answer that fits.

**Project name**
Marginalia

**Repository URL**
https://github.com/mofchris/marginalia

**Project home page**
https://github.com/mofchris/marginalia

**Download page**
https://mofchris.pages.dev/download

**Releases page**
https://github.com/mofchris/marginalia/releases

**License**
MIT (https://github.com/mofchris/marginalia/blob/master/LICENSE)

**Short description**
Marginalia is a small, fast desktop text editor for Markdown. Markdown renders as you type, with no separate preview pane. It also opens plain text files and imports Word (.docx) and RTF files. It is built with Tauri 2 (Rust and the system webview) and runs on Windows and macOS.

**Is the project already released?**
Yes. Version 0.1.7 is on GitHub Releases, with Windows x64 (NSIS and MSI), Windows ARM64 (NSIS) and macOS installers.

**What do you want to sign?**
The Windows installers that GitHub Actions builds for each release:
- `Marginalia_<version>_x64-setup.exe` (NSIS installer)
- `Marginalia_<version>_x64_en-US.msi` (MSI installer)
- `Marginalia_<version>_arm64-setup.exe` (NSIS installer)

**Build system**
GitHub Actions on GitHub-hosted runners. The release workflow is `.github/workflows/release.yml`. It builds from the repository source with tauri-action, uploads the unsigned installers as a workflow artifact, and submits them with `signpath/github-action-submit-signing-request@v3`.

**Code signing policy URL**
https://github.com/mofchris/marginalia/blob/master/CODE_SIGNING_POLICY.md
(A short version is also in the README, under "Code signing policy".)

**Privacy policy**
The app sends no data anywhere. The policy says: "This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it." It is in the README and in CODE_SIGNING_POLICY.md. There is no telemetry, no analytics, no accounts and no automatic update check.

**Team members and roles**
One maintainer holds all roles: Christopher Mofunanya, GitHub @mofchris (https://github.com/mofchris). He is the author/committer, reviews every outside pull request, and approves every signing request.

**Do all team members use multi-factor authentication?**
Yes, on GitHub and on SignPath.

**Does the project contain proprietary code or third-party binaries?**
No. All code is open source. Dependencies come from npm and crates.io as source and are compiled in the release workflow.

**Does the installer change system settings?**
It installs for the current user only and registers "Open with" file associations for Markdown and text files. It includes an uninstaller (Windows "Installed apps" / "Add or remove programs").

**Your name / contact**
Christopher Mofunanya. Use your own email address in the form.

## Artifact configuration for SignPath

The workflow sends one zip per Windows job. The x64 zip holds the NSIS `.exe` and the `.msi`. The ARM64 zip holds only the NSIS `.exe`. Paste this into the project's artifact configuration in SignPath (or check it against the one the SignPath team creates):

```xml
<?xml version="1.0" encoding="utf-8"?>
<artifact-configuration xmlns="http://signpath.io/artifact-configuration/v1">
  <zip-file>
    <pe-file-set product-name="Marginalia">
      <include path="Marginalia_*-setup.exe" min-matches="1" max-matches="1" />
      <for-each>
        <authenticode-sign />
      </for-each>
    </pe-file-set>
    <msi-file-set>
      <include path="Marginalia_*.msi" min-matches="0" max-matches="1" />
      <for-each>
        <authenticode-sign />
      </for-each>
    </msi-file-set>
  </zip-file>
</artifact-configuration>
```

Notes:
- `min-matches="0"` on the MSI lets the same configuration work for the ARM64 zip, which has no MSI.
- `product-name="Marginalia"` makes SignPath refuse any installer whose file details do not name Marginalia. SignPath Foundation requires the product name to match the project name.
- If SignPath says an MSI inside a zip is not allowed, ask them for the right setup. A second artifact configuration just for the MSI is a common fix.

## How the workflow handles signing

- Signing turns on only when the `SIGNPATH_API_TOKEN` secret and the `SIGNPATH_ORGANIZATION_ID` variable both exist. Without them nothing changes.
- With signing on, a first job creates the draft release. Each Windows job then builds, sends its installers to SignPath, waits for approval, and attaches the signed files to the draft release with the same file names as before. The macOS job is unchanged.
- The portfolio download page picks up new releases by those file names, so they must stay the same.
