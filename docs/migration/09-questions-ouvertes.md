# 09 — Questions ouvertes
| ID | Question / décision | Statut |
|----|---------------------|--------|
| Q-001 | **Résolue autrement (2026-10-07)** : le back sera un **nouveau repository dédié**, qui n'existe pas encore. Le code de `ball-manager-back` n'est plus nécessaire à l'agent. Les Phases 3 et 4 ne dépendent plus de son accès mais de la conception du nouveau back. Les lots « ⛔ Q-001 » deviennent « ⛔ nouveau back ». | ✅ Résolue |
| Q-002 | **Rouverte (2026-10-07).** Initialement : « ball-manager-back est le back cible, Phase 3 = analyse d'écart ». Désormais : la Phase 3 est la **conception du nouveau back** ; le contrat actuellement consommé par le front (`src/lib/api/`) est la **contrainte de compatibilité** de départ. Tout changement de stack exige un ADR fondé sur des besoins mesurés. | ⏳ En cours (Phase 3) |
| Q-003 | Vulnérabilités de production dans le périmètre : LOT-00 sécurité, P1. Vulnérabilités de dev : consignées seulement. | ✅ Résolue 2026-10-07 |
| Q-004 | `worker/` : périmètre complet. `spikes/` : décrit en cartographie, exclu de l'inventaire. `.vscode/` : hors périmètre. | ✅ Résolue 2026-10-07 |
| Q-005 | `worker/` (Playwright + service role) est déclaré OBSOLÈTE par `docs/FBI_WORKER.md:3-13` mais toujours présent et suivi. Supprimer en Phase 5 (lot nettoyage), ou conserver ? | ✅ Résolue 2026-10-07 : oui, `worker/` sera supprimé en Phase 5 après vérification qu'aucun script/déploiement/doc active ne le référence ; la config morte de `next.config.ts` suit le même traitement. || ✅ Résolue 2026-10-07 : oui, suppression en Phase 5 après vérification qu'aucun script/déploiement/doc active ne le référence ; la config morte de `next.config.ts` suit. |
| Q-006 | Faut-il auditer l'historique git (`git log -p`) à la recherche de secrets déjà commités (service_role, `.env`) ? Non fait en Phase 1 (hors consigne). | ✅ Résolue 2026-10-07 : audit fait, aucun secret (voir `10-risques.md`). |
| Q-007 | **Corrigée le 2026-10-07 (Q-017).** Réponse initiale erronée (« déploiement sur VPS »). **Le front est déployé sur Vercel.** La CI GitHub Actions reste limitée aux vérifications ; aucun déploiement automatique sans validation. | ✅ Résolue (corrigée) |

| Q-008 | Clés JWT asymétriques ? **Non vérifiable par moi** : l'URL du projet Supabase n'est dans aucun fichier du dépôt (pas de `.env.local`). Option retenue valable dans les deux cas (ADR-001). **À faire par le propriétaire** : `curl https://<projet>.supabase.co/auth/v1/.well-known/jwks.json` (clés non vides = asymétrique) + durée de vie du JWT. | ⏳ Ouverte (non bloquante) |
| D-1 | Réglages du club : migrer vers l'API (LOT-04, dépend de Q-001). **Mesure conservatoire faite le 2026-10-07** : validation serveur du fuseau (`isValidTimezone`, `club-settings.ts`), commit `cb085e1`. | ✅ Résolue (mesure) / ⏳ migration |
| D-2 | Utiliser `club.timezone`, repli `Europe/Paris` ; helper unique pour les 28 occurrences ; correction dans LOT-05 (pas maintenant). | ✅ Résolue 2026-10-07 |
| Q-009 | Vitest + jsdom + Testing Library en devDependencies : **accepté** 2026-10-07. **Installé le 2026-10-07** (jsdom, Testing Library ; environnement déclaré par fichier). | ✅ Résolue |
| Q-010 | Volumétrie : placeholder non renseigné → « garde tes estimations » appliqué ; toute estimation reste marquée « estimé » dans `08`. | ✅ Résolue (par défaut) |

