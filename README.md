# Docker Cloud — structure initiale

Première version de démonstration pour une future application de notes de chantier.

- Front : page HTML/JavaScript avec un bouton pour interroger l’API.
- Back : API Node.js `/api/hello` qui renvoie un message JSON.
- Web : reverse proxy Node.js vers le front et le back.

Trois images personnalisées à partir de Node.js du registre Chainguard, sans téléchargement depuis Docker Hub. Aucun module npm externe.

## Lancement

```sh
docker compose up --build -d
```

Ouvrir http://localhost:8080.

```sh
docker compose down
```

Cette étape comporte les Dockerfiles et un Compose simple. Les limites de ressources, contrôles de santé, gestion explicite de SIGTERM et documentation détaillée seront ajoutés ensuite. Les fonctions de notes de chantier ne sont pas encore développées.
