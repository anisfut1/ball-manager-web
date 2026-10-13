"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { TeamDto } from "@/lib/api/clubs";
import { ChevronDown, Plus, Save, Shirt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDivider, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Checkbox, Field, FormMessage, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { SectionHeader } from "@/components/ui/PageHeader";

type Status = { kind: "success" | "error"; text: string } | null;

function TeamFields({
  name,
  setName,
  category,
  setCategory,
  sexe,
  setSexe,
  numeroEquipe,
  setNumeroEquipe,
  namePlaceholder,
  nameRequired,
}: {
  name: string;
  setName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  sexe: string;
  setSexe: (v: string) => void;
  numeroEquipe: string;
  setNumeroEquipe: (v: string) => void;
  namePlaceholder?: string;
  nameRequired?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-[2fr_1.2fr_1fr_1fr]">
      <Field label="Nom" required={nameRequired} className="col-span-2 lg:col-span-1">
        {(props) => <Input {...props} placeholder={namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Catégorie">
        {(props) => <Input {...props} placeholder="U11, SM, …" value={category} onChange={(e) => setCategory(e.target.value)} />}
      </Field>
      <Field label="Sexe">
        {(props) => (
          <Select {...props} value={sexe} onChange={(e) => setSexe(e.target.value)}>
            <option value="">—</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </Select>
        )}
      </Field>
      <Field label="N° équipe">
        {(props) => <Input {...props} placeholder="1, 2, …" value={numeroEquipe} onChange={(e) => setNumeroEquipe(e.target.value)} />}
      </Field>
    </div>
  );
}

function TeamRow({ clubId, team }: { clubId: string; team: TeamDto }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [name, setName] = useState(team.name);
  const [category, setCategory] = useState(team.category ?? "");
  const [sexe, setSexe] = useState(team.sexe ?? "");
  const [numeroEquipe, setNumeroEquipe] = useState(team.numeroEquipe ?? "");
  const [active, setActive] = useState(team.active);

  function handleSave() {
    setStatus(null);
    startTransition(async () => {
      try {
        await browserApi.clubs.updateTeam(clubId, team.id, {
          name: name.trim(),
          category: category.trim() || null,
          sexe: sexe === "M" || sexe === "F" ? sexe : null,
          numeroEquipe: numeroEquipe.trim() || null,
          active,
        });
        setStatus({ kind: "success", text: "Équipe mise à jour." });
        router.refresh();
      } catch (error) {
        setStatus({ kind: "error", text: error instanceof ApiError ? error.message : "Mise à jour impossible." });
      }
    });
  }

  return (
    <li>
      <details className="group surface-card overflow-hidden [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3">
          <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-accent-text">
            <Shirt className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{team.name}</span>
            <span className="type-meta truncate">{[team.category, team.sexe, team.numeroEquipe ? `n° ${team.numeroEquipe}` : null].filter(Boolean).join(" · ") || "Catégorie non renseignée"}</span>
          </span>
          {team.active ? (
            <StatusBadge tone="success" size="sm">
              Active
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral" size="sm">
              Inactive
            </StatusBadge>
          )}
          <ChevronDown aria-hidden className="size-4 shrink-0 text-subtle transition-transform duration-150 group-open:rotate-180" />
          <span className="sr-only">Modifier</span>
        </summary>
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          <TeamFields name={name} setName={setName} category={category} setCategory={setCategory} sexe={sexe} setSexe={setSexe} numeroEquipe={numeroEquipe} setNumeroEquipe={setNumeroEquipe} />
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} className="min-h-10 py-1" />
            <Button variant="primary" size="sm" onClick={handleSave} loading={isPending} icon={<Save />}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {status ? <FormMessage tone={status.kind === "success" ? "success" : "danger"}>{status.text}</FormMessage> : null}
          </div>
        </div>
      </details>
    </li>
  );
}

function CreateTeamForm({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sexe, setSexe] = useState("");
  const [numeroEquipe, setNumeroEquipe] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    startTransition(async () => {
      try {
        await browserApi.clubs.createTeam(clubId, {
          name: name.trim(),
          category: category.trim() || null,
          sexe: sexe === "M" || sexe === "F" ? sexe : null,
          numeroEquipe: numeroEquipe.trim() || null,
        });
        setName("");
        setCategory("");
        setSexe("");
        setNumeroEquipe("");
        setStatus({ kind: "success", text: "Équipe créée." });
        router.refresh();
      } catch (error) {
        setStatus({ kind: "error", text: error instanceof ApiError ? error.message : "Création impossible." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TeamFields
        name={name}
        setName={setName}
        category={category}
        setCategory={setCategory}
        sexe={sexe}
        setSexe={setSexe}
        numeroEquipe={numeroEquipe}
        setNumeroEquipe={setNumeroEquipe}
        namePlaceholder="U11M-1"
        nameRequired
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={isPending} icon={<Plus />}>
          {isPending ? "Création…" : "Créer l'équipe"}
        </Button>
        {status ? <FormMessage tone={status.kind === "success" ? "success" : "danger"}>{status.text}</FormMessage> : null}
      </div>
    </form>
  );
}

/**
 * Gestion des équipes (demande du club : sectoriser le roster/calendrier
 * par équipe — U9, U11M-1/2, U11F, U13M/F, U15M-1/2, U15F, U18M/F,
 * SM1/2/3, SF). Certaines catégories n'ont pas encore d'engagement FFBB
 * confirmé en début de saison (phase de brassage) : cette page permet de
 * les enregistrer manuellement dès maintenant, voir docs/TEAMS.md côté
 * ball-manager-back — la synchro FFBB réutilisera ensuite la même ligne
 * (résolution par catégorie/sexe/numéro, jamais par le nom) une fois
 * l'engagement confirmé.
 */
export function TeamsManager({ clubId, teams }: { clubId: string; teams: TeamDto[] }) {
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader icon={<Plus />} title="Nouvelle équipe" description="Enregistrez une équipe avant même son engagement FFBB confirmé." />
        <CardDivider />
        <CreateTeamForm clubId={clubId} />
      </Card>

      <section className="flex flex-col gap-3">
        <SectionHeader title={`Équipes (${sortedTeams.length})`} description="Ouvrez une équipe pour la renommer, la reclasser ou la désactiver." />
        {sortedTeams.length === 0 ? (
          <EmptyState icon={<Shirt />} title="Aucune équipe enregistrée pour l'instant" compact />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 xl:grid-cols-2 xl:items-start">
            {sortedTeams.map((team) => (
              <TeamRow key={team.id} clubId={clubId} team={team} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
