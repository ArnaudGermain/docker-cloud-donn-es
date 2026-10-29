const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const base = process.env.TEST_BASE_URL || 'http://web:8080';
const prefix = 'CI-' + randomUUID();
const owned = new Set();
const signal = new AbortController();
process.on('SIGTERM', () => { console.error('Tests interrompus par SIGTERM'); signal.abort(); process.exitCode = 143; });
async function request(method, route, data, status = 200) {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.any([signal.signal, AbortSignal.timeout(5000)])
  });
  const text = await response.text();
  assert.equal(response.status, status, `${method} ${route}: ${text}`);
  return text ? JSON.parse(text) : null;
}
async function create(fields) {
  const note = await request('POST', '/api/notes', fields, 201);
  owned.add(note.id);
  return note;
}
(async () => {
  try {
    const page = await fetch(base, { signal: AbortSignal.timeout(5000) });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Carnet de chantier/);
    const payload = { chantier: prefix, zone: 'Étage 1', description: 'Raccord manquant', status: 'a-faire' };
    const note = await create(payload);
    assert.ok(note.createdAt);
    assert.ok((await request('GET', '/api/notes')).some(n => n.id === note.id));
    const changed = await request('PUT', '/api/notes/' + note.id, { ...payload, status: 'termine', description: '<script>texte</script>' });
    assert.equal(changed.status, 'termine');
    assert.equal(changed.createdAt, note.createdAt);
    assert.equal(changed.description, '<script>texte</script>');
    for (const invalid of [{ ...payload, zone: '' }, { ...payload, status: 'autre' }, { ...payload, description: 'x'.repeat(2001) }]) {
      await request('POST', '/api/notes', invalid, 400);
    }
    await request('POST', '/api/notes', { ...payload, description: 'x'.repeat(17000) }, 413);
    const bad = await fetch(base + '/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{', signal: AbortSignal.timeout(5000) });
    assert.equal(bad.status, 400);
    await bad.text();
    const parallel = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => create({ ...payload, zone: `Zone ${i}` })));
    assert.ok(parallel.every(result => result.status === 'fulfilled'), 'Créations concurrentes échouées');
    const list = await request('GET', '/api/notes');
    assert.equal(list.filter(n => n.chantier === prefix).length, 6);
    await request('DELETE', '/api/notes/' + note.id, undefined, 204);
    owned.delete(note.id);
    await request('DELETE', '/api/notes/' + note.id, undefined, 404);
    console.log('Tests OK : page, CRUD, statuts, erreurs, taille JSON et concurrence');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    for (const id of owned) {
      try { await request('DELETE', '/api/notes/' + id, undefined, 204); }
      catch (error) { console.error('Nettoyage de la note CI échoué', id, error.message); process.exitCode = 1; }
    }
  }
})();
