# Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

This policy covers the Windows installers of Marginalia that are published on the
[GitHub Releases page](https://github.com/mofchris/marginalia/releases) and on the
[Marginalia download page](https://mofchris.pages.dev/download):

- `Marginalia_<version>_x64-setup.exe` (Windows x86-64, NSIS installer)
- `Marginalia_<version>_x64_en-US.msi` (Windows x86-64, MSI installer)
- `Marginalia_<version>_arm64-setup.exe` (Windows ARM64, NSIS installer)

The macOS build is not signed.

## How releases are built and signed

- Every release is built from the source code in this repository by the
  [Release workflow](.github/workflows/release.yml) on GitHub-hosted runners. Nothing is built or signed on a personal machine.
- The workflow sends the unsigned Windows installers to SignPath. Each signing request is approved by hand before it is signed.
- Only files built from this repository's own source are signed. Third-party libraries are pulled in as source
  through npm and Cargo and compiled into the app by the same workflow.

## Team roles

Marginalia is maintained by one person. All roles are held by the same member.

| Role | Members |
| --- | --- |
| Committers and reviewers | [Christopher Mofunanya (@mofchris)](https://github.com/mofchris) |
| Approvers | [Christopher Mofunanya (@mofchris)](https://github.com/mofchris) |

- **Committers** may change the source code without further review.
- **Reviewers**: every change from someone who is not a committer (for example a pull request) is reviewed by a committer before it is merged.
- **Approvers**: every signing request is approved by hand by an approver.

All team members use multi-factor authentication for GitHub and for SignPath.

## Privacy policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

Marginalia has no telemetry, no analytics, no accounts and no automatic update check. Documents, drafts and settings stay on the
computer it runs on. The installers do not contact any server either.

## Reporting a problem

If you think a signed Marginalia file is not genuine, or that this policy was broken, please
[open an issue](https://github.com/mofchris/marginalia/issues).
