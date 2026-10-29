# Validation JavaScript — 6 octobre 2026

Le script `sh scripts/smoke.sh` a terminé avec succès sur Docker Desktop :

- Configuration Compose valide et trois images Node construites depuis Chainguard, base figée par digest.
- Démarrage dans l’ordre back → front → web, chacun déclaré healthy.
- Page HTML servie par front à travers web : HTTP 200 et contenu attendu.
- API `/api/hello` à travers web : HTTP 200 et JSON valide.
- Inspection Docker : plafonds mémoire et CPU non nuls sur les trois services.
- Arrêt par Compose : code 0 et log « Arrêt terminé » pour chacun des trois services Node.

Les conteneurs ont été laissés arrêtés. Les images finales ont été reconstruites après retrait de fichiers Dockerfile dupliqués sans usage. Les trois images JavaScript sont exportées dans `../docker-cloud-images.tar`.

La vérification HTTP utilise curl ; le clic dans un navigateur et un test de charge ne font pas partie de cette validation. Les images exportées ciblent la plateforme native de construction ; reconstruire sur une autre architecture si nécessaire.

Le dépôt Git distant et son URL de remise restent à créer sur le compte de l’étudiant.
