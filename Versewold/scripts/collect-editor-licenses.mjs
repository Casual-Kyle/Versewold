import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Ship the exact installed editor licenses with the offline application.
const packages = new Map();
function collect(name) {
  if (packages.has(name)) return;
  const directory = resolve('node_modules', name);
  const manifest = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
  const license = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md'].find((file) =>
    existsSync(resolve(directory, file)),
  );
  // This pinned transitive package declares MIT/authors in package.json but
  // omits the license file in npm. Ship that attribution and full MIT terms.
  const notice =
    name === 'normalize-strings' && manifest.version === '1.1.1' && manifest.license === 'MIT'
      ? resolve('scripts/license-notices/normalize-strings.txt')
      : undefined;
  if (!license && !notice) throw new Error(`Missing license file for ${name}`);
  packages.set(
    name,
    `${name} ${manifest.version}\n\n${readFileSync(license ? resolve(directory, license) : notice, 'utf8').trim()}`,
  );
  for (const dependency of Object.keys(manifest.dependencies ?? {})) collect(dependency);
}
for (const name of ['@codemirror/state', '@codemirror/view', '@codemirror/commands', 'syllable'])
  collect(name);
const destination = 'public/licenses/editor-dependencies.txt';
const output = `Versewold editor dependencies\n\n${[...packages.values()].join('\n\n========================================\n\n')}\n`;
if (!existsSync(destination) || readFileSync(destination, 'utf8') !== output)
  writeFileSync(destination, output);
