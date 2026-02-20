import defaultIconDescriptions from "./default-icon-descriptions.js";
import { globSync } from "glob";
import { Window } from "happy-dom";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { optimizeSvg } from "./helper.js";
import { buildMessages } from "./buildMessages.js";

const regularIcons = globSync("svg/Regular/*.svg");

export function getSVG(svg) {
  const el = getElement({ selector: "svg", htmlString: svg });
  return { attrs: el.attributes, html: el.innerHTML };
}

export function getElement({ selector, htmlString }) {
  const window = new Window();
  window.document.body.innerHTML = htmlString;
  return window.document.querySelector(selector);
}

console.log(regularIcons.length, "icons found");
const basepath = "./dist/";
const locales = ["nb", "en", "fi", "da", "sv"];
rmSync(basepath, { recursive: true, force: true });
mkdirSync(basepath, { recursive: true });
locales.forEach((locale) => {
  const path = `${basepath}${locale}/`;
  mkdirSync(path, { recursive: true });
});

regularIcons.map(async (icon) => {
  const _svg = readFileSync(icon, "utf-8");
  try {
    const iconName = icon
      .substring(icon.lastIndexOf("/") + 1)
      .replaceAll(".svg", "");

    const { data } = optimizeSvg(_svg);
    const svg = getSVG(data);
    const attrs = Array.from(svg.attrs).map(
      (attr) => attr.name + `=` + `"` + attr.value + `"`
    );
    const iconId = defaultIconDescriptions[iconName.toLowerCase()]?.id;
    const titles = await buildMessages(iconId);

    Object.keys(titles).forEach((lang) => {
      const title = titles[lang];
      if (!title) {
        console.warn(`⚠  Missing title for "${iconName}" in locale "${lang}"`);
      }
      const svgString = `<svg ${attrs.join(" ")}><title>${title}</title>${
        svg.html
      }</svg>`;
      writeFileSync(`${basepath}${lang}/${iconName}.svg`, svgString, "utf-8");
    });
  } catch (err) {
    console.error(err);
  }
});
