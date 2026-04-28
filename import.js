/**
 * Figma Icon Import Script
 *
 * Fetches icon components from a Figma project, filters to the Size=24
 * variants in the "Regular icons" frame, optimizes them with SVGO,
 * and saves them as individual SVGs to svg/Regular/.
 *
 * Prerequisites:
 *   - Set FIGMA_TOKEN in your environment or .env file
 *
 * Usage:
 *   node import.js
 */

import fs from "fs-extra";
import { glob } from "glob";
import fetch from "node-fetch";
import path from "node:path";
import ora from "ora";
import "dotenv/config";
import { optimizeSvg, toKebab, writeIconDescriptions, addPoEntry } from "./helper.js";
import defaultIconDescriptions from "./default-icon-descriptions.js";

// ─── Configuration ───────────────────────────────────────────────

const FIGMA_PROJECT_ID = "yEx16ew6S0Xgd579dN4hsM";
const FIGMA_API = "https://api.figma.com/v1";
const FRAME_NODE_ID = "7245:198";
const ICON_SIZE_VARIANT = "Size=24";
const OUTPUT_DIR = "svg/Regular";
const LOCALES_DIR = "locales";
const KEYWORDS_PATH = "./data/icon-keywords.json";
const LOCALE_CODES = ["nb", "fi", "da", "sv"];
const LOCALE_LABELS = { nb: "Norwegian", fi: "Finnish", da: "Danish", sv: "Swedish" };

// ─── Figma API helpers ───────────────────────────────────────────

/** Fetch all published components from the Figma project. */
async function fetchComponents(token) {
  const res = await fetch(
    `${FIGMA_API}/files/${FIGMA_PROJECT_ID}/components`,
    { headers: { "X-FIGMA-TOKEN": token } },
  );
  const json = await res.json();

  // Cache response locally for debugging
  fs.outputFileSync(
    "./data/figma_components.json",
    JSON.stringify(json, null, 2),
    "utf8",
  );

  if (!res.ok) throw new Error(json.err);
  return json.meta.components;
}

/** Request SVG download URLs for a list of node IDs. */
async function fetchImageUrls(nodeIds, token) {
  const url = new URL(`${FIGMA_API}/images/${FIGMA_PROJECT_ID}/`);
  url.searchParams.set("ids", nodeIds.join(","));
  url.searchParams.set("format", "svg");

  const res = await fetch(url, {
    headers: { "X-FIGMA-TOKEN": token },
  });
  const json = await res.json();

  if (!res.ok) throw new Error(json.err);
  return json.images; // { [nodeId]: downloadUrl }
}

// ─── Processing ──────────────────────────────────────────────────

/**
 * Filter components to our target frame + size and deduplicate by
 * component set name (e.g. "Tray", "LockShield").
 *
 * Returns one entry per unique icon: { id, name, description }.
 */
function extractIcons(components) {
  const icons = new Map();

  for (const { node_id, name, description, containing_frame } of components) {
    const isTargetFrame = containing_frame.nodeId === FRAME_NODE_ID;
    const isTargetSize = name === ICON_SIZE_VARIANT;
    const iconName = containing_frame.containingComponentSet?.name;

    if (isTargetFrame && isTargetSize && iconName && !icons.has(iconName)) {
      icons.set(iconName, { id: node_id, name: iconName, description });
    }
  }

  return [...icons.values()];
}

/**
 * Parse structured JSON descriptions from Figma components.
 * Updates default-icon-descriptions.js with altText values and
 * writes icon-keywords.json with keyword data.
 *
 * Expected JSON format in Figma description field:
 *   { "altText": "...", "keywords": "keyword1, keyword2" }
 */
function processFigmaDescriptions(icons) {
  let descriptionsUpdated = 0;
  const keywords = {};

  // Load existing keywords file if present
  try {
    const existing = fs.readJsonSync(KEYWORDS_PATH);
    Object.assign(keywords, existing);
  } catch {
    // File doesn't exist yet — that's fine
  }

  for (const icon of icons) {
    if (!icon.description) continue;

    let parsed;
    try {
      parsed = JSON.parse(icon.description);
    } catch {
      // Not JSON — skip (could be a plain text description)
      continue;
    }

    const key = icon.name.toLowerCase();
    const kebab = toKebab(icon.name);
    const msgId = `icon.title.${kebab}`;

    // Update altText in default-icon-descriptions
    if (parsed.altText) {
      const existing = defaultIconDescriptions[key];
      if (!existing || existing.message !== parsed.altText) {
        defaultIconDescriptions[key] = { message: parsed.altText, id: msgId };
        descriptionsUpdated++;
        console.log(`  [Figma] Updated alt text for "${icon.name}": "${parsed.altText}"`);
      }
    }

    // Collect keywords
    if (parsed.keywords) {
      keywords[icon.name] = parsed.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    }
  }

  if (descriptionsUpdated > 0) {
    writeIconDescriptions(defaultIconDescriptions);
    console.log(`\n📝 Updated ${descriptionsUpdated} alt text(s) from Figma descriptions`);
  }

  // Write keywords file (sorted by icon name)
  const sortedKeywords = Object.fromEntries(
    Object.entries(keywords).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.outputFileSync(KEYWORDS_PATH, JSON.stringify(sortedKeywords, null, 2) + "\n", "utf8");

  const keywordCount = Object.keys(sortedKeywords).length;
  if (keywordCount > 0) {
    console.log(`🏷  Wrote ${keywordCount} icon keyword entries to ${KEYWORDS_PATH}`);
  }
}

// ─── OpenAI translation ──────────────────────────────────────────

/**
 * Call OpenAI to translate English alt text into the configured locales.
 * Returns { nb: "...", fi: "...", da: "...", sv: "..." } or null on failure.
 */
async function translateAltText(enText, iconName) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(`  [OpenAI] Skipping "${iconName}" — no OPENAI_API_KEY set`);
    return null;
  }

  const langList = LOCALE_CODES.map((c) => LOCALE_LABELS[c]).join(", ");
  console.log(`  [OpenAI] Translating "${enText}" for "${iconName}" into ${langList}`);

  let res;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You translate concise, accessible alt text for SVG icons.",
              `Reply ONLY with a JSON object with keys: ${LOCALE_CODES.join(", ")}.`,
              "Each value is the translated alt text string in the respective language.",
              "Keep translations short and natural.",
            ].join(" "),
          },
          {
            role: "user",
            content: `Translate this icon alt text into ${langList}:\n\n"${enText}"`,
          },
        ],
      }),
    });
  } catch (e) {
    console.error(`  [OpenAI] Network error for "${iconName}": ${e.message}`);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable body)");
    console.error(`  [OpenAI] API error for "${iconName}": HTTP ${res.status} — ${body}`);
    return null;
  }

  const json = await res.json();
  const rawContent = json.choices?.[0]?.message?.content;

  if (!rawContent) {
    console.error(`  [OpenAI] Empty response for "${iconName}". Full response:`, JSON.stringify(json, null, 2));
    return null;
  }

  try {
    const parsed = JSON.parse(rawContent);
    const missingLocales = LOCALE_CODES.filter((c) => !parsed[c]);
    if (missingLocales.length) {
      console.warn(`  [OpenAI] "${iconName}" response missing locales: ${missingLocales.join(", ")}`);
    }
    console.log(`  [OpenAI] ✔ "${iconName}" →`, parsed);
    return parsed;
  } catch {
    console.error(`  [OpenAI] Failed to parse JSON for "${iconName}". Raw content: ${rawContent}`);
    return null;
  }
}

// ─── Download & save ─────────────────────────────────────────────

/** Download an SVG, optimize it, and write to disk. */
async function downloadIcon(name, url) {
  const res = await fetch(url);
  const rawSvg = await res.text();
  const optimizedSvg = optimizeSvg(rawSvg).data;

  await fs.outputFile(
    path.join(OUTPUT_DIR, `${name}.svg`),
    optimizedSvg,
    "utf8",
  );
}

/** Return icon names currently on disk in OUTPUT_DIR. */
function getExistingIconNames() {
  return glob
    .sync(path.join(OUTPUT_DIR, "*.svg"))
    .map((file) => path.basename(file, ".svg"));
}

