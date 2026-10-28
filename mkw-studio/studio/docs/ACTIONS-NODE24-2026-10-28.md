# GitHub Actions: Node 24 migration (2026-10-28)

## Studio checks

- `actions/checkout@v5`, `actions/setup-node@v5` and `actions/upload-artifact@v6` run on Node 24.
- The Studio build continues to use Node 22 via `setup-node`'s `node-version` input. This is independent of the JavaScript runtime used to execute an action.
- Both full browser jobs, all assertions and the final `studio` gate remain unchanged.
- The root workflow and `ci/mkw-studio.yml` must remain identical.

## Pages publication

The current GitHub-generated branch/Jekyll workflow embeds `actions/upload-artifact@v4`. It cannot be edited in this repository. A repository-controlled Pages workflow is being prepared; switching the Pages source requires authenticated repository settings. Do not claim this warning is resolved until a successful replacement publication has been verified.

## Official action metadata

- [Checkout v5](https://github.com/actions/checkout/blob/v5/action.yml)
- [Setup Node v5](https://github.com/actions/setup-node/blob/v5/action.yml)
- [Upload Artifact v6](https://github.com/actions/upload-artifact/blob/v6/action.yml)
- [Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Verification

YAML validation and remote full Chromium/Firefox checks are recorded in the task's local checkpoint after publication. No Studio runtime files are modified by this migration.
