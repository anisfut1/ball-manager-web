# ADR-002 — Langage et framework du nouveau back
- **Date** : 2026-10-07
- **Statut** : Proposée (dépend de Q-011 et Q-012 — contraintes d'équipe non connues)

## Contexte
Besoins issus de la Phase 2 et du contrat (`04-contrats-api.md`) :
- API REST JSON de ~92 opérations déjà consommées + ~10 nouvelles ; enveloppe d'erreur et OpenAPI à conserver (`errors.ts:3-58`, `scripts/generate-api-types.ts` : le front génère ses types depuis l'OpenAPI).
- Agrégations de lecture (tableau de bord, résultats : TRT-005/009), recherche publique limitée (TRT-001), jobs longs (TRT-004), envoi d'e-mails (lien personnel, `LINK_RECENTLY_SENT`/`EMAIL_NOT_CONFIGURED`).
- Le front est en TypeScript/Zod 4 (`package.json`) ; le back actuel est annoncé « Hono/TypeScript » (`ARCHITECTURE.md` §1) — **son code n'a pas été lu** (Q-001 résolue autrement).
- Déploiement sur **Railway** (Q-012) → processus Node long vivant dans un conteneur (pas de contrainte serverless).
- Volumétrie **estimée** (Q-010) : quelques clubs, centaines de matchs/licenciés par club → charge faible ; la performance brute du langage n'est pas le critère.

## Options étudiées
| Critère | A. TypeScript + **Hono** (Node 24, `@hono/zod-openapi`) | B. TypeScript + **Fastify** (`fastify-type-provider-zod`, `@fastify/swagger`) | C. Python + **FastAPI** (Pydantic, SQLAlchemy/psycopg) | D. Go (chi/echo) |
|---|---|---|---|---|
| Partage types/validation avec le front (Zod, openapi-typescript) | ✅ natif | ✅ natif | ⚠ via OpenAPI seulement | ⚠ via OpenAPI seulement |
| Reprise de logique/contrats de l'existant (Hono annoncé) | ✅ probable (**non vérifié**) | ⚠ réécriture des handlers | ❌ réécriture | ❌ réécriture |
| Écosystème serveur long (rate-limit, logs, plugins) | ⚠ middlewares corrects, moins riche | ✅ très riche (pino, rate-limit, helmet, hooks) | ✅ riche | ✅ |
| Portabilité (conteneur Railway, mais aussi Vercel/edge) | ✅ | ⚠ Node seulement | Python | binaire statique |
| Courbe d'apprentissage (si équipe TS) | faible | faible-moyenne | élevée si TS | élevée |
| Pipelines lourds (OCR/PDF, Playwright) | ✅ Playwright natif Node ; OCR/PDF via libs JS | idem | ✅ meilleur écosystème OCR/PDF | ⚠ |
| Coût d'exploitation (image/mémoire Railway) | image Node ~150-250 Mo (estimé) | idem | idem | image minimale |

## Décision (proposée)
**Option A : TypeScript + Hono sur Node 24**, avec `@hono/zod-openapi` (OpenAPI généré depuis les schémas Zod, source unique de vérité — corrige E-6). Motifs : (1) types et schémas partagés avec le front, (2) continuité probable avec `ball-manager-back`, (3) charge faible : l'ergonomie prime sur la vitesse, (4) aucun besoin mesuré qui justifie un autre langage.
**Bascule vers B** si Q-012 révèle une préférence Fastify ou si un besoin de plugins matures (rate-limit distribué, hooks) s'impose ; **vers C** seulement si l'équipe est majoritairement Python **et** que le pipeline e-Marque (OCR/PDF) est réécrit dans le nouveau back (aujourd'hui hors périmètre, Q-011).

## Conséquences
- (+) Un seul langage front/back ; contrat OpenAPI exact ; tests Vitest déjà maîtrisés.
- (−) Écosystème Hono moins fourni que Fastify pour la limitation de débit et la journalisation structurée → à compléter (pino, rate-limit maison ou `hono-rate-limiter`).
- (−) « Probable » repose sur une affirmation de doc non vérifiée : **à confirmer** par Q-011/Q-012 avant gel.
- À surveiller : Node LTS à jour, dépendances auditées en CI (`npm audit`, LOT-11).