| D-3 | **TRT-001 : option B, risque accepté** par Rida le 2026-10-07 (voir R-013, `10-risques.md`). Révision obligatoire : au plus tard à la livraison du LOT-02 et, en tout cas, au prochain point 🛑 de Phase 4. LOT-02 en tête des lots de Phase 4. | ✅ Résolue 2026-10-07 |
| Q-011 | **S3 : coexistence puis remplacement progressif** (décision 2026-10-07). ADR-005 « Acceptée » pour S3 ; le mécanisme de routage est révisé (plus de reverse proxy VPS commun, voir Q-012, Q-016). | ✅ Résolue |
| Q-012 | **Le nouveau back sera hébergé sur Railway** (décision 2026-10-07 ; le front est sur Vercel, pas sur un VPS, voir Q-017). ADR-007, ADR-003 et ADR-004 révisés ; ADR-002 (TypeScript + Hono) reste « Proposée ». | ✅ Résolue (hébergement) |
| Q-013 | Configuration « du VPS » : **déduite du dépôt** (`01` §8) puis **caduque** : le propriétaire a confirmé (Q-017) que le front est sur Vercel, ce que le dépôt documentait. Aucun VPS dans le projet. | ✅ Résolue (caduque) |
| Q-014 | **Liste d'appels d'essai prête à copier-coller ci-dessous** (§ « Q-014 — vérifications à exécuter par le propriétaire »). Sémantique exacte de `period=weekend` côté back existant (fuseau, samedi-dimanche ?) et validation du `timezone` par `PATCH /v1/clubs/{id}` : à vérifier par un appel d'essai avant LOT-04/LOT-06 (aucune lecture du code du back). | ⏳ |

