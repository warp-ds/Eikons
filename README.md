# Updating the icons library

## Prerequisite: Get a Figma personal access token

1. Open Figma and go to your files overview.
2. Click the profile dropdown 
3. Click Settings.
4. Click the Security tab.
5. In the section Personal access token, generate an access token with Read access to all files and design systems.

Save this somewhere safe.

## 1. Run the automatic importer

```sh
pnpm install
pnpm run import
```

## 2. Get translations

The importer should have updated the English `.po` with the altText from Figma.

- create PR and merge to `main` branch when approved – pushes to the `main` branch trigger translation request in Crowdin
- await PR from Crowdin with updated `.po` files from all 4 languages – check that the translations are OK and merge into `main`

## 3. Build icons

- run `git pull` on the `main branch` to get the updated `.po` files
- run `pnpm build` – this compiles the `.po` files to `.mjs` for each locale and builds new icons in `dist` folder

## 4. Publish to Eik

- update version number in `package.json` to the next desired version before publishing
- publish to eik manually using `@eik/cli`: `pnpm run eikpublish`
- this requires a key, ask your neighbourhood frontend platform webbie
- update the eikons version used in the preview list in Warp Portal documentation
- Once you see the new icons render and all is ok, update alias:

```sh
# eik alias eikons <version> <alias>
# example:
eik alias eikons 0.1.2 1
```
