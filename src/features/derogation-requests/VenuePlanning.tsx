"use client";

import { useState } from "react";
import { Clock, MapPin, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Notice } from "@/components/ui/Notice";
import type { CandidateSlotDto, DerogationAvailabilityDto } from "@/lib/api/derogationRequests";

const ROW = 48; // hauteur d'un créneau (px) — cibles tactiles ≥ 44 px

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export interface SlotSelection {
  venueId: string | null;
  venueName: string | null;
  startAt: string;
  endAt: string;
  localStart: string;
  localEnd: string;
  warnings: CandidateSlotDto["warnings"];
}

/** « Conflit avec U15M vs Montpellier, 16:00–18:00. » */
export function conflictText(slot: CandidateSlotDto, localTimes: (iso: string) => string): string {
  const c = slot.conflicts[0];
  if (!c) return slot.available ? "" : "Créneau déjà passé.";
  const who = [c.teamName, c.opponentName ? `vs ${c.opponentName}` : null].filter(Boolean).join(" ") || "un match";
  const prefix = c.type === "TEAM_MATCH" ? "L'équipe joue déjà" : "Conflit avec";
  return `${prefix} ${who}, ${localTimes(c.startAt)}–${localTimes(c.endAt)}.`;
}

/**
 * Planning des gymnases (retour du club, 2026-10-01 : « je veux pouvoir
 * comprendre les matchs prévus, leur durée, les trous disponibles, le
 * gymnase, l'heure en quelques secondes »). Une timeline verticale par
 * gymnase — côte à côte sur desktop, empilées sur mobile :
 *  - match programmé : carte pleine sur ses 2 heures (conflit dur) ;
 *  - demande en cours : contour pointillé (avertissement, reste sélectionnable) ;
 *  - créneau libre : action « Choisir » ;
 *  - créneau impossible : non sélectionnable, la raison s'affiche au tap.
 * Toutes les heures viennent de l'API, déjà dans le fuseau du club.
 */
export function VenuePlanning({
  availability,
  selected,
  onSelect,
  localTime,
}: {
  availability: DerogationAvailabilityDto;
  selected: SlotSelection | null;
  onSelect: (selection: SlotSelection) => void;
  localTime: (iso: string) => string;
}) {
  const [explained, setExplained] = useState<string | null>(null);
  const gridStart = minutes(availability.rules.gridStart);
  const gridEnd = minutes(availability.rules.gridEnd) + availability.rules.durationMinutes;
  const hours: number[] = [];
  for (let m = Math.floor(gridStart / 60) * 60; m <= gridEnd; m += 60) hours.push(m);
  // Un créneau garde ROW de haut quel que soit le pas (demi-heures depuis le 2026-10-22) : l'heure s'agrandit d'autant.
  const hourHeight = ROW * (60 / (availability.rules.slotStepMinutes || 60));
  const height = ((gridEnd - gridStart) / 60) * hourHeight;
  const top = (hhmm: string) => ((minutes(hhmm) - gridStart) / 60) * hourHeight;
  const blockHeight = (availability.rules.durationMinutes / 60) * hourHeight;
  const columns = availability.venues.length >= 3 ? "xl:grid-cols-3" : "";

  return (
    <div className="flex flex-col gap-4">
      <Legend />
      {explained ? (
        <Notice tone="warning" live>
          {explained}
        </Notice>
      ) : null}
      <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", columns)}>
        {availability.venues.map((lane) => {
          const freeCount = lane.candidateStartTimes.filter((c) => c.available).length;
          return (
            <section key={lane.venue.id} aria-label={lane.venue.name} className="surface-card overflow-hidden">
              <header className="flex items-start gap-2.5 border-b border-border px-4 py-3">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-text" />
                <div className="text-reflow flex-1">
                  <h3 className="type-card text-foreground">{lane.venue.name}</h3>
                  <p className="type-meta">
                    {lane.existingMatches.length} match{lane.existingMatches.length > 1 ? "s" : ""} programmé{lane.existingMatches.length > 1 ? "s" : ""} · {freeCount} créneau{freeCount > 1 ? "x" : ""} libre{freeCount > 1 ? "s" : ""}
                  </p>
                </div>
              </header>
              <div className="flex px-2 py-3 sm:px-3">
                {/* Graduation horaire */}
                <div aria-hidden className="relative w-12 shrink-0" style={{ height }}>
                  {hours.map((m) => (
                    <span key={m} className="type-numeric absolute -translate-y-1/2 text-[11px] text-subtle" style={{ top: ((m - gridStart) / 60) * hourHeight }}>
                      {String(Math.floor(m / 60)).padStart(2, "0")}:00
                    </span>
                  ))}
                </div>
                <div className="relative flex-1" style={{ height }}>
                  {hours.map((m) => (
                    <div key={m} aria-hidden className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ top: ((m - gridStart) / 60) * hourHeight }} />
                  ))}

                  {/* Créneaux candidats (1 h de pas) */}
                  <ul className="contents">
                    {lane.candidateStartTimes.map((slot) => {
                      const isSelected = selected?.venueId === lane.venue.id && selected.startAt === slot.startAt;
                      const reason = conflictText(slot, localTime);
                      return (
                        <li key={slot.startAt} className="absolute inset-x-0 px-0.5" style={{ top: top(slot.localStart) + 2, height: ROW - 4 }}>
                          {slot.available ? (
                            <button
                              type="button"
                              onClick={() => {
                                setExplained(null);
                                onSelect({ venueId: lane.venue.id, venueName: lane.venue.name, startAt: slot.startAt, endAt: slot.endAt, localStart: slot.localStart, localEnd: slot.localEnd, warnings: slot.warnings });
                              }}
                              aria-pressed={isSelected}
                              aria-label={`${lane.venue.name}, ${slot.localStart} à ${slot.localEnd}, disponible${slot.warnings.length ? ", une autre demande vise ce créneau" : ""}`}
                              className={cn(
                                "group flex h-full w-full items-center justify-between gap-2 rounded-[10px] border px-3 text-left text-[13px] transition-[background-color,border-color,box-shadow] duration-150",
                                isSelected ? "border-accent bg-accent-soft" : "border-transparent bg-surface hover:border-accent-border hover:bg-accent-softer",
                              )}
                            >
                              <span className="type-numeric font-medium text-foreground">
                                {slot.localStart} → {slot.localEnd}
                              </span>
                              <span className={cn("text-[12px] font-medium", isSelected ? "text-accent-text" : "text-muted group-hover:text-accent-text")}>{isSelected ? "Choisi" : "Choisir"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExplained(`${slot.localStart} → ${slot.localEnd} — ${reason || "créneau indisponible."}`)}
                              title={reason}
                              aria-label={`${lane.venue.name}, ${slot.localStart}, indisponible. ${reason}`}
                              className="flex h-full w-full items-center rounded-[10px] px-3 text-left text-[12px] text-subtle [background:repeating-linear-gradient(135deg,transparent_0_6px,var(--surface-muted)_6px_8px)]"
                            >
                              <span className="type-numeric">{slot.localStart}</span>
                              <span className="ml-2 truncate">Indisponible</span>
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Demandes en cours : avertissement, jamais bloquant */}
                  {lane.pendingRequests.map((p) => (
                    <div
                      key={p.requestId}
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0.5 z-[5] rounded-[10px] border-2 border-dashed border-warning/60"
                      style={{ top: top(p.localStart) + 2, height: blockHeight - 4 }}
                    >
                      <span className="absolute right-1.5 top-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10.5px] font-medium text-warning">Demande en cours{p.teamName ? ` · ${p.teamName}` : ""}</span>
                    </div>
                  ))}

                  {/* Matchs programmés : conflit dur, sur toute leur durée */}
                  {lane.existingMatches
                    .filter((m) => minutes(m.localEnd) > gridStart || minutes(m.localEnd) < minutes(m.localStart))
                    .map((m) => {
                      const t = Math.max(0, top(m.localStart));
                      return (
                        <div
                          key={m.matchId}
                          className="absolute inset-x-0.5 z-10 flex flex-col justify-center gap-0.5 overflow-hidden rounded-[10px] border border-border-strong bg-surface-raised px-3 shadow-1"
                          style={{ top: t + 2, height: Math.min(blockHeight, height - t) - 4 }}
                        >
                          <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
                            <Users aria-hidden className="size-3.5 shrink-0 text-muted" />
                            <span className="truncate">
                              {m.teamName ?? "Match"}
                              {m.opponentName ? ` vs ${m.opponentName}` : ""}
                            </span>
                          </p>
                          <p className="type-numeric flex items-center gap-1.5 text-[12px] text-muted">
                            <Clock aria-hidden className="size-3.5 shrink-0" />
                            {m.localStart} → {m.localEnd}
                          </p>
                        </div>
                      );
                    })}

                  {/* Sélection : la fenêtre complète de 2 h */}
                  {selected?.venueId === lane.venue.id ? (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0.5 z-20 rounded-[10px] border-2 border-accent shadow-glow-sm"
                      style={{ top: top(selected.localStart) + 2, height: blockHeight - 4 }}
                    />
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  const item = (swatch: string, label: string) => (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={cn("inline-block h-3 w-5 rounded-[4px]", swatch)} />
      {label}
    </li>
  );
  return (
    <ul className="type-meta flex flex-wrap gap-x-4 gap-y-1.5">
      {item("bg-surface border border-border", "Libre")}
      {item("bg-surface-raised border border-border-strong shadow-1", "Match programmé")}
      {item("border-2 border-dashed border-warning/60", "Demande en cours")}
      {item("border-2 border-accent shadow-glow-xs", "Ta sélection")}
    </ul>
  );
}

/** Match à l'extérieur : liste d'heures (seul le conflit d'équipe compte). */
export function AwaySlots({ slots, selected, onSelect, localTime }: { slots: CandidateSlotDto[]; selected: SlotSelection | null; onSelect: (s: SlotSelection) => void; localTime: (iso: string) => string }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {slots.map((slot) => {
        const isSelected = selected?.startAt === slot.startAt;
        return (
          <li key={slot.startAt}>
            <button
              type="button"
              disabled={!slot.available}
              title={slot.available ? undefined : conflictText(slot, localTime)}
              aria-pressed={isSelected}
              onClick={() => onSelect({ venueId: null, venueName: null, startAt: slot.startAt, endAt: slot.endAt, localStart: slot.localStart, localEnd: slot.localEnd, warnings: [] })}
              className={cn(
                "type-numeric flex h-11 w-full items-center justify-center rounded-[10px] border text-[14px] font-medium transition-[background-color,border-color,box-shadow] duration-150",
                isSelected ? "border-accent bg-accent-soft text-accent-text shadow-glow-xs" : "border-border bg-surface-raised text-foreground shadow-1 hover:border-border-strong",
                "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
              )}
            >
              {slot.localStart}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
