# 04 — Contrats d'API
_Phase 3, 2026-10-07. Deux parties : **(A)** le contrat **actuellement consommé** par le front (contrainte de compatibilité du nouveau back, Q-002) ; **(B)** les **nouveaux endpoints** nécessaires aux lots bloqués. Aucune hypothèse sur le code de `ball-manager-back` (non lu) : tout vient de `src/lib/api/` et du schéma OpenAPI commité `src/lib/api/generated/schema.ts`._

> **Fiabilité de la source.** `schema.ts` (8 307 lignes, généré par `npm run api:generate`) n'est **pas** une source de vérité sûre : il contient au moins un chemin différent de celui réellement appelé en production (voir §A.4). Règle retenue : **le code du front fait foi pour les chemins ; le schéma fait foi pour la forme des DTO** — à revalider contre le back réel avant implémentation (`npm run api:smoke`, `scripts/api-smoke.ts:11`).

## A. Contrat actuel (compatibilité)

### A.1 Conventions communes
| Sujet | Contrat actuel | Preuve |
|---|---|---|
| Base | `NEXT_PUBLIC_CLUB_MANAGER_API_URL` | `src/lib/api/config.ts:8`, `src/config/env.public.ts:24` |
| Auth club/admin | `Authorization: Bearer <JWT Supabase>` ; 401 → front : redirection `/login` (serveur) ou 1 refresh puis `/login` (navigateur) | `client.ts:54-56`, `server.ts:24-35`, `browserClient.ts:27-52` |
| Auth publique | **aucune** (lecture) ou **jeton personnel en query `?token=`** (écriture / identité) | `publicTables.ts:11,72-122`, `publicDerogationRequests.ts:25-29`, `publicHome.ts:8-9` |
| Corps | JSON ; `Content-Type` posé si corps ; réponses 204 → `undefined` | `client.ts:51-53,78-80` |
| Cache | `cache: "no-store"` par défaut | `client.ts:67` |
| Timeout client | 20 s par défaut ; jusqu'à 280 s sur 4 endpoints (voir TRT-004) | `client.ts:31,68` ; `integrations.ts:64,82,98,138` |
| Erreurs | enveloppe `{ "error": { "code": string, "message": string, "details"?: object } }` ; statuts utilisés : 401, 403, 404, 409, 422/400, 429, 5xx ; réseau coupé → `ApiUnreachableError` | `errors.ts:3-58`, `generated/schema.ts:7282-7288` |
| Codes d'erreur lus par le front | `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `TABLE_ASSIGNMENT_CONFLICT`, `ALREADY_ASSIGNED_ON_MATCH`, `DEROGATION_SLOT_CONFLICT`, `DEROGATION_REQUEST_ALREADY_ACTIVE` (`details.requestId`), `LINK_RECENTLY_SENT`, `EMAIL_REQUIRED`, `EMAIL_NOT_CONFIGURED`, `CLUB_ADMIN_REQUIRED` (commentaire `publicTables.ts:70`) | grep `src/` (hors schéma) |
| Identifiant de club | `{clubId}` accepte **UUID ou slug** (« UUID ou slug du club ») | `generated/schema.ts:583-584` |
| Pagination | `limit`/`offset` + `pagination:{limit,offset,total}` ; **max 200** ; par défaut 50 les plus anciens (piège documenté `matches.ts:40-52`) | `matches.ts:56-75`, `schema.ts:7364-7368` |
| Jobs asynchrones | motif `202 + jobId` + `GET /v1/jobs/{jobId}` ; statuts terminaux `succeeded`/`failed` ; sondage borné 40 × 1,5 s | `jobs.ts:7-44` (utilisé aujourd'hui par `POST …/fbi/test`, `integrations.ts:43-45`) |

### A.2 Inventaire exhaustif — 100 opérations du schéma, 92 appelées par le front
_Généré le 2026-10-07 à partir de `generated/schema.ts` (100 opérations / 89 chemins) croisé avec les appels de `src/lib/api/*.ts` (hors tests). « Erreurs doc. » = statuts d'erreur déclarés dans le schéma. Les appels construits via `base(…)` sont rattachés à la fonction d'appel. Le paramètre `?token=` des routes à jeton personnel n'apparaît pas dans la colonne Query._

### Espace club / admin (JWT Supabase) — 63 opérations

| Méth. | Chemin | Auth | Query | Corps | Réponse 2xx | Erreurs doc. | Appels front (`fichier:ligne`) |
|---|---|---|---|---|---|---|---|
| GET | `/v1/clubs` | JWT Supabase (Bearer) | — | — | 200→ClubDto[] | 401,403,404 | clubs.ts:14 |
| GET | `/v1/clubs/{clubId}` | JWT Supabase (Bearer) | — | — | 200→ClubDto | 401,403,404 | clubs.ts:20 |
| PATCH | `/v1/clubs/{clubId}` | JWT Supabase (Bearer) | — | UpdateClubDto | 200→ClubDto | 400,401,403,404,409 | clubs.ts:25 |
| GET | `/v1/clubs/{clubId}/capabilities` | JWT Supabase (Bearer) | — | — | 200→ClubCapabilities | 401,403,404 | clubs.ts:30 |
| GET | `/v1/clubs/{clubId}/teams` | JWT Supabase (Bearer) | — | — | 200→TeamDto[] | 401,403,404 | clubs.ts:35 |
| POST | `/v1/clubs/{clubId}/teams` | JWT Supabase (Bearer) | — | CreateTeamDto | 201→TeamDto | 400,401,403,404,409 | clubs.ts:41 |
| PATCH | `/v1/clubs/{clubId}/teams/{teamId}` | JWT Supabase (Bearer) | — | UpdateTeamDto | 200→TeamDto | 400,401,403,404,409 | clubs.ts:46 |
| GET | `/v1/clubs/{clubId}/matches` | JWT Supabase (Bearer) | period,from,to,teamId,homeAway,status,limit,offset | — | 200→MatchListItemDto[] | 400,401,403,404,409 | matches.ts:65 |
| GET | `/v1/clubs/{clubId}/matches/{matchId}` | JWT Supabase (Bearer) | — | — | 200→MatchDetailsDto | 401,403,404 | matches.ts:77 |
| GET | `/v1/clubs/{clubId}/matches/{matchId}/documents` | JWT Supabase (Bearer) | — | — | 200→MatchDocumentDto[] | 401,403,404 | matches.ts:82 |
| GET | `/v1/clubs/{clubId}/matches/{matchId}/derogation` | JWT Supabase (Bearer) | — | — | 200→DerogationStatusDto | 401,403,404 | matches.ts:94 |
| POST | `/v1/clubs/{clubId}/matches/{matchId}/derogation/check` | JWT Supabase (Bearer) | — | — | 200→{found} | 401,403,404 | matches.ts:107 |
| GET | `/v1/clubs/{clubId}/emarque-imports` | JWT Supabase (Bearer) | matchId,status,from,to,limit,offset | — | 200→EmarqueImportDto[] | 400,401,403,404,409 | **aucun** |
| GET | `/v1/clubs/{clubId}/emarque-tracking` | JWT Supabase (Bearer) | — | — | 200→{matches} | 401,403,404 | emarqueTracking.ts:11 |
| POST | `/v1/clubs/{clubId}/emarque-tracking/{matchId}/relaunch` | JWT Supabase (Bearer) | — | — | 202→{matchId,nextCheckAt} | 401,403,404 | emarqueTracking.ts:17 |
| GET | `/v1/clubs/{clubId}/integrations` | JWT Supabase (Bearer) | — | — | 200→IntegrationStatusDto | 401,403,404 | integrations.ts:35 |
| POST | `/v1/clubs/{clubId}/integrations/fbi` | JWT Supabase (Bearer) | — | SaveFbiCredentialsDto | 200→SaveFbiCredentialsResponseDto | 400,401,403,404,409 | integrations.ts:40 |
| PATCH | `/v1/clubs/{clubId}/integrations/fbi` | JWT Supabase (Bearer) | — | PatchFbiIntegrationDto | 200→FbiIntegrationStatusDto | 400,401,403,404,409 | **aucun** |
| POST | `/v1/clubs/{clubId}/integrations/fbi/test` | JWT Supabase (Bearer) | — | — | 200→{success,message} | 401,403,404 | integrations.ts:45 |
| POST | `/v1/clubs/{clubId}/integrations/fbi/process-jobs` | JWT Supabase (Bearer) | — | — | 200→{claimed,succeeded,failed} | 401,403,404 | integrations.ts:82 |
| POST | `/v1/clubs/{clubId}/integrations/fbi/reconcile-schedule` | JWT Supabase (Bearer) | — | — | 200→{queued} | 401,403,404 | integrations.ts:113 |
| POST | `/v1/clubs/{clubId}/integrations/fbi/check-all-derogations` | JWT Supabase (Bearer) | — | — | 200→{derogationsFound,matched,unmatched} | 401,403,404 | integrations.ts:138 |
| GET | `/v1/clubs/{clubId}/derogations` | JWT Supabase (Bearer) | — | — | 200→DerogationListItemDto[] | 401,403,404 | derogations.ts:17 |
| POST | `/v1/clubs/{clubId}/derogations/{derogationId}/respond` | JWT Supabase (Bearer) | — | RespondToDerogationDto | 200→RespondToDerogationResultDto | 400,401,403,404,409 | derogations.ts:41 |
| POST | `/v1/clubs/{clubId}/matches/{matchId}/derogation/respond` | JWT Supabase (Bearer) | — | RespondToDerogationDto | 200→RespondToDerogationResultDto | 400,401,403,404,409 | **aucun** |
| GET | `/v1/clubs/{clubId}/matches/{matchId}/table-suggestions` | JWT Supabase (Bearer) | — | — | 200→TableSuggestionsDto | 400,401,403,404,409 | tables.ts:84 |
| PUT | `/v1/clubs/{clubId}/matches/{matchId}/table-assignments/{role}` | JWT Supabase (Bearer) | — | PutTableAssignmentDto | 200→TableAssignmentResultDto | 400,401,403,404,409 | tables.ts:97 |
| DELETE | `/v1/clubs/{clubId}/matches/{matchId}/table-assignments/{role}` | JWT Supabase (Bearer) | — | — | 200→{removed} | 401,403,404 | tables.ts:105 |
| GET | `/v1/clubs/{clubId}/table-assignments` | JWT Supabase (Bearer) | from,to | — | 200→TableAssignmentsListDto | 400,401,403,404,409 | tables.ts:73 |
| PUT | `/v1/clubs/{clubId}/matches/{matchId}/referee-status` | JWT Supabase (Bearer) | — | PutRefereeStatusDto | 200→RefereeStatusResultDto | 400,401,403,404,409 | tables.ts:115 |
| GET | `/v1/clubs/{clubId}/table-assignments/public-access` | JWT Supabase (Bearer) | — | — | 200→PublicAccessListDto | 401,403,404 | tables.ts:128 |
| POST | `/v1/clubs/{clubId}/table-assignments/public-access/{licencieId}/reset` | JWT Supabase (Bearer) | — | — | 200→PublicAccessResetResultDto | 401,403,404 | tables.ts:139 |
| POST | `/v1/clubs/{clubId}/table-assignments/public-access/{licencieId}/link` | JWT Supabase (Bearer) | — | — | 200→PersonalLinkDto | 401,403,404 | tables.ts:150 |
| GET | `/v1/clubs/{clubId}/standings` | JWT Supabase (Bearer) | — | — | 200→PoolStandingsListDto | 401,403,404 | standings.ts:9 |
| POST | `/v1/clubs/{clubId}/matches/{matchId}/derogation/create` | JWT Supabase (Bearer) | — | CreateDerogationDto | 200→CreateDerogationResultDto | 400,401,403,404,409 | matches.ts:124 |
| POST | `/v1/clubs/{clubId}/integrations/fbi/parse-documents` | JWT Supabase (Bearer) | — | — | 200→{candidatesExamined,imported,errors} | 401,403,404 | integrations.ts:98 |
| GET | `/v1/clubs/{clubId}/sync-runs` | JWT Supabase (Bearer) | — | — | 200→SyncRunDto[] | 401,403,404 | integrations.ts:150 ⚠ écart de chemin : integrations.ts:150 (appelle `/v1/clubs/:id/integrations/sync-runs`) |
| POST | `/v1/clubs/{clubId}/integrations/ffbb/sync` | JWT Supabase (Bearer) | — | — | 200→{syncRunId,status,stats} | 401,403,404 | integrations.ts:64 |
| PATCH | `/v1/clubs/{clubId}/integrations/ffbb` | JWT Supabase (Bearer) | — | PatchFfbbIntegrationDto | 200→{clubCode,enabled,nextSyncAt} | 400,401,403,404,409 | **aucun** |
| GET | `/v1/clubs/{clubId}/licencies` | JWT Supabase (Bearer) | — | — | 200→LicenciesListDto | 401,403,404 | licencies.ts:23 |
| POST | `/v1/clubs/{clubId}/licencies` | JWT Supabase (Bearer) | — | CreateLicencieDto | 201→LicencieDto | 400,401,403,404,409 | licencies.ts:85 |
| GET | `/v1/clubs/{clubId}/licencies/{licencieId}` | JWT Supabase (Bearer) | — | — | 200→LicencieProfileDto | 401,403,404 | licencies.ts:29 |
| DELETE | `/v1/clubs/{clubId}/licencies/{licencieId}` | JWT Supabase (Bearer) | — | — | 200→DeleteLicencieResultDto | 401,403,404 | licencies.ts:78 |
| PATCH | `/v1/clubs/{clubId}/licencies/{licencieId}/profile` | JWT Supabase (Bearer) | — | UpdateLicencieProfileDto | 200→LicencieDto | 400,401,403,404,409 | licencies.ts:39 |
| POST | `/v1/clubs/{clubId}/licencies/import` | JWT Supabase (Bearer) | — | ImportLicenciesDto | 200→ImportLicenciesResultDto | 400,401,403,404,409 | licencies.ts:52 |
| POST | `/v1/clubs/{clubId}/licencies/auto-assign-teams` | JWT Supabase (Bearer) | — | — | 200→AutoAssignTeamsResultDto | 401,403,404 | licencies.ts:65 |
| GET | `/v1/clubs/{clubId}/issues` | JWT Supabase (Bearer) | — | — | 200→IssueDto[] | 401,403,404 | issues.ts:8 |
| POST | `/v1/clubs/{clubId}/issues/{matchId}/resolve` | JWT Supabase (Bearer) | — | — | 200→{resolved} | 401,403,404 | issues.ts:14 |
| GET | `/v1/clubs/{clubId}/derogation-requests/context` | JWT Supabase (Bearer) | — | — | 200→DerogationContextDto | 401,403,404 | derogationRequests.ts:37 |
| GET | `/v1/clubs/{clubId}/derogation-requests` | JWT Supabase (Bearer) | status,teamId,matchId,createdByMe,limit,offset | — | 200→DerogationRequestListDto | 400,401,403,404,409 | derogationRequests.ts:41 |
| POST | `/v1/clubs/{clubId}/derogation-requests` | JWT Supabase (Bearer) | — | CreateDerogationRequestDto | 201→DerogationRequestDetailDto | 400,401,403,404,409 | derogationRequests.ts:57 |
| GET | `/v1/clubs/{clubId}/derogation-requests/{requestId}` | JWT Supabase (Bearer) | — | — | 200→DerogationRequestDetailDto | 401,403,404 | derogationRequests.ts:53 |
| POST | `/v1/clubs/{clubId}/derogation-requests/{requestId}/messages` | JWT Supabase (Bearer) | — | PostDerogationMessageDto | 200→DerogationRequestDetailDto | 400,401,403,404,409 | derogationRequests.ts:61 |
| POST | `/v1/clubs/{clubId}/derogation-requests/{requestId}/actions` | JWT Supabase (Bearer) | — | DerogationActionDto | 200→DerogationRequestDetailDto | 400,401,403,404,409,422 | derogationRequests.ts:65 |
| POST | `/v1/clubs/{clubId}/derogation-requests/{requestId}/proposals` | JWT Supabase (Bearer) | — | ProposeDerogationSlotDto | 200→DerogationRequestDetailDto | 400,401,403,404,409 | derogationRequests.ts:69 |
| GET | `/v1/clubs/{clubId}/matches/{matchId}/derogation-availability` | JWT Supabase (Bearer) | — | — | 200→DerogationAvailabilityDto | 400,401,403,404,409 | derogationRequests.ts:74 |
| GET | `/v1/clubs/{clubId}/matches/{matchId}/derogation-slot-check` | JWT Supabase (Bearer) | — | — | 200→DerogationSlotCheckDto | 400,401,403,404,409 | derogationRequests.ts:80 |
| POST | `/v1/clubs/{clubId}/derogation-requests/{requestId}/official` | JWT Supabase (Bearer) | — | CreateDerogationDto | 200→SubmitOfficialDerogationResultDto | 400,401,403,404,409 | derogationRequests.ts:87 |
| GET | `/v1/clubs/{clubId}/members` | JWT Supabase (Bearer) | — | — | 200→ClubMemberListDto | 401,403,404 | **aucun** |
| POST | `/v1/clubs/{clubId}/members` | JWT Supabase (Bearer) | — | InviteMemberDto | 201→ClubMemberListDto | 400,401,403,404,409 | **aucun** |
| PUT | `/v1/clubs/{clubId}/members/{membershipId}/roles` | JWT Supabase (Bearer) | — | SetMemberRolesDto | 200→ClubMemberListDto | 400,401,403,404,409 | **aucun** |
| GET | `/v1/clubs/{clubId}/venues` | JWT Supabase (Bearer) | — | — | 200→ClubVenueListDto | 401,403,404 | members.ts:9 |
| PATCH | `/v1/clubs/{clubId}/venues/{venueId}` | JWT Supabase (Bearer) | — | UpdateClubVenueDto | 200→ClubVenueAdminDto | 400,401,403,404,409 | members.ts:14 |

### Espace public (anonyme ou jeton personnel) — 29 opérations

| Méth. | Chemin | Auth | Query | Corps | Réponse 2xx | Erreurs doc. | Appels front (`fichier:ligne`) |
|---|---|---|---|---|---|---|---|
| GET | `/v1/public/clubs/{clubSlug}` | aucune | — | — | 200→PublicClubDto | 404 | publicTables.ts:47 |
| GET | `/v1/public/clubs/{clubSlug}/licencies` | aucune | — | — | 200→PublicLicenciesListDto | 404 | publicTables.ts:52 |
| POST | `/v1/public/clubs/{clubSlug}/licencies/{licencieId}/request-link` | aucune | — | RequestPersonalLinkDto | 200→RequestPersonalLinkResultDto | 400,404,409,429,502,503 | publicTables.ts:64 |
| GET | `/v1/public/clubs/{clubSlug}/derogations` | jeton perso `?token=` | — | — | 200→DerogationListItemDto[] | 401,403,404 | publicTables.ts:72 |
| POST | `/v1/public/clubs/{clubSlug}/derogations/{derogationId}/respond` | jeton perso `?token=` | — | RespondToDerogationDto | 200→RespondToDerogationResultDto | 400,401,403,404 | publicTables.ts:131 |
| POST | `/v1/public/clubs/{clubSlug}/matches/{matchId}/derogation/create` | jeton perso `?token=` | — | CreateDerogationDto | 200→CreateDerogationResultDto | 400,401,403,404 | publicTables.ts:140 |
| GET | `/v1/public/clubs/{clubSlug}/me` | jeton perso `?token=` | — | — | 200→PublicMeDto | 401,404 | publicTables.ts:78 |
| GET | `/v1/public/clubs/{clubSlug}/table-assignments` | jeton perso `?token=` | — | — | 200→PublicTableAssignmentsListDto | 401,404 | publicTables.ts:91 |
| PUT | `/v1/public/clubs/{clubSlug}/matches/{matchId}/table-assignments/{role}` | jeton perso `?token=` | — | PublicAssignTableBodyDto | 200→PublicAssignResultDto | 400,401,403,404,409 | publicTables.ts:101 |
| DELETE | `/v1/public/clubs/{clubSlug}/matches/{matchId}/table-assignments/{role}` | jeton perso `?token=` | — | — | 200→{removed} | 400,401,403,404 | publicTables.ts:122 |
| GET | `/v1/public/clubs/{clubSlug}/matches/{matchId}/table-suggestions` | jeton perso `?token=` | — | — | 200→TableSuggestionsDto | 400,401,403,404 | publicTables.ts:109 |
| PUT | `/v1/public/clubs/{clubSlug}/matches/{matchId}/referee-status` | jeton perso `?token=` | — | PutRefereeStatusDto | 200→RefereeStatusResultDto | 400,401,403,404 | publicTables.ts:114 |
| GET | `/v1/public/clubs/{clubSlug}/standings` | aucune | — | — | 200→PoolStandingsListDto | 404 | publicMatches.ts:60 |
| GET | `/v1/public/clubs/{clubSlug}/teams` | aucune | — | — | 200→TeamDto[] | 404 | publicMatches.ts:26 |
| GET | `/v1/public/clubs/{clubSlug}/matches` | aucune | period,from,to,teamId,homeAway,status,limit,offset | — | 200→MatchListItemDto[] | 400,404,409 | publicMatches.ts:37 |
| GET | `/v1/public/clubs/{clubSlug}/matches/{matchId}` | aucune | — | — | 200→MatchDetailsDto | 404 | publicMatches.ts:43 |
| GET | `/v1/public/clubs/{clubSlug}/matches/{matchId}/documents` | aucune | — | — | 200→MatchDocumentDto[] | 404 | publicMatches.ts:48 |
| GET | `/v1/public/clubs/{clubSlug}/matches/{matchId}/derogation` | aucune | — | — | 200→DerogationStatusDto | 404 | publicMatches.ts:54 |
| GET | `/v1/public/clubs/{clubSlug}/derogation-requests/context` | jeton perso `?token=` | — | — | 200→DerogationContextDto | 400,401,403,404 | publicDerogationRequests.ts:31 |
| GET | `/v1/public/clubs/{clubSlug}/derogation-requests` | jeton perso `?token=` | — | — | 200→DerogationRequestListDto | 400,401,403,404 | publicDerogationRequests.ts:35 |
| POST | `/v1/public/clubs/{clubSlug}/derogation-requests` | jeton perso `?token=` | — | CreateDerogationRequestDto | 201→DerogationRequestDetailDto | 400,401,403,404,409 | publicDerogationRequests.ts:52 |
| GET | `/v1/public/clubs/{clubSlug}/derogation-requests/availability` | jeton perso `?token=` | — | — | 200→DerogationAvailabilityDto | 400,401,403,404 | publicDerogationRequests.ts:68 |
| GET | `/v1/public/clubs/{clubSlug}/derogation-requests/slot-check` | jeton perso `?token=` | — | — | 200→DerogationSlotCheckDto | 400,401,403,404 | publicDerogationRequests.ts:72 |
| GET | `/v1/public/clubs/{clubSlug}/derogation-requests/{requestId}` | jeton perso `?token=` | — | — | 200→DerogationRequestDetailDto | 400,401,403,404 | publicDerogationRequests.ts:48 |
| POST | `/v1/public/clubs/{clubSlug}/derogation-requests/{requestId}/messages` | jeton perso `?token=` | — | PostDerogationMessageDto | 200→DerogationRequestDetailDto | 400,401,403,404 | publicDerogationRequests.ts:56 |
| POST | `/v1/public/clubs/{clubSlug}/derogation-requests/{requestId}/actions` | jeton perso `?token=` | — | DerogationActionDto | 200→DerogationRequestDetailDto | 400,401,403,404,422 | publicDerogationRequests.ts:60 |
| POST | `/v1/public/clubs/{clubSlug}/derogation-requests/{requestId}/proposals` | jeton perso `?token=` | — | ProposeDerogationSlotDto | 200→DerogationRequestDetailDto | 400,401,403,404 | publicDerogationRequests.ts:64 |
| GET | `/v1/public/clubs/{clubSlug}/home` | jeton perso `?token=` | — | — | 200→PublicHomeDto | 400,401,404 | publicHome.ts:9 |
| POST | `/v1/public/clubs/{clubSlug}/derogation-requests/{requestId}/official` | jeton perso `?token=` | — | CreateDerogationDto | 200→SubmitOfficialDerogationResultDto | 400,401,403,404 | publicDerogationRequests.ts:76 |

### Plateforme et divers — 8 opérations

| Méth. | Chemin | Auth | Query | Corps | Réponse 2xx | Erreurs doc. | Appels front (`fichier:ligne`) |
|---|---|---|---|---|---|---|---|
| GET | `/v1/me` | JWT Supabase (Bearer) | — | — | 200→MeDto | 401,403,404 | me.ts:8 |
| GET | `/v1/jobs/{jobId}` | JWT Supabase (Bearer) | — | — | 200→JobStatusDto | 401,403,404 | jobs.ts:8 |
| GET | `/v1/platform/clubs` | JWT + platform_admin | — | — | 200→PlatformClubDto[] | 401,403,404 | platform.ts:12 |
| POST | `/v1/platform/clubs` | JWT + platform_admin | — | CreateClubDto | 201→{clubId,slug,adminInviteError} | 401,403,404 | platform.ts:18 |
| POST | `/v1/platform/maintenance/purge-emarque-documents` | JWT + platform_admin | — | — | 200→PurgeEmarqueDocumentsResultDto | 401,403,404 | platform.ts:29 |
| POST | `/v1/platform/maintenance/delete-old-seasons` | JWT + platform_admin | — | DeleteOldSeasonsDto | 200→DeleteOldSeasonsResultDto | 400,401,403,404,409 | platform.ts:40 |
| POST | `/v1/platform/maintenance/retry-failed-emarque-imports` | JWT + platform_admin | — | — | 200→RetryFailedEmarqueImportsResultDto | 401,403,404 | platform.ts:53 |
| GET | `/health` | aucune | — | — | 200→{status} | — | **aucun** |

### A.3 Opérations du schéma **jamais appelées** par le front (8)
| Opération | Constat |
|---|---|
| `GET /v1/clubs/{clubId}/emarque-imports` | Aucun appel. Peut-être utilisé par un autre client ou obsolète → **à confirmer** avant de la porter. |
| `PATCH /v1/clubs/{clubId}/integrations/fbi`, `PATCH …/integrations/ffbb` | Aucun appel (le front n'utilise que `POST …/fbi`, `integrations.ts:40`). |
| `POST /v1/clubs/{clubId}/matches/{matchId}/derogation/respond` | Aucun appel (le front utilise `…/derogations/{derogationId}/respond`, `derogations.ts:41`). |
| `GET/POST /v1/clubs/{clubId}/members`, `PUT …/members/{membershipId}/roles` | Aucun appel dans `src/lib/api/` ; les rôles coach/coordinateur passent par `PATCH …/licencies/{id}/profile` (`licencies.ts:39`). |
| `GET /health` | Utilisé par `scripts/api-smoke.ts:11` (hors `src/lib/api`). |
→ **Politique de portage** : ne porter dans le nouveau back que ce que le front appelle (92 opérations) ; les 8 ci-dessus restent chez `ball-manager-back` (coexistence) ou sont abandonnées après confirmation.

### A.4 Écarts de contrat constatés (à corriger ou à connaître)
| # | Écart | Preuve | Conséquence |
|---|---|---|---|
| E-1 | Le schéma commité déclare `GET /v1/clubs/{clubId}/sync-runs` ; le front appelle `GET /v1/clubs/:id/integrations/sync-runs` (correction faite après un 404 en production) | `schema.ts:3914` ↔ `integrations.ts:142-151` | Le schéma n'est pas fiable pour les chemins ; régénérer depuis le back réel. |
| E-2 | `PATCH /v1/clubs/{clubId}` **existe** (`name`, `shortName`, `timezone`, `logoUrl`, `accentColor`) et `api.clubs.update` est câblé (`clubs.ts:24-25`), mais `club-settings.ts:34` écrit toujours en direct dans Supabase. `MIGRATION_TO_API.md:90-95` considérait cette route comme manquante | `schema.ts:7305-7312` | **LOT-04 n'a besoin d'aucun nouvel endpoint** : bascule front seule. Reste à confirmer que le back valide `timezone` (sinon nouvelle règle, voir B.4). |
| E-3 | `GET …/matches` accepte déjà `period` (weekend/upcoming/past), `teamId`, `homeAway`, `status`, `limit`, `offset` ; le front n'envoie que `from`/`to` et re-filtre localement | `schema.ts:569-580` ↔ `matches.ts:56-75`, `match-filters.ts:77-99` | **TRT-006 est en grande partie réalisable sans nouvel endpoint** ; seule la sémantique de `period=weekend` (fuseau ? samedi-dimanche ?) est à confirmer. |
| E-4 | Le jeton personnel public voyage en **query string** (`?token=`) sur 14+ appels | `publicTables.ts:72,78,88,101,109,114,122,131` ; `publicDerogationRequests.ts:25-29` ; `publicHome.ts:9` | Les URLs avec jeton se retrouvent dans les journaux du reverse proxy, l'historique et `Referer` → R-014. Nouveau back : transport par en-tête (B.9). |
| E-5 | `listMatches` boucle séquentiellement sur des pages de 200 | `matches.ts:56-75` | Une saison de 500 matchs = 3 appels en série à chaque rendu (estimé) ; atténué par les filtres serveur (E-3). |
| E-6 | Types écrits à la main pour corriger le schéma (`opponentLogoUrl`, nullable imbriqué) | `matches.ts:12-13`, `publicTables.ts:27` | Le schéma perd des champs : le nouveau back doit générer un OpenAPI exact (zod-openapi) et le front régénérer. |

## B. Nouveaux endpoints nécessaires (dérivés de `02-inventaire-traitements.md`)
_Principe (ADR-005) : tous **additifs sous `/v1`**, même enveloppe d'erreur, même schéma d'auth → le front n'a qu'une base d'URL ; le routage entre `ball-manager-back` et le nouveau back se fait **dans le client front, par module** (ADR-005 révisé, option (a), Q-016 ouverte) — il n'y a plus de reverse proxy commun. Les noms de champs ci-dessous sont des **propositions**._

### B.1 — LOT-02 (en tête de Phase 4, R-013) : recherche de licenciés publique **bornée** (Q-018 = option 1)
`GET /v1/public/clubs/{clubSlug}/licencies/search?q=<prénom nom>` — **spécification v2 du 2026-10-07** (remplace la v1 « ≥ 2 caractères, 8 résultats, `claimed` »). Règles chiffrées justifiées dans `11-init-repo-back.md` §7 ; **à valider au 🛑 (Q-020)**.
```yaml
/v1/public/clubs/{clubSlug}/licencies/search:
  get:
    operationId: searchPublicLicencies
    summary: Retrouver sa fiche licencié par prénom + nom (sans compte)
    security: []                       # anonyme ; aucun jeton accepté ni requis
    parameters:
      - { name: clubSlug, in: path,  required: true, schema: { type: string, pattern: "^[a-z0-9-]{2,64}$" } }
      - name: q
        in: query
        required: true
        description: >
          Deux mots au moins (prénom + nom, dans n'importe quel ordre), chacun d'au moins 2 lettres.
          Chaque mot est comparé au DÉBUT du prénom ou du nom (insensible à la casse et aux accents ;
          tirets et apostrophes traités comme des séparateurs). 4 mots maximum.
        schema: { type: string, minLength: 5, maxLength: 64 }
    responses:
      "200":
        description: Correspondances (au plus 5). Tableau vide si aucune — jamais de 404 pour « aucun résultat ».
        headers:
          Cache-Control: { schema: { type: string, example: "no-store" } }
          RateLimit-Limit: { schema: { type: integer } }
          RateLimit-Remaining: { schema: { type: integer } }
          RateLimit-Reset: { schema: { type: integer, description: secondes } }
        content:
          application/json:
            schema:
              type: object
              required: [licencies]
              additionalProperties: false
              properties:
                licencies:
                  type: array
                  maxItems: 5
                  items:
                    type: object
                    required: [id, firstName, lastInitial]
                    additionalProperties: false      # AUCUN autre champ : ni nom complet, ni date de naissance, ni catégorie, ni e-mail, ni "claimed"
                    properties:
                      id:          { type: string, format: uuid }
                      firstName:   { type: string, maxLength: 64 }
                      lastInitial: { type: string, minLength: 1, maxLength: 1, description: "initiale du nom, avec majuscule (ex. « D »)" }
      "400": { $ref: "#/components/responses/ErrorEnvelope" }   # QUERY_TOO_SHORT | INVALID_QUERY | VALIDATION_ERROR
      "404": { $ref: "#/components/responses/ErrorEnvelope" }   # NOT_FOUND (club inconnu)
      "429":
        description: Limite de débit atteinte
        headers: { Retry-After: { schema: { type: integer, description: secondes } } }
        content: { application/json: { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } }   # RATE_LIMITED
```
| Cas | Réponse |
|---|---|
| `q` = « camille du » (2 mots ≥ 2 lettres) | `200` `{"licencies":[{"id":"…","firstName":"Camille","lastInitial":"D"}]}` _(exemple fictif)_ |
| `q` = « camille » (1 mot) ou un mot de 1 lettre | `400 QUERY_TOO_SHORT` — « Saisis ton prénom et ton nom. » |
| caractères hors lettres/espace/`-`/`'`, ou > 4 mots | `400 INVALID_QUERY` |
| aucun résultat | `200` `{"licencies":[]}` (même forme, même ordre de grandeur de délai) |
| club inconnu | `404 NOT_FOUND` (les slugs de clubs sont publics : pas un secret) |
| budget dépassé | `429 RATE_LIMITED` + `Retry-After` |
| jeton fourni (`?token=`, `Authorization`) | ignoré pour cette route ; `?token=` → `400 TOKEN_IN_QUERY` (règle globale, ADR-007 §7) |
**Changements de contrat par rapport à l'annuaire actuel** (`PublicLicencieDto`, `schema.ts:7702-7708`) : plus de `lastName` complet, **plus de `claimed`** (indiquait quels profils n'ont pas encore de lien — cf. R-018), `id` + `firstName` + `lastInitial` seulement. Impact front : l'écran de confirmation ne peut plus distinguer « déjà inscrit » (`IdentifyView.tsx:173-175,240-246`) → message neutre ; « Lien envoyé, {firstName} » (`:133`) inchangé.
**Ancien endpoint** `GET …/licencies` (annuaire complet) : à **fermer dans `ball-manager-back`** (`410 GONE` ou `404`) — action du propriétaire, critère de done vérifiable en `11` §7.6 ; **tant qu'il répond `200`, R-013 n'est pas résolu**. `POST …/licencies/{id}/request-link` inchangé (`publicTables.ts:64`).

### B.1 bis — LOT-02 / R-018 : revendication de fiche soumise à validation (Q-022, décision du 2026-10-07)
Règles et flux : `11-init-repo-back.md` §7.9. **Propositions de contrat**, à figer par les tests de contrat (`11` §7.9.6).
```yaml
/v1/public/clubs/{clubSlug}/licencies/{licencieId}/request-link:      # MODIFIÉ
  post:
    operationId: requestPersonalLink
    security: []
    requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [returnTo], properties: { email: { type: string, format: email, maxLength: 254, nullable: true }, returnTo: { $ref: "#/components/schemas/PublicLinkTarget" } } } } } }
    responses:
      "202":   # UNIQUE réponse de succès : identique que la fiche existe ou non, ait une adresse ou non, porte un rôle ou non
        content: { application/json: { schema: { type: object, required: [status], additionalProperties: false, properties: { status: { type: string, enum: [RECEIVED] } } } } }
      "400": { $ref: "#/components/responses/ErrorEnvelope" }   # VALIDATION_ERROR (adresse mal formée) — jamais EMAIL_REQUIRED
      "429": { $ref: "#/components/responses/ErrorEnvelope" }   # RATE_LIMITED + Retry-After
/v1/clubs/{clubId}/claim-requests:
  get:  { operationId: listClaimRequests, security: [{ bearer: [] }], parameters: [{ name: status, in: query, schema: { enum: [pending, approved, rejected, expired], default: pending } }],
          responses: { "200": { content: { application/json: { schema: { type: object, required: [requests], properties: { requests: { type: array, items: { $ref: "#/components/schemas/ClaimRequestDto" } } } } } } }, "401": {}, "403": {}, "404": {} } }
/v1/clubs/{clubId}/claim-requests/{requestId}/approve:
  post: { operationId: approveClaimRequest, security: [{ bearer: [] }], responses: { "200": { description: "lien envoyé à l'adresse saisie, une seule fois" }, "403": {}, "404": {}, "409": { description: "ALREADY_DECIDED | EXPIRED" }, "422": { description: "ROLE_NOT_CLAIMABLE" } } }
/v1/clubs/{clubId}/claim-requests/{requestId}/reject:
  post: { operationId: rejectClaimRequest, security: [{ bearer: [] }], responses: { "200": {}, "403": {}, "404": {}, "409": {} } }
components.schemas.ClaimRequestDto:   # additionalProperties: false ; JAMAIS de jeton
  { id: uuid, licencieId: uuid, firstName: string, lastName: string, requestedEmail: string, status: enum, createdAt: date-time, expiresAt: date-time }
```
| Endpoint | Droits |
|---|---|
| `POST …/request-link` | anonyme ; 5/h par fiche, 20/h par IP, 10 nouvelles demandes/h par club |
| `GET …/claim-requests` | JWT, `club_admin` du club (les autres rôles et les autres clubs : `403`/`404`) |
| `POST …/approve` | JWT, **`club_admin` seul (décidé)** ; revalidation forte (introspection, ADR-006) ; relit le rôle de la fiche |
| `POST …/reject` | JWT, `club_admin` |
**Décidés le 2026-10-07 (Q-024)** : expiration des demandes `pending` à **14 jours** (`409 EXPIRED` ensuite) ; rôles exclus = **tout rôle à droits d'écriture** (coach, admin, coordinateur de dérogations aujourd'hui) ; `422 ROLE_NOT_CLAIMABLE` couvre aussi le coordinateur.
**Écarts de contrat** : `RequestPersonalLinkResultDto.maskedEmail` et le code `EMAIL_REQUIRED` disparaissent (ils révélaient l'état de la fiche) ; impact front : `IdentifyView.tsx:106-111,133` (champ e-mail toujours facultatif, message neutre de repli « contacte ton club ») — **PR front du LOT-02**. L'ancien comportement reste servi par `ball-manager-back` tant que le module n'est pas basculé (ADR-005) : **R-018 reste ouvert jusqu'à la bascule**.

### B.2 — LOT-03 : gymnases dynamiques
- Ajouter `venueId: uuid | null` (additif) aux `MatchListItemDto` / `MatchDetailsDto` (aujourd'hui seulement `venueLabel`, `schema.ts:7355,7381`).
- `GET /v1/clubs/{clubId}/venues` existe (`members.ts:9`, DTO « admin ») ; ajouter une lecture **membre** et son équivalent public : `GET /v1/public/clubs/{clubSlug}/venues` → `{ "venues": [ { "id", "name", "isHomeVenue" } ] }`. **À confirmer** : le rôle exigé par la route actuelle ; si un `venueId` ne peut pas être porté par les matchs, rapprochement libellé↔gymnase côté back (`venuesLikelyMatch` mentionné `HomeMatchesAgenda.tsx:22-24`).

### B.3 — LOT-05/06 : saison et journée côté serveur
- `GET …/matches` (club et public) : ajouter `season=current|<année de début>` (défaut `current`, bornes calculées côté back) ; réponse + `season:{start,end}` ; chaque match + `weekendKey: "YYYY-MM-DD"` (samedi de la « journée », **fuseau `club.timezone`, repli `Europe/Paris`**, décision D-2). Les filtres `period/teamId/homeAway/status/limit/offset` **existent déjà** (E-3).
- `GET /v1/clubs/{clubId}/matches/weekends?season=&teamId=&homeAway=` (+ public) → `{ "weekends": [ { "saturday": "YYYY-MM-DD", "count": 3 } ] }` (alimente le sélecteur de journée, `match-filters.ts:145-156`). Le libellé « Week-end du 3 au 4 octobre » reste formaté côté front.

### B.4 — LOT-04 : réglages du club (aucun nouvel endpoint)
`PATCH /v1/clubs/{clubId}` existe (E-2). **Exigence nouvelle** si absente : valider `timezone` (identifiant IANA, `422 VALIDATION_ERROR`) et réserver l'écriture au `club_admin` (`403`). À vérifier par un test d'intégration au moment du lot.

### B.5 — LOT-07 : tableau de bord (BFF)
`GET /v1/clubs/{clubId}/dashboard`
- **Auth** : JWT, tout membre ; blocs réservés selon le rôle calculé **côté back** (`club_admin` → `issues`, `derogations` ; rôles dérogation → `derogationRequests`).
- **Sortie 200** : `{ "season": {start,end}, "weekend": { "saturday": "YYYY-MM-DD", "count": n, "homeCount": n }, "upcomingCount": n, "played": { "count": n, "wins": n, "losses": n, "draws": n }, "latestResults": [MatchListItemDto × ≤ 6], "issues": { "openCount": n } | null, "derogations": { "toAnswerCount": n } | null, "derogationRequests": { "canManage": bool, "countsByStatus": { "REQUESTED": n, … } } | null }`.
- Règle de victoire **unique** côté back (celle de `matchOutcome`, `match-display.tsx:93-100` : `isHome` inconnu → ni victoire ni défaite) ; **changement de comportement** vs `dashboard/page.tsx:184-188`, à documenter.
- **Erreurs** : `401`, `403` (non membre → 404 comme `getClubContext`, `club-context.ts:29-33`).
- Un bloc secondaire en panne ne fait pas échouer l'ensemble : `null` + champ `degraded: ["derogationRequests"]` (aujourd'hui `.catch(() => null)`, `dashboard/page.tsx:68-71`).

### B.6 — LOT-08 : résultats
`GET /v1/clubs/{clubId}/results?season=` et `GET /v1/public/clubs/{clubSlug}/results?season=` → `{ "groups": [ { "key", "label", "teamId": uuid|null, "competitionName", "record": {won,lost,draw}, "results": [MatchListItemDto], "standings": [PoolStandingsDto] } ] }` ; rattachement matchs↔classements par **`teamId`** (aujourd'hui par libellé, `result-groups.ts:59-62`).

### B.7 — LOT-09 : import de licenciés
`POST /v1/clubs/{clubId}/licencies/import` : accepter **soit** l'actuel `{ "licencies": [ImportLicencieRowDto] }` **soit** `{ "text": "<TSV/CSV collé>", "format": "auto|tsv|csv" }` ; réponse = `ImportLicenciesResultDto` + `rejected: [ { "line": n, "reason": "MISSING_NATIONAL_ID|…" } ]`. Parseur CSV conforme RFC 4180 (guillemets, virgules internes) ; alias d'en-têtes de `ImportLicenciesPanel.tsx:20-28` reconduits ; date `DD/MM/YYYY` → ISO (`:44-49`). Taille max du corps (estimé : 1 Mo) → `413`.

### B.8 — LOT-10 : opérations longues en jobs asynchrones
- **Contrat** : sur les 11 endpoints ci-dessous, si l'en-tête `Prefer: respond-async` est présent → `202 Accepted` + `{ "jobId": "uuid", "status": "pending" }` (+ `Location: /v1/jobs/{jobId}`) ; sinon comportement synchrone actuel (compatibilité). Un `Idempotency-Key` optionnel évite le double lancement (double clic). `GET /v1/jobs/{jobId}` (**existe**, `jobs.ts:7`) renvoie `JobStatusDto` : `pending|claimed|running|succeeded|failed` + résultat/erreur.
- **Endpoints concernés** (timeouts actuels) : `POST …/integrations/ffbb/sync` (280 s), `…/fbi/process-jobs` (280 s), `…/fbi/parse-documents` (120 s), `…/fbi/check-all-derogations` (280 s), `POST …/matches/{id}/derogation/check` (90 s), `…/derogation/create` (120 s), `…/derogations/{id}/respond` (120 s), `POST /v1/public/…/derogations/{id}/respond` et `…/derogation/create` (120 s), `POST …/licencies/import` (60 s), `…/licencies/auto-assign-teams` (30 s).
- **Autorisation du suivi** : seul le demandeur (ou un `club_admin` du même club) lit son job (`403` sinon) ; pour l'espace public, le jeton personnel.

### B.9 — Transport du jeton personnel public (R-008, E-4, R-014)
**Décision (Q-023, 2026-10-07)** : en-tête **`X-Personal-Link-Token`** (pas `Authorization`, réservé au JWT) ; lien d'e-mail avec le jeton en **fragment** `#token=`. Front prêt (`publicTokenTransport.ts`, drapeau `NEXT_PUBLIC_PUBLIC_TOKEN_HEADER`, défaut off). Accepter `X-Personal-Link-Token` en plus de `?token=` (déprécié, journalisé en `warn` sans valeur) ; le front bascule ensuite. Préflight CORS : autoriser ces en-têtes. Ajouter `DELETE /v1/public/clubs/{clubSlug}/me/token` (révocation par le titulaire) — **à confirmer** avec la durée de vie/rotation actuelle (inconnue).

### B.10 — LOT-12 (opportuniste)
`summary` dans `GET …/table-assignments` (`DaySummary.tsx:13-26`) ; `?status=open` sur `GET …/issues` (`issues/page.tsx:32`) ; `countsByStatus` dans `GET …/derogation-requests` (`DashboardRequestsCard.tsx:13`).

### B.11 — Ce qui n'est **pas** un endpoint mais une exigence du nouveau back
Revalidation du JWT et des rôles à chaque requête (R-011) ; limitation de débit ; journaux sans donnée personnelle ; `GET /health` (liveness) et `GET /ready` (BDD + file de jobs) — voir `05-architecture-cible.md`.
