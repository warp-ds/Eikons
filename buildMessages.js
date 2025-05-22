import { messages as nb } from "./locales/nb/messages.mjs";
import { messages as en } from "./locales/en/messages.mjs";
import { messages as fi } from "./locales/fi/messages.mjs";
import { messages as da } from "./locales/da/messages.mjs";
import { messages as sv } from "./locales/sv/messages.mjs";

export const buildMessages = async (iconId) => {

return {
  nb: nb[iconId],
  en: en[iconId],
  fi: fi[iconId],
  da: da[iconId],
  sv: sv[iconId],
};
}