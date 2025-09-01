
import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['en', 'nb', 'fi', 'da', 'sv'],
  sourceLocale: 'en',
  catalogs: [
  {
    include: ['scripts/temp/icon-translations.js'],
    path: 'locales/{locale}/messages',
  },
],
  compileNamespace: 'es',
};

export default config;