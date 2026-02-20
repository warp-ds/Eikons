import { optimize } from "svgo";
import { nanoid } from "nanoid";
import fs from "node:fs";

// these are the only colors we will replace to currentColor
const magicColors = ['#47474f', '#3f3f46', '#9ba8ba', '#71717a', "#1B1B1F"].map(v => v.toLowerCase())
const colorProps = [
  'color',
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
];

const svgoPlugins = [
  { name: 'preset-default',
    params: {
      overrides: {
        removeViewBox: false,
        removeTitle: false,
      }
    }
  },
  {
    name: 'maybeConvertColors',
    fn: (_root) => ({
      element: {
        enter: (node) => {
          for (const [name, value] of Object.entries(node.attributes)) {
            if (colorProps.includes(name) && magicColors.includes(value.toLowerCase())) {
              node.attributes[name] = 'currentColor'
            }
          }
        }
      }
    })
  },
  { name: 'sortAttrs' },
  { name: 'prefixIds', params: { delim: "", prefix: nanoid(5), } }
];

export const optimizeSvg = (input) => optimize(input, { multipass: true, plugins: svgoPlugins });

/**
 * Convert a PascalCase icon name to kebab-case.
 * e.g. "LockShield" → "lock-shield", "ActiveAds" → "active-ads"
 */
export function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Deduplicate, sort, and write icon descriptions to disk.
 * Accepts a descriptions object keyed by lowercase icon name.
 */
export function writeIconDescriptions(descriptions, filePath = "./default-icon-descriptions.js") {
  const sorted = {};
  for (const key of Object.keys(descriptions).sort()) {
    const lowerKey = key.toLowerCase();
    if (!sorted[lowerKey]) {
      sorted[lowerKey] = descriptions[key];
    }
  }

  const jsCode = `export default ${JSON.stringify(sorted, null, 2).replace(
    /"([^"]+)":/g,
    "$1:"
  )};\n`;

  fs.writeFileSync(filePath, jsCode);
}

/**
 * Append a .po entry to a messages.po file if the msgid doesn't already exist.
 * @param {string} poPath - Path to the .po file
 * @param {{ comment: string, msgId: string, msgStr: string }} entry
 */
export function addPoEntry(poPath, { comment, msgId, msgStr }) {
  let content = fs.readFileSync(poPath, "utf8");

  // Don't add duplicates
  if (content.includes(`msgid "${msgId}"`)) return;

  const block = [
    "",
    `#. ${comment}`,
    "#. js-lingui-explicit-id",
    `msgid "${msgId}"`,
    `msgstr "${msgStr}"`,
    "",
  ].join("\n");

  fs.writeFileSync(poPath, content.trimEnd() + "\n" + block, "utf8");
}