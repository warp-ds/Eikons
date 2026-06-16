# Eikons

:warning: **Heads up!** You should not grab SVGs from this repo to use in your apps. Instead, use the `<w-icon>` components from [@warp-ds/elements](https://warp-ds.github.io/docs/components/icons/frameworks/elements). That component will fetch the correct, localized SVG from Eikons based on the `name` and page language.

This repo is here to assist Warpsters in syncing icon SVGs from Figma and to translate the accessible description for icons into our supported languages.

## Updating the icons library

### Prerequisite: Get a Figma personal access token

1. Open Figma and go to your files overview.
2. Click the profile dropdown 
3. Click Settings.
4. Click the Security tab.
5. In the section Personal access token, generate an access token with Read access to all files and design systems.

Save this somewhere safe.

### 1. Run the automatic importer

```sh
pnpm install
pnpm run import
```

### 2. Get translations

The importer should have updated the English `.po` with the altText from Figma. Do a machine translation of the English text to the other locales for an initial release.

When the English `.po` files get pushed to the `main` branch it trigger translation request in Crowdin. Ship a patch release once they arrive.

### 3. Build icons

Tun `pnpm build` – this compiles the `.po` files to `.mjs` for each locale and builds new icons in `dist` folder.

### 4. Publish to Eik

Use Conventional Commits format (`fix:`, `feat:`) on a commit to trigger a new release to Eik via GitHub Actions. It will automatically version and publish.

### 5. Update the alias on Eik

The `postpublish-test.js` script runs on GitHub Actions. If it passes at least all the previous URLs still work. You can do a sanity check on the SVGs themselves, then update the alias.

```sh
pnpm run eikalias 0.2.0 2
```
