"""Test HTTP complet sur une stack Docker isolée, lancée au préalable sur 18080."""
import concurrent.futures, json, os, subprocess, time, urllib.request, urllib.error
base = os.environ.get('TEST_URL', 'http://127.0.0.1:18080')
compose = ['docker', 'compose', '-p', 'chantier-integration']
def call(method, route, data=None, expected=200):
    request = urllib.request.Request(base + route, data=json.dumps(data).encode() if data is not None else None,
        headers={'Content-Type': 'application/json'}, method=method)
    try:
        response = urllib.request.urlopen(request, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        assert response.status == expected, (method, route, response.status, response.read())
        content = response.read()
        return json.loads(content) if content else None
payload = {'chantier': 'TEST Résidence', 'zone': 'Étage 1', 'description': 'Raccord manquant', 'status': 'a-faire'}
with urllib.request.urlopen(base, timeout=5) as response:
    assert 'Carnet de chantier' in response.read().decode()
assert call('GET', '/api/notes') == [], 'Utiliser une stack de test sans notes existantes'
note = call('POST', '/api/notes', payload, 201)
assert note['id'] and note['createdAt']
assert call('GET', '/api/notes')[0]['description'] == payload['description']
for invalid in [{**payload, 'zone': ''}, {**payload, 'status': 'inconnu'}, {**payload, 'description': 'x'*2001}]:
    call('POST', '/api/notes', invalid, 400)
call('POST', '/api/notes', [], 400)
request = urllib.request.Request(base+'/api/notes', data=b'{', headers={'Content-Type':'application/json'}, method='POST')
try:
    urllib.request.urlopen(request)
    raise AssertionError('JSON invalide accepté')
except urllib.error.HTTPError as error:
    assert error.code == 400
call('POST', '/api/notes', {**payload, 'description': 'x'*17000}, 413)
updated = call('PUT', '/api/notes/'+note['id'], {**payload, 'status': 'en-cours', 'description': '<script>test</script>'})
assert updated['status'] == 'en-cours' and updated['createdAt'] == note['createdAt']
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    added = list(pool.map(lambda i: call('POST', '/api/notes', {**payload, 'zone': 'Zone '+str(i)}, 201), range(5)))
assert len(call('GET', '/api/notes')) == 6
# Recréer les conteneurs tout en conservant le volume : le fichier doit survivre.
subprocess.run(compose+['down'], check=True)
subprocess.run(compose+['up','-d','--wait'], check=True)
assert len(call('GET', '/api/notes')) == 6
assert next(n for n in call('GET', '/api/notes') if n['id']==note['id'])['status']=='en-cours'
for item in [note]+added:
    call('DELETE', '/api/notes/'+item['id'], expected=204)
call('DELETE', '/api/notes/'+note['id'], expected=404)
assert call('GET', '/api/notes') == []
print('OK : CRUD, validation, concurrence et persistance après recréation des conteneurs')