/** Report icons that are new in this import, translate alt texts, and update descriptions + .po files. */
async function reportNewIcons(existingNames, downloadedNames, spinner) {
  const added = downloadedNames.filter((n) => !existingNames.includes(n));
  if (!added.length) return;

  console.log(`\n✨ ${added.length} new icon(s) added:`, added.sort());

  // Only process icons that don't already have a description entry
  const iconsNeedingEntry = added.filter(
    (name) => !defaultIconDescriptions[name.toLowerCase()],
  );

  if (iconsNeedingEntry.length) {
    // Scaffold placeholder entries for icons with no description at all
    for (const name of iconsNeedingEntry) {
      const key = name.toLowerCase();
      const msgId = `icon.title.${toKebab(name)}`;
      defaultIconDescriptions[key] = { message: name, id: msgId };
    }
    writeIconDescriptions(defaultIconDescriptions);
    console.log(`📝 Scaffolded ${iconsNeedingEntry.length} placeholder(s) in default-icon-descriptions.js`);
  }

  // Now translate all new icons that have English alt text into other locales
  const iconsToTranslate = added.filter((name) => {
    const desc = defaultIconDescriptions[name.toLowerCase()];
    return !!desc?.message;
  });

  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasOpenAI && iconsToTranslate.length) {
    spinner.start(`Translating alt texts for ${iconsToTranslate.length} icon(s)…`);
  } else if (!hasOpenAI && iconsToTranslate.length) {
    console.log("\nℹ  OPENAI_API_KEY not set — adding English text to .po files only");
  }

  for (let i = 0; i < added.length; i++) {
    const name = added[i];
    const key = name.toLowerCase();
    const kebab = toKebab(name);
    const msgId = `icon.title.${kebab}`;
    const desc = defaultIconDescriptions[key];
    const enText = desc?.message || name;

    console.log(`\n[${i + 1}/${added.length}] Processing "${name}" (msgId: ${msgId})`);
    console.log(`  English: "${enText}"`);

    // Translate via OpenAI
    let translations = null;
    if (hasOpenAI && iconsToTranslate.includes(name)) {
      translations = await translateAltText(enText, name);
    }

    // Write English .po entry
    const enPoPath = path.join(LOCALES_DIR, "en", "messages.po");
    addPoEntry(enPoPath, {
      comment: `Title for ${kebab.replace(/-/g, " ")}.svg icon`,
      msgId,
      msgStr: enText,
    });
    console.log(`  .po [en]: "${enText}"`);

    // Write translated .po entries
    for (const locale of LOCALE_CODES) {
      const translatedText = translations?.[locale] || "";
      const poPath = path.join(LOCALES_DIR, locale, "messages.po");
      addPoEntry(poPath, {
        comment: `Title for ${kebab.replace(/-/g, " ")}.svg icon`,
        msgId,
        msgStr: translatedText,
      });
      if (translatedText) {
        console.log(`  .po [${locale}]: "${translatedText}"`);
      } else {
        console.log(`  .po [${locale}]: (empty — needs manual translation)`);
      }
    }
  }

  if (hasOpenAI && iconsToTranslate.length) {
    spinner.succeed(`Translated alt texts for ${iconsToTranslate.length} icon(s)`);
  }

  console.log(
    `📝 Added ${added.length} entry/entries to locale .po files`,
  );
}

/** Warn about icons that exist locally but were not found in Figma. */
function reportMissingFromFigma(existingNames, downloadedNames) {
  const missing = existingNames.filter((n) => !downloadedNames.includes(n));
  if (missing.length) {
    console.warn(
      `\n⚠  ${missing.length} icon(s) exist locally but are missing from Figma:`,
      missing,
    );
  }
}

// ─── Main ────────────────────────────────────────────────────────

(async function main() {
  const spinner = ora();
  const figmaToken = process.env.FIGMA_TOKEN;

  if (!figmaToken) {
    spinner.fail("FIGMA_TOKEN is not set. Add it to your .env or environment.");
    return;
  }

  const existingIcons = getExistingIconNames();

  // 1. Fetch components from Figma
  spinner.start("Fetching components from Figma…");
  let components;
  try {
    components = await fetchComponents(figmaToken);
    spinner.succeed(`Fetched ${components.length} components`);
  } catch (e) {
    spinner.fail(`Failed to fetch components: ${e.message}`);
    return;
  }

  // 2. Filter to the icons we care about
  const icons = extractIcons(components);
  spinner.info(
    `${icons.length} unique icons matched (${ICON_SIZE_VARIANT}, frame ${FRAME_NODE_ID})`,
  );

  if (!icons.length) {
    spinner.warn("No icons to download.");
    return;
  }

  // 3. Sync alt text and keywords from Figma descriptions
  spinner.start("Processing Figma descriptions…");
  processFigmaDescriptions(icons);
  spinner.succeed("Processed Figma descriptions");

  // 4. Get SVG download URLs
  spinner.start("Fetching download URLs…");
  let imageUrls;
  try {
    imageUrls = await fetchImageUrls(
      icons.map((i) => i.id),
      figmaToken,
    );
    spinner.succeed("Fetched download URLs");
  } catch (e) {
    spinner.fail(`Failed to fetch image URLs: ${e.message}`);
    return;
  }

  // 5. Download, optimize, and save
  let completed = 0;
  const downloadedNames = [];

  spinner.start(`Downloading icons: 0/${icons.length}`);

  await Promise.all(
    icons.map(async (icon) => {
      const url = imageUrls[icon.id];
      if (!url) return;

      await downloadIcon(icon.name, url);
      downloadedNames.push(icon.name);

      completed++;
      spinner.text = `Downloading icons: ${completed}/${icons.length}`;
    }),
  );

  spinner.succeed(`Downloaded and optimized ${downloadedNames.length} icons`);

  // 6. Report new and missing icons
  await reportNewIcons(existingIcons, downloadedNames, spinner);
  reportMissingFromFigma(existingIcons, downloadedNames);
})();
