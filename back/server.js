const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { start } = require('../shared/server');

const file = process.env.NOTES_FILE || '/data/notes.json';
const maximum = Number(process.env.MAX_NOTES || 1000);
if (!Number.isInteger(maximum) || maximum < 1) throw Error('MAX_NOTES invalide');
fs.mkdirSync(path.dirname(file), { recursive: true });
let notes = [];
try {
  notes = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(notes)) throw Error('Le fichier de notes doit contenir une liste');
} catch (error) { if (error.code !== 'ENOENT') throw error; }

function save(next) {
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(next, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, file);
  notes = next;
}
function fail(status, message) { throw Object.assign(Error(message), { status }); }
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Objet JSON attendu');
  const result = {};
  for (const [key, limit] of [['chantier', 100], ['zone', 100], ['description', 2000]]) {
    if (typeof input[key] !== 'string' || !input[key].trim() || input[key].trim().length > limit) {
      fail(400, `${key} obligatoire, maximum ${limit} caractères`);
    }
    result[key] = input[key].trim();
  }
  result.status = input.status ?? 'a-faire';
  if (!['a-faire', 'en-cours', 'termine'].includes(result.status)) fail(400, 'Statut invalide');
  return result;
}
async function body(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) fail(415, 'Content-Type application/json requis');
  const chunks = [];
  await new Promise((resolve, reject) => {
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 16384) {
        chunks.length = 0;
        reject(Object.assign(Error('Requête trop volumineuse'), { status: 413 }));
      } else chunks.push(chunk);
    });
    req.on('end', resolve);
    req.on('error', reject);
    req.on('aborted', () => reject(Error('Requête interrompue')));
  });
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { fail(400, 'JSON invalide'); }
}
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
start(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/api/hello' && req.method === 'GET') {
      return json(res, 200, { service: 'back', message: 'Carnet de chantier' });
    }
    if (pathname === '/api/notes') {
      if (req.method === 'GET') return json(res, 200, notes);
      if (req.method === 'POST') {
        const fields = validate(await body(req));
        if (notes.length >= maximum) fail(409, 'Nombre maximal de notes atteint');
        const now = new Date().toISOString();
        const note = { id: randomUUID(), ...fields, createdAt: now, updatedAt: now };
        save([note, ...notes]);
        return json(res, 201, note);
      }
      fail(405, 'Méthode non autorisée');
    }
    const match = pathname.match(/^\/api\/notes\/([a-f0-9-]+)$/);
    if (!match) fail(404, 'Route introuvable');
    if (!['PUT', 'DELETE'].includes(req.method)) fail(405, 'Méthode non autorisée');
    // Lire le corps avant de chercher la note : aucune attente entre lecture et sauvegarde.
    const fields = req.method === 'PUT' ? validate(await body(req)) : null;
    const index = notes.findIndex(note => note.id === match[1]);
    if (index === -1) fail(404, 'Note introuvable');
    if (req.method === 'DELETE') {
      save(notes.filter(note => note.id !== match[1]));
      res.writeHead(204); return res.end();
    }
    const note = { ...notes[index], ...fields, updatedAt: new Date().toISOString() };
    const next = [...notes]; next[index] = note; save(next);
    return json(res, 200, note);
  } catch (error) {
    if (!error.status) console.error(error);
    if (!res.destroyed) json(res, error.status || 500, { error: error.status ? error.message : 'Erreur de sauvegarde' });
  }
});
