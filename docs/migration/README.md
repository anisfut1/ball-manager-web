# Migration Front → Back (ball-manager-web)

**Objectif** : le front (Next.js) se limite à affichage, état d'UI, interactions, validation de confort. Logique métier, calculs, secrets et agrégations vivent dans le back.

**État global** : voir [00-suivi-progression.md](00-suivi-progression.md) (Phase 0 terminée, en attente de validation).

**Reprendre** : lire ce fichier, puis `00-suivi-progression.md`, résumer en 5 lignes, proposer la prochaine action.

**Branche de travail** : `refactor/migration-back` (issue de `claude/sete-basket-app-architecture-c3hlxx`).

## Contexte découvert en Phase 0
- Le front a **déjà** été migré une première fois de Supabase direct vers un back externe `ball-manager-back` (voir [../MIGRATION_TO_API.md](../MIGRATION_TO_API.md)). Ce chantier est donc une **seconde passe** : traitements restants côté front.
- Le back `ball-manager-back` (GitHub `anisfut1/ball-manager-back`) n'est **pas** présent localement. `../captain-sugar-back` (Python/FastAPI) est un projet sans rapport (app diabète). Voir [09-questions-ouvertes.md](09-questions-ouvertes.md).

## Sommaire
- 06-adr
- 11-init-repo-back.md
