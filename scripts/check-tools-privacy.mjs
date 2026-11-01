import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
for (const path of ['src/layouts/Base.astro', 'public/pdf/index.html', 'public/image/index.html', 'public/convert/index.html', 'secret/public/index.html']) {
  const html = read(path);
  assert.match(html, /<html lang="en" data-theme="light">/, path);
  assert.doesNotMatch(html, /(?:src|href)="\/analytics\//, path);
}
for (const path of ['public/pdf/pdf.js', 'public/image/image.js', 'public/convert/convert.js', 'secret/public/app.js', 'public/_ui/ui.js']) {
  assert.doesNotMatch(read(path), /(?:localStorage|sessionStorage)\s*\.\s*setItem|document\s*\.\s*cookie\s*=|indexedDB\s*\.\s*open|sendBeacon\s*\(/, path);
}
const handlers = {};
let theme = 'light';
const button = { setAttribute() {}, addEventListener(name, fn) { handlers[name] = fn; } };
vm.runInNewContext(read('public/_ui/ui.js'), {
  document: {
    readyState: 'complete',
    documentElement: { getAttribute() { return theme; }, setAttribute(_, value) { theme = value; } },
    getElementById(id) { return id === 'theme-toggle' ? button : null; },
    querySelectorAll() { return []; },
  },
  localStorage: { removeItem() {}, setItem() { throw new Error('Unexpected persistence'); } },
  window: {},
});
assert.equal(theme, 'light');
handlers.click();
assert.equal(theme, 'dark');
handlers.click();
assert.equal(theme, 'light');
const nginx = read('nginx.conf').split('server_name tools.kokoapi.space;')[1];
assert.match(nginx, /location \^~ \/analytics\/\s*\{[^}]*return 410;/);
assert.match(nginx, /access_log off;/);
const collector = read('apps/analytics/server.mjs');
assert.doesNotMatch(collector.split('const ALLOWED_HOSTS = new Set([')[1].split(']);')[0], /tools\.kokoapi\.space/);
assert.match(collector, /DELETE FROM pageviews WHERE site = \?/);
console.log('Tools privacy checks passed; light/dark toggle works without saving preferences.');
