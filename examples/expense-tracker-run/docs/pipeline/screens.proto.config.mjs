// Capture config for the clickable prototype (proto-agent, stage 4).
// Each route has its own query string so every capture is a fresh page load (scenario params: month, data, cat, storage, mode, fill, errors, edit, save).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const file = pathToFileURL(path.resolve('docs/mockups/index.html')).href;
const r = (label, query, hash) => ({ label, path: `?s=${label}${query ? '&' + query : ''}#${hash}`, waitFor: 'main' });
export default {
  baseUrl: file,
  outDir: 'docs/mockups/screens',
  font: 'Prompt',
  routes: [
    r('home', '', 'home'),
    r('home-negative', 'month=2026-09', 'home'),
    r('home-income-only', 'month=2026-08', 'home'),
    r('home-empty-month', 'month=2026-11', 'home'),
    r('home-empty-app', 'data=empty', 'home'),
    r('home-loading', 'mode=loading', 'home'),
    r('home-error', 'mode=error', 'home'),
    r('list', '', 'list'),
    r('list-filtered', 'cat=food', 'list'),
    r('list-filter-empty', 'cat=education', 'list'),
    r('list-empty-month', 'month=2026-11', 'list'),
    r('entry-form', 'fill=1', 'entry-form'),
    r('entry-form-empty', '', 'entry-form'),
    r('entry-form-errors', 'errors=1', 'entry-form'),
    r('entry-form-edit', 'edit=d4', 'entry-form'),
    r('delete-confirm', '', 'delete-confirm'),
    r('storage-alerts', '', 'storage-alerts'),
    r('storage-alerts-corrupt', 'storage=corrupt', 'home'),
  ],
  viewports: [{ label: 'desktop', width: 1440, height: 900 }, { label: 'mobile', width: 390, height: 844 }],
  schemes: ['light', 'dark'],
  timeoutMs: 15000,
};
