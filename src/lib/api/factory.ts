import type { ApiFetcher } from "./client";
import * as clubs from "./clubs";
import * as me from "./me";
import * as matches from "./matches";
import * as integrations from "./integrations";
import * as issues from "./issues";
import * as emarqueTracking from "./emarqueTracking";
import * as jobs from "./jobs";
import * as licencies from "./licencies";
import * as platform from "./platform";
import * as derogations from "./derogations";
import * as tables from "./tables";
import * as standings from "./standings";
import * as derogationRequests from "./derogationRequests";
import * as members from "./members";
import { clubTeamLife } from "./teamLife";
import type * as teamLife from "./teamLife";

/**
 * Fonctions ergonomiques (§40 de la demande) : un composant appelle
 * `api.matches.list(clubId)`, jamais une URL en dur. Une seule
 * implémentation (`createApi`) partagée entre le client serveur
 * (src/lib/api/server.ts) et le client navigateur
 * (src/lib/api/browserClient.ts) — seule la façon d'obtenir le jeton
 * d'accès diffère entre les deux (voir auth.server.ts / auth.browser.ts).
 */
export function createApi(fetcher: ApiFetcher) {
  return {
    me: () => me.getMe(fetcher),
    clubs: {
      list: () => clubs.listClubs(fetcher),
      get: (clubId: string) => clubs.getClub(fetcher, clubId),
      update: (clubId: string, body: clubs.UpdateClubDto) => clubs.updateClub(fetcher, clubId, body),
      capabilities: (clubId: string) => clubs.getClubCapabilities(fetcher, clubId),
      teams: (clubId: string) => clubs.listTeams(fetcher, clubId),
      createTeam: (clubId: string, body: clubs.CreateTeamDto) => clubs.createTeam(fetcher, clubId, body),
      updateTeam: (clubId: string, teamId: string, body: clubs.UpdateTeamDto) => clubs.updateTeam(fetcher, clubId, teamId, body),
    },
    matches: {
      list: (clubId: string, params?: matches.ListMatchesParams) => matches.listMatches(fetcher, clubId, params),
      get: (clubId: string, matchId: string) => matches.getMatch(fetcher, clubId, matchId),
      documents: (clubId: string, matchId: string) => matches.listMatchDocuments(fetcher, clubId, matchId),
      derogation: (clubId: string, matchId: string) => matches.getMatchDerogation(fetcher, clubId, matchId),
      checkDerogation: (clubId: string, matchId: string) => matches.checkMatchDerogation(fetcher, clubId, matchId),
      createDerogation: (clubId: string, matchId: string, body: matches.CreateDerogationDto) => matches.createDerogation(fetcher, clubId, matchId, body),
    },
    integrations: {
      get: (clubId: string) => integrations.getIntegrationStatus(fetcher, clubId),
      saveFbi: (clubId: string, body: integrations.SaveFbiCredentialsDto) => integrations.saveFbiCredentials(fetcher, clubId, body),
      testFbi: (clubId: string) => integrations.testFbiConnection(fetcher, clubId),
      processFbiJobs: (clubId: string) => integrations.processFbiJobs(fetcher, clubId),
      parseFbiDocuments: (clubId: string) => integrations.parseFbiDocuments(fetcher, clubId),
      triggerFbiScheduleReconciliation: (clubId: string) => integrations.triggerFbiScheduleReconciliation(fetcher, clubId),
      checkAllDerogations: (clubId: string) => integrations.checkAllDerogations(fetcher, clubId),
      triggerFfbbSync: (clubId: string) => integrations.triggerFfbbSync(fetcher, clubId),
      syncRuns: (clubId: string) => integrations.listSyncRuns(fetcher, clubId),
    },
    standings: {
      list: (clubId: string) => standings.listStandings(fetcher, clubId),
    },
    derogationRequests: {
      context: (clubId: string) => derogationRequests.getDerogationContext(fetcher, clubId),
      list: (clubId: string, params?: derogationRequests.ListDerogationRequestsParams) => derogationRequests.listDerogationRequests(fetcher, clubId, params),
      get: (clubId: string, requestId: string) => derogationRequests.getDerogationRequest(fetcher, clubId, requestId),
      create: (clubId: string, body: derogationRequests.CreateDerogationRequestDto) => derogationRequests.createDerogationRequest(fetcher, clubId, body),
      message: (clubId: string, requestId: string, message: string) => derogationRequests.postDerogationMessage(fetcher, clubId, requestId, message),
      action: (clubId: string, requestId: string, action: derogationRequests.DerogationAction, message?: string | null) => derogationRequests.performDerogationAction(fetcher, clubId, requestId, action, message),
      remove: (clubId: string, requestId: string) => derogationRequests.deleteDerogationRequest(fetcher, clubId, requestId),
      propose: (clubId: string, requestId: string, body: derogationRequests.ProposeDerogationSlotDto) => derogationRequests.proposeDerogationSlot(fetcher, clubId, requestId, body),
      official: (clubId: string, requestId: string, body: derogationRequests.OfficialDerogationDto) => derogationRequests.submitOfficialDerogation(fetcher, clubId, requestId, body),
      availability: (clubId: string, matchId: string, date: string) => derogationRequests.getDerogationAvailability(fetcher, clubId, matchId, date),
      checkSlot: (clubId: string, matchId: string, startAt: string, venueId: string | null) => derogationRequests.checkDerogationSlot(fetcher, clubId, matchId, startAt, venueId),
    },
    teamLife: {
      listSeries: (clubId: string, teamId: string) => clubTeamLife.listSeries(fetcher, clubId, teamId),
      createSeries: (clubId: string, teamId: string, body: teamLife.CreateTrainingSeriesDto) => clubTeamLife.createSeries(fetcher, clubId, teamId, body),
      updateSeries: (clubId: string, seriesId: string, body: teamLife.UpdateTrainingSeriesDto) => clubTeamLife.updateSeries(fetcher, clubId, seriesId, body),
      stopSeries: (clubId: string, seriesId: string, from?: string) => clubTeamLife.stopSeries(fetcher, clubId, seriesId, from),
      listTrainings: (clubId: string, teamId: string, period?: teamLife.PeriodQuery) => clubTeamLife.listTrainings(fetcher, clubId, teamId, period),
      detail: (clubId: string, occurrenceId: string) => clubTeamLife.detail(fetcher, clubId, occurrenceId),
      updateOccurrence: (clubId: string, occurrenceId: string, body: teamLife.UpdateTrainingOccurrenceDto) => clubTeamLife.updateOccurrence(fetcher, clubId, occurrenceId, body),
      cancel: (clubId: string, occurrenceId: string, reason: string | null) => clubTeamLife.cancel(fetcher, clubId, occurrenceId, reason),
      restore: (clubId: string, occurrenceId: string) => clubTeamLife.restore(fetcher, clubId, occurrenceId),
      planning: (clubId: string, params?: teamLife.PeriodQuery & { teamId?: string; kind?: "MATCH" | "TRAINING" }) => clubTeamLife.planning(fetcher, clubId, params),
      markAttendance: (clubId: string, occurrenceId: string, licencieId: string, status: teamLife.TrainingAttendanceValue) => clubTeamLife.markAttendance(fetcher, clubId, occurrenceId, licencieId, status),
      teamOverview: (clubId: string, teamId: string) => clubTeamLife.teamOverview(fetcher, clubId, teamId),
      laundrySuggestions: (clubId: string, matchId: string) => clubTeamLife.laundrySuggestions(fetcher, clubId, matchId),
      assignLaundry: (clubId: string, matchId: string, licencieId: string) => clubTeamLife.assignLaundry(fetcher, clubId, matchId, licencieId),
      removeLaundry: (clubId: string, matchId: string) => clubTeamLife.removeLaundry(fetcher, clubId, matchId),
      match: (clubId: string, matchId: string) => clubTeamLife.match(fetcher, clubId, matchId),
      openAvailability: (clubId: string, matchId: string) => clubTeamLife.openAvailability(fetcher, clubId, matchId),
      remind: (clubId: string, matchId: string) => clubTeamLife.remind(fetcher, clubId, matchId),
      saveDraft: (clubId: string, matchId: string, body: teamLife.PutConvocationDraftDto) => clubTeamLife.saveDraft(fetcher, clubId, matchId, body),
      preview: (clubId: string, matchId: string) => clubTeamLife.preview(fetcher, clubId, matchId),
      send: (clubId: string, matchId: string) => clubTeamLife.send(fetcher, clubId, matchId),
    },
    members: {
      venues: (clubId: string) => members.listClubVenues(fetcher, clubId),
      updateVenue: (clubId: string, venueId: string, body: members.UpdateClubVenueDto) => members.updateClubVenue(fetcher, clubId, venueId, body),
      venueClosures: (clubId: string) => members.listVenueClosures(fetcher, clubId),
      createVenueClosure: (clubId: string, body: members.CreateVenueClosureDto) => members.createVenueClosure(fetcher, clubId, body),
      deleteVenueClosure: (clubId: string, closureId: string) => members.deleteVenueClosure(fetcher, clubId, closureId),
    },
    derogations: {
      list: (clubId: string) => derogations.listDerogations(fetcher, clubId),
      respond: (clubId: string, derogationId: string, body: derogations.RespondToDerogationDto) => derogations.respondToDerogation(fetcher, clubId, derogationId, body),
    },
    issues: {
      list: (clubId: string) => issues.listIssues(fetcher, clubId),
      resolve: (clubId: string, matchId: string) => issues.resolveIssue(fetcher, clubId, matchId),
      dismiss: (clubId: string, key: string) => issues.dismissIssue(fetcher, clubId, key),
    },
    emarqueTracking: {
      list: (clubId: string) => emarqueTracking.listEmarqueTracking(fetcher, clubId),
      relaunch: (clubId: string, matchId: string) => emarqueTracking.relaunchEmarqueTracking(fetcher, clubId, matchId),
    },
    jobs: {
      get: (jobId: string) => jobs.getJob(fetcher, jobId),
      pollUntilTerminal: (jobId: string, options?: jobs.PollJobOptions) => jobs.pollJobUntilTerminal(fetcher, jobId, options),
    },
    licencies: {
      list: (clubId: string) => licencies.listLicencies(fetcher, clubId),
      get: (clubId: string, licencieId: string) => licencies.getLicencieProfile(fetcher, clubId, licencieId),
      updateProfile: (clubId: string, licencieId: string, body: licencies.UpdateLicencieProfileDto) => licencies.updateLicencieProfile(fetcher, clubId, licencieId, body),
      import: (clubId: string, body: licencies.ImportLicenciesDto) => licencies.importLicencies(fetcher, clubId, body),
      importFile: (clubId: string, file: File) => licencies.importLicencesFile(fetcher, clubId, file),
      requestFbiImport: (clubId: string) => licencies.requestFbiLicenceImport(fetcher, clubId),
      importStatus: (clubId: string) => licencies.getLicenceImportStatus(fetcher, clubId),
      autoAssignTeams: (clubId: string) => licencies.autoAssignTeams(fetcher, clubId),
      remove: (clubId: string, licencieId: string) => licencies.deleteLicencie(fetcher, clubId, licencieId),
      create: (clubId: string, body: licencies.CreateLicencieDto) => licencies.createLicencie(fetcher, clubId, body),
      uploadPhoto: (clubId: string, licencieId: string, body: { contentType: "image/webp" | "image/jpeg"; data: string }) => licencies.uploadLicenciePhoto(fetcher, clubId, licencieId, body),
      deletePhoto: (clubId: string, licencieId: string) => licencies.deleteLicenciePhoto(fetcher, clubId, licencieId),
    },
    platform: {
      listClubs: () => platform.listPlatformClubs(fetcher),
      createClub: (body: platform.CreateClubDto) => platform.createClub(fetcher, body),
      purgeEmarqueDocuments: () => platform.purgeEmarqueDocuments(fetcher),
      deleteOldSeasons: (clubId: string) => platform.deleteOldSeasons(fetcher, clubId),
      retryFailedEmarqueImports: () => platform.retryFailedEmarqueImports(fetcher),
      clubMembers: (clubId: string) => platform.listPlatformClubMembers(fetcher, clubId),
      grantClubAdmin: (clubId: string, email: string) => platform.grantPlatformClubAdmin(fetcher, clubId, email),
      revokeClubAdmin: (clubId: string, membershipId: string) => platform.revokePlatformClubAdmin(fetcher, clubId, membershipId),
    },
    tables: {
      list: (clubId: string, params?: tables.ListTableAssignmentsParams) => tables.listTableAssignments(fetcher, clubId, params),
      suggestions: (clubId: string, matchId: string, role: tables.TableAssignmentRole) => tables.getTableSuggestions(fetcher, clubId, matchId, role),
      assign: (clubId: string, matchId: string, role: tables.TableAssignmentRole, body: tables.PutTableAssignmentDto) => tables.putTableAssignment(fetcher, clubId, matchId, role, body),
      unassign: (clubId: string, matchId: string, role: tables.TableAssignmentRole) => tables.deleteTableAssignment(fetcher, clubId, matchId, role),
      setRefereeStatus: (clubId: string, matchId: string, noRefereeNeeded: boolean) => tables.setRefereeStatus(fetcher, clubId, matchId, noRefereeNeeded),
      listPublicAccess: (clubId: string) => tables.listPublicAccess(fetcher, clubId),
      resetPublicAccess: (clubId: string, licencieId: string) => tables.resetPublicAccess(fetcher, clubId, licencieId),
      personalLink: (clubId: string, licencieId: string) => tables.getPersonalLink(fetcher, clubId, licencieId),
      claimRequests: (clubId: string) => tables.listClaimRequests(fetcher, clubId),
      decideClaimRequest: (clubId: string, requestId: string, decision: "approve" | "reject") => tables.decideClaimRequest(fetcher, clubId, requestId, decision),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
