import pkg from "./package.json" with { type: "json" };

// Do a sanity check between what just got published and what is behind the active alias on Eik,
// to make sure we didn't accidentally delete an icon.

/**
 * @typedef {object} EikFileMetadata
 * @property {string} pathname
 * @property {string} mimeType
 */

/**
 * @typedef {object} EikMetadata
 * @property {string} name
 * @property {string} version
 * @property {EikFileMetadata[]} files
 */

/** @type {EikMetadata} */
const justPublished = await fetch(
  `https://assets.finn.no/pkg/eikons/${pkg.version}`,
).then((res) => res.json());

/** @type {EikMetadata} */
const aliasedVersion = await fetch("https://assets.finn.no/pkg/eikons/v1").then(
  (res) => res.json(),
);

const missingIcons = [];

const allAliasedFilesExistInNewVersion = aliasedVersion.files.every((aliasedFile) => {
  const aliasedFileExistsInNewVersion = justPublished.files.some(
    (publishedFile) =>
      publishedFile.pathname === aliasedFile.pathname &&
      publishedFile.mimeType === aliasedFile.mimeType,
  );
  if (!aliasedFileExistsInNewVersion) {
    missingIcons.push(aliasedFile.pathname);
  }
  return aliasedFileExistsInNewVersion;
});

if (allAliasedFilesExistInNewVersion) {
    console.log(`✅ All files from https://assets.finn.no/pkg/eikons/v1 exist in https://assets.finn.no/pkg/eikons/${pkg.version}`);
} else {
    console.error(`These files from https://assets.finn.no/pkg/eikons/v1 are missing in https://assets.finn.no/pkg/eikons/${pkg.version}:`);
    console.log(missingIcons.join("\n"));
}
