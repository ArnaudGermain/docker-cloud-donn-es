# Validation — 29 octobre 2026

Exécutée sur Docker Desktop avec deux projets isolés, sans utiliser le volume de démonstration :

- `docker compose config --quiet`, `git diff --check` et vérification syntaxique des scripts JavaScript : réussis.
- Stack `chantier-integration` sur 18080 : les trois images construites, services healthy.
- `scripts/test-notes.py` : création, lecture, modification, suppression ; rejet des champs vides, statuts inconnus, description trop longue, JSON invalide et corps supérieur à 16 Kio.
- Cinq créations concurrentes : aucune note perdue.
- Suppression et recréation des conteneurs en conservant le volume : six notes retrouvées avec leurs modifications. Nettoyage des notes de test par l’API après vérification.
- Stack `chantier-smoke` sur 18081, `scripts/smoke.sh` : HTML et API via proxy, limites CPU/RAM, healthchecks et SIGTERM validés ; sortie 0 des trois services et logs d’arrêt présents.
- Navigateur : création d’une note depuis le formulaire, modification du statut vers Terminé et filtrage À faire vérifiés. Aucun test de charge soutenue ni test sur appareil mobile physique n’a été effectué.

Les seules notes utilisées sont des données fictives de test. La sauvegarde JSON vise un back unique ; pas d’écriture partagée entre plusieurs réplicas. L’application est une démonstration locale sans authentification.
