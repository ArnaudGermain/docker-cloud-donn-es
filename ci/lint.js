// Linter local sans dépendance : syntaxe JS, scripts HTML et règles de propreté.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const roots = ['front', 'back', 'web', 'shared', 'ci'];
let errors = 0, scripts = 0;
function report(file, message) { console.error(`${file}: ${message}`); errors++; }
function syntax(file, source) {
  scripts++;
  const result = spawnSync(process.execPath, ['--check', '-'], { input: source, encoding: 'utf8', timeout: 10000 });
  if (result.status !== 0) report(file, result.stderr || String(result.error));
}
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'data') scan(file); continue; }
    if (!/\.(js|html)$/.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    source.split('\n').forEach((line, index) => {
      if (/[ \t]+$/.test(line)) report(file, `ligne ${index + 1} : espaces en fin de ligne`);
      if (/^(<{7}|={7}|>{7})/.test(line)) report(file, `ligne ${index + 1} : conflit Git non résolu`);
    });
    if (!source.endsWith('\n')) report(file, 'saut de ligne final manquant');
    if (file.endsWith('.js')) syntax(file, source);
    else for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) syntax(file + ' (script HTML)', match[1]);
  }
}
process.on('SIGTERM', () => { console.error('Lint interrompu par SIGTERM'); process.exit(143); });
for (const directory of roots) scan(directory);
if (errors) { console.error(`${errors} erreur(s)`); process.exitCode = 1; }
else console.log(`Lint OK : ${scripts} scripts, syntaxe et règles de propreté vérifiées`);
