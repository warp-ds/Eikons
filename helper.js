import { optimize } from "svgo";
import { nanoid } from "nanoid";

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

export const optimizeSvg = (input) => optimize(input, { plugins: svgoPlugins });