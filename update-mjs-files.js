#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import gettextParser from "gettext-parser";

// Get current file + folder in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants for input/output
const LOCALES_ROOT = path.join(__dirname, "locales");
const SOURCE_FILE = "messages.po";
const TARGET_FILE = "messages.mjs";

/**
 * Find all locale directories inside ./locales
 */
function getLocaleDirectories(rootPath) {
  return readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((dir) => dir.name);
}

/**
 * Parse a .po file buffer and convert it into a plain { id: message } object
 */
function parsePoFileToMessages(poFileBuffer, locale) {
  console.log(`→ Parsing ${SOURCE_FILE} for locale '${locale}'...`);
  const parsedPo = gettextParser.po.parse(poFileBuffer);
  const messagesById = {};

  let missingCount = 0;

  for (const [, entries] of Object.entries(parsedPo.translations || {})) {
    if (!entries) continue;

    for (const [msgid, entry] of Object.entries(entries)) {
      if (!msgid) continue; // skip the header entry

      const translated =
        (entry.msgstr && entry.msgstr[0] && entry.msgstr[0].trim()) || "";

      if (!translated) {
        console.warn(`⚠ Empty translation for msgid "${msgid}" in locale '${locale}'`);
        missingCount++;
      }

      messagesById[msgid] = translated || msgid; // fallback to msgid
    }
  }

  const total = Object.keys(messagesById).length;
  console.log(
    `✓ Extracted ${total} entries for locale '${locale}' (${missingCount} missing)`
  );

  return messagesById;
}


/**
 * Write a messages.mjs file exporting the messages object
 */
function writeMessagesModule(outputPath, messages, locale) {
  const moduleContent = `export const messages = ${JSON.stringify(messages, null, 2)};\n`;
  writeFileSync(outputPath, moduleContent, "utf8");
  console.log(`✔ Wrote ${TARGET_FILE} for '${locale}'`);
}

/**
 * Main: convert all locales/*.po files into messages.mjs files
 */
function convertAllLocales() {
  console.log("🚀 Starting PO → MJS conversion...");

  const localeDirs = getLocaleDirectories(LOCALES_ROOT);

  if (localeDirs.length === 0) {
    console.warn("No locale directories found under:", LOCALES_ROOT);
    return;
  }

  let generatedCount = 0;

  for (const locale of localeDirs) {
    const poFilePath = path.join(LOCALES_ROOT, locale, SOURCE_FILE);

    if (!existsSync(poFilePath) || !statSync(poFilePath).isFile()) {
      console.warn(`Skipping ${locale}: ${SOURCE_FILE} not found`);
      continue;
    }

    try {
      const poFileBuffer = readFileSync(poFilePath);
      const messagesObject = parsePoFileToMessages(poFileBuffer, locale);

      const outputFilePath = path.join(LOCALES_ROOT, locale, TARGET_FILE);
      writeMessagesModule(outputFilePath, messagesObject, locale);

      generatedCount++;
    } catch (error) {
      console.error(`✖ Failed to process ${locale}:`, error);
    }
  }

  console.log(`🏁 Finished. Generated ${generatedCount} ${TARGET_FILE} file(s).`);
}

// Run script
convertAllLocales();
