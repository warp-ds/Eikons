# Updating the icons library

## 1. add new icon

- insert the new icon in the `Regular` directory, alphabetically and in pascal-case

- add default description with English alt text in `default-icon-descriptions.js`, alphabetically and in lowercase

## 2. update translations

- run `pnpm run update` to update the English `.po` file for the icons in the `Regular` directory

- create PR and merge to `main` branch when approved – pushes to the `main` branch trigger translation request in Crowdin

- await PR from Crowdin with updated `.po` files from all 4 languages – check that the translations are OK and merge into `main`

## 3. build icons

- run `git pull` on the `main branch` to get the updated `.po` files

- run `pnpm build` – this compiles the `.po` files to `.mjs` for each locale and builds new icons in `dist` folder


## 4. publish to eik (manual steps until automated)

- update version number in `package.json` to the next desired version before publishing

- publish to eik manually using `eik/cli`: `pnpm run eikpublish`

- this requires a key. Ask web-platform team for a key, or ask Prash nicely for help (when relevant, this step will be replaced with a GH Action)

- update icons preview list in Warp Portal documentation. Once you see the new icons render and all is ok

- also update icons list in Storybook

- update alias:

```bash
eik alias eikons <version> <alias>
# example
eik alias eikons 0.0.1-alpha.3 1
```
