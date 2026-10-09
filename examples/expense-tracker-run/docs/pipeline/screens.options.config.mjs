import path from 'node:path';
import { pathToFileURL } from 'node:url';
export default {
  baseUrl: pathToFileURL(path.resolve('docs/mockups/options.html')).href,
  outDir: 'docs/mockups/screens/options',
  font: 'Prompt',
  routes: [{ label: 'options', path: '', waitFor: '[data-direction]' }],
  viewports: [{ label: 'desktop', width: 1440, height: 900 }, { label: 'mobile', width: 390, height: 844 }],
  schemes: ['light'],
  timeoutMs: 15000,
};
