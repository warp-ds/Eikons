import fs from "fs";
import originalFileContent from "./default-icon-descriptions.js";

/**
 * Helper script to clean up and get a sorted default icon descriptions
 */

const cleanedContent = {};

// Loop through the original content, transform keys, and remove duplicates
for (const key in originalFileContent) {
  const lowercaseKey = key.toLowerCase();
  if (!cleanedContent[lowercaseKey]) {
    cleanedContent[lowercaseKey] = originalFileContent[key];
  }
}

const sortedKeys = Object.keys(cleanedContent).sort();

const sortedContent = {};
sortedKeys.forEach((key) => {
  sortedContent[key] = cleanedContent[key];
});

// Generate the JavaScript code with export default statement and keys without quotes
const jsCode = `export default ${JSON.stringify(sortedContent, null, 2).replace(
  /"([^"]+)":/g,
  "$1:"
)};\n`;

fs.writeFileSync("./default-icon-descriptions.js", jsCode);