| Repo back | **Le propriétaire crée le repository lui-même** et fournira l'URL. L'agent ne crée rien d'ici là (décision 2026-10-07). | ✅ Décision |
| Q-015 | **Décision 2026-10-07 : Supabase conservé pendant toute la phase S3.** Motifs : une base Railway créerait deux sources de vérité tant que `ball-manager-back` écrit dans Supabase ; l'auth Supabase est conservée de toute façon. **Réévaluation obligatoire en fin de S3**, sur mesures (latence p50/p95 Railway↔pooler Supabase en staging, coût mensuel réel des deux options, effort de migration) — ADR-003. Région Railway la plus proche possible de la région Supabase (exigence). | ✅ Résolue |
| Q-016 | **Décision 2026-10-07 : routage par module dans le client front, option (a).** ADR-005 « Acceptée ». La passerelle (b) reste une option ultérieure (conditions dans l'ADR). | ✅ Résolue |
| Q-017 | **Décision 2026-10-07 : le front est déployé sur Vercel.** Conséquences : rollback d'un drapeau de routage = promotion du déploiement précédent ou redéploiement (variables `NEXT_PUBLIC_*` inlinées au build) ; **les journaux d'exécution Vercel enregistrent les « Search Params »** (R-014) ; chemin réel du trafic à jeton documenté dans ADR-005 §Contexte. | ✅ Résolue |

## Q-014 — vérifications à exécuter par le propriétaire (lecture seule sauf T8)
_Aucun de ces appels n'a été exécuté par l'agent (pas d'accès, aucun staging documenté dans le dépôt : recherche `staging|préproduction|recette` négative). Les tests T1 à T7 sont des **GET** ; T8 est un **PATCH** : à lancer sur un club de test ou en suivant la procédure de restauration. Ne collez jamais de jeton dans un ticket ou un journal._
```bash
# --- Variables (à adapter) ---
API="https://<url-ball-manager-back>"; SLUG="<slug-du-club>"; CLUB="<uuid-ou-slug>"
TOKEN="<JWT-supabase>"   # export depuis la session ; NE PAS le publier. Pour les routes publiques, aucun jeton.
AUTH=(-H "Authorization: Bearer $TOKEN")
M="$API/v1/public/clubs/$SLUG/matches"   # lecture publique, sans jeton

# T1 — `period=weekend` : combien de matchs, entre quelles dates ?
curl -sS "$M?period=weekend&limit=200" | jq '{n:(.matches|length), min:([.matches[].matchDatetime]|min), max:([.matches[].matchDatetime]|max), pagination}'

# T2 — comparer avec les deux fenêtres candidates (remplacer les dates par la journée courante, en UTC ;
#      Paris = UTC+2 en été, UTC+1 en hiver). Fenêtre A = samedi 00:00 → lundi 00:00 ; fenêtre B = lundi précédent 00:00 → lundi suivant 00:00
SAT_FROM="2026-10-09T22:00:00Z"; SAT_TO="2026-10-11T22:00:00Z"     # A (exemple pour le samedi 10/10/2026)
MON_FROM="2026-10-04T22:00:00Z"; MON_TO="2026-10-11T22:00:00Z"     # B
for w in "A $SAT_FROM $SAT_TO" "B $MON_FROM $MON_TO"; do set -- $w
  curl -sS "$M?from=$2&to=$3&limit=200" | jq -r '.matches[].id' | sort > "/tmp/win_$1.txt"; done
curl -sS "$M?period=weekend&limit=200" | jq -r '.matches[].id' | sort > /tmp/period.txt
diff -q /tmp/period.txt /tmp/win_A.txt && echo "period=weekend == fenêtre A (samedi-dimanche)"
diff -q /tmp/period.txt /tmp/win_B.txt && echo "period=weekend == fenêtre B (lundi-dimanche, = règle du front)"

# T3 — bornes : `from` est-il inclus, `to` est-il exclu ? (X = date d'un match réel)
X=$(curl -sS "$M?limit=1" | jq -r '.matches[0].matchDatetime'); echo "X=$X"
curl -sS "$M?from=$X&limit=200" | jq '[.matches[]|select(.matchDatetime==env.X)]|length'   # >0 => from INCLUS
curl -sS "$M?to=$X&limit=200"   | jq '[.matches[]|select(.matchDatetime==env.X)]|length'   # >0 => to INCLUS ; 0 => to EXCLU

# T4 — `teamId` vs filtre local par nom d'équipe
TEAM=$(curl -sS "$API/v1/public/clubs/$SLUG/teams" | jq -r '.teams[0].id'); NAME=$(curl -sS "$API/v1/public/clubs/$SLUG/teams" | jq -r '.teams[0].name')
curl -sS "$M?teamId=$TEAM&limit=200" | jq '.pagination.total'
curl -sS "$M?limit=200" | jq --arg n "$NAME" '[.matches[]|select(.teamName==$n)]|length'   # doit être égal au précédent

# T5 — `homeAway` : les matchs sans lieu connu (isHome null) sont-ils exclus des deux côtés ?
curl -sS "$M?homeAway=home&limit=200" | jq '[.matches[]|select(.isHome!=true)]|length'      # attendu 0
curl -sS "$M?homeAway=away&limit=200" | jq '[.matches[]|select(.isHome!=false)]|length'     # attendu 0

# T6 — troncature publique (R-015) : la saison dépasse-t-elle 200 matchs ?
curl -sS "$M?from=2026-08-01T00:00:00Z&limit=200" | jq '.pagination'    # total > 200 => la vue publique est tronquée
# ordre par défaut : croissant ? (comparer le premier et le dernier de la page 1 avec un offset final)
curl -sS "$M?from=2026-08-01T00:00:00Z&limit=2" | jq '[.matches[].matchDatetime]'

# T7 — la pagination respecte-t-elle les filtres ? (total = nombre filtré)
curl -sS "$M?homeAway=home&limit=1" | jq '.pagination.total'

# T8 — ÉCRITURE (rejet d'un fuseau invalide par PATCH /v1/clubs/{id}) : club de TEST de préférence.
#      1) sauvegarder  2) tenter  3) lire  4) RESTAURER si l'API a accepté.
OLD=$(curl -sS "${AUTH[@]}" "$API/v1/clubs/$CLUB" | jq -r '.timezone'); echo "fuseau actuel : $OLD"
curl -sS -o /tmp/patch.json -w "%{http_code}
" -X PATCH "${AUTH[@]}" -H "Content-Type: application/json" -d '{"timezone":"Pas/UnFuseau"}' "$API/v1/clubs/$CLUB"; cat /tmp/patch.json
curl -sS "${AUTH[@]}" "$API/v1/clubs/$CLUB" | jq -r '.timezone'
# Attendu : 400/422 et fuseau inchangé. Si le code est 200 (fuseau invalide accepté) : RESTAURER immédiatement :
# curl -sS -X PATCH "${AUTH[@]}" -H "Content-Type: application/json" -d "{\"timezone\":\"$OLD\"}" "$API/v1/clubs/$CLUB"
```
**À me renvoyer** (sans jeton ni donnée personnelle) : la sortie de T1, quel diff a répondu « == » en T2, les 2 nombres de T3, l'égalité de T4, les 0 de T5, `pagination` de T6, et le code HTTP + le fuseau de T8.
| Q-018 | **Décision 2026-10-07 : option 1 — recherche anonyme bornée** (plus aucun téléchargement du roster ; minimum de caractères, peu de résultats, noms partiels, limitation de débit, journaux sans donnée personnelle). Règles chiffrées proposées dans `11-init-repo-back.md` §7 — **à valider au 🛑**. | ✅ Décision / ⏳ règles à valider |
| Q-019 | Points Railway **non vérifiés** à lever en staging : journalisation de la query string (V1), IPv6 sortant, TLS du domaine propre, variables scellées, région/latence vers Supabase, tarifs (ADR-007, `11` §3). | ⏳ À vérifier (checklist V1–V6) |

| Q-020 | **Règles chiffrées du LOT-02** (nb de mots, nb de résultats, format du nom affiché, limites de débit, retrait de `claimed`) : `11` §7. | ✅ **Validées telles quelles (2026-10-07)** ; réajustement sur la volumétrie réelle après livraison (mesures : `08-metriques.md`) |
| Q-021 | **Sources CSP signalées en Report-Only** qui demandent une décision : `docs/migration/12-csp-report-only.md`. | ✅ **Toutes les recommandations acceptées (2026-10-07)** : (1) liste d'hôtes de logos relevée, (2) `X-Frame-Options: DENY` + `frame-ancestors 'none'`, (3) HSTS laissé à Vercel, (4) pas de collecteur de rapports, (5) mode bloquant avec nonce après ≥ 7 jours de relevé (`12` §4, §6) |
| Q-022 | **R-018 traité en P1 dans le LOT-02 (décision 2026-10-07)** : (1) revendication d'une fiche sans adresse connue soumise à validation d'un admin du club, sans envoi automatique du lien ; (2) aucune fiche coach/admin revendicable par le parcours public. Spécification : `11` §7.9, `04` B.1 bis. | ✅ Décision / ⏳ 2 paramètres à fixer (🛑) : délai d'expiration d'une demande non traitée ; validateur (admin seul, ou coach aussi) |
| Q-023 | **R-014, cible retenue** : jeton en **fragment `#token=`** dans le lien d'e-mail et en **en-tête** (`X-Personal-Link-Token`) dans les appels API. Génération du lien et acceptation de l'en-tête = **actions du propriétaire dans `ball-manager-back`**. Front préparé de façon rétrocompatible (`?token=` toujours accepté, transport en-tête derrière `NEXT_PUBLIC_PUBLIC_TOKEN_HEADER`, défaut off). | ✅ Décision / ⏳ actions propriétaire (`00`) |
| Q-024 | **Revendication (LOT-02), paramètres décidés le 2026-10-07** : expiration **14 jours** ; validateur **`club_admin` seul** ; rôles exclus du parcours public = **tout rôle disposant de droits d'écriture** (coach, admin, coordinateur de dérogations). Spécification : `11` §7.9.1-7.9.2, `04` B.1 bis. | ✅ Décision |
| Q-025 | **Décisions prises seul, validées (2026-10-07)** : en-tête `X-Personal-Link-Token` (ADR-006), en-tête `Content-Security-Policy` séparé limité à `frame-ancestors 'none'` (`12`), nettoyage de l'URL dès la lecture du jeton (ADR-006). Q-009 : jsdom installé (par fichier). | ✅ Décision |
