"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { LicencieDto } from "@/lib/api/licencies";
import type { TeamDto } from "@/lib/api/clubs";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, FormMessage, Input, Select } from "@/components/ui/Field";
import { PhotoUploader } from "./PhotoUploader";

type Status = { kind: "success" | "error"; text: string } | null;

/**
 * Formulaire d'édition de la fiche joueur (demande du club : "agrémenter
 * soit en admin avec photo, infos persos etc, ou bien le joueur direct
 * s'il a un compte associé à son profil"). Deux jeux de champs distincts,
 * décidés CÔTÉ SERVEUR (voir `[licencieId]/page.tsx`) — jamais recalculés
 * ici : le serveur (ball-manager-back) rejette de toute façon (400) tout
 * champ hors de la population autorisée pour l'appelant, voir
 * docs/LICENCIES.md côté ball-manager-back. `mode="admin"` expose
 * l'identité complète, `mode="self"` UNIQUEMENT le contact/la photo.
 */
export function LicencieProfileEditForm({
  clubId,
  licencie,
  mode,
  teams,
}: {
  clubId: string;
  licencie: LicencieDto;
  mode: "admin" | "self";
  teams: TeamDto[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [firstName, setFirstName] = useState(licencie.firstName);
  const [lastName, setLastName] = useState(licencie.lastName);
  const [licenseNumber, setLicenseNumber] = useState(licencie.licenseNumber ?? "");
  const [birthDate, setBirthDate] = useState(licencie.birthDate ?? "");
  const [active, setActive] = useState(licencie.active);
  const [teamId, setTeamId] = useState(licencie.teamId ?? "");
  const [photoUrl, setPhotoUrl] = useState(licencie.photoUrl ?? "");
  const [email, setEmail] = useState(licencie.email ?? "");
  const [phone, setPhone] = useState(licencie.phone ?? "");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);

    startTransition(async () => {
      try {
        const contactFields = { photoUrl: photoUrl.trim() || null, email: email.trim() || null, phone: phone.trim() || null };
        const body =
          mode === "admin"
            ? { ...contactFields, firstName, lastName, licenseNumber: licenseNumber.trim() || null, birthDate: birthDate || null, active, teamId: teamId || null }
            : contactFields;

        await browserApi.licencies.updateProfile(clubId, licencie.id, body);
        setStatus({ kind: "success", text: "Profil mis à jour." });
        router.refresh();
      } catch (error) {
        setStatus({ kind: "error", text: error instanceof ApiError ? error.message : "Mise à jour impossible." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {mode === "admin" ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prénom" required>
              {(props) => <Input {...props} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" />}
            </Field>
            <Field label="Nom" required>
              {(props) => <Input {...props} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />}
            </Field>
            <Field label="Numéro de licence" optional>
              {(props) => <Input {...props} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />}
            </Field>
            <Field label="Date de naissance" optional>
              {(props) => <Input {...props} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />}
            </Field>
            <Field label="Équipe">
              {(props) => (
                <Select {...props} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                  <option value="">Sans équipe</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex items-end">
              <Checkbox label="Licencié·e actif·ve" checked={active} onChange={(e) => setActive(e.target.checked)} />
            </div>
          </div>
          <hr className="border-border" />
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PhotoUploader clubId={clubId} licencieId={licencie.id} name={`${licencie.firstName} ${licencie.lastName}`} photoUrl={photoUrl || null} onChange={(url) => {
          setPhotoUrl(url ?? "");
          router.refresh();
        }} />
        <Field label="Email" optional>
          {(props) => <Input {...props} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Téléphone" optional>
          {(props) => <Input {...props} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={isPending} icon={<Save />}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {status ? <FormMessage tone={status.kind === "success" ? "success" : "danger"}>{status.text}</FormMessage> : null}
      </div>
    </form>
  );
}
