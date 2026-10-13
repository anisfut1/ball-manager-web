"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, Input } from "@/components/ui/Field";

/** §24 de la demande : `POST /v1/platform/clubs` — l'invitation du premier club_admin (email Ball Manager, voir ball-manager-back `auth/account-invites.ts`) est gérée par le backend, jamais depuis ce frontend avec une clé service role. */
export function CreateClubForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const ffbbClubId = String(formData.get("ffbb_club_id") ?? "").trim();
    const timezone = String(formData.get("timezone") ?? "Europe/Paris").trim() || "Europe/Paris";
    const adminEmail = String(formData.get("admin_email") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();

    if (!name || !ffbbClubId) {
      setMessage({ success: false, text: "Le nom et le code FFBB sont requis." });
      return;
    }

    startTransition(async () => {
      try {
        const result = await browserApi.platform.createClub({
          name,
          ffbbClubId,
          timezone,
          slug: slug || undefined,
          adminEmail: adminEmail || undefined,
        });
        setMessage({
          success: true,
          text: result.adminInviteError ? result.adminInviteError : `Club "${name}" créé (/c/${result.slug}).`,
        });
        router.refresh();
      } catch (error) {
        setMessage({
          success: false,
          text: error instanceof ApiError ? error.message : "Création du club impossible. Réessaie.",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom du club" required>
          {(props) => <Input {...props} name="name" type="text" placeholder="ex: Club B Basket" autoComplete="off" />}
        </Field>
        <Field label="Slug" optional hint="Généré depuis le nom sinon.">
          {(props) => <Input {...props} name="slug" type="text" placeholder="ex: club-b-basket" autoComplete="off" />}
        </Field>
        <Field label="Code FFBB" required>
          {(props) => <Input {...props} name="ffbb_club_id" type="text" placeholder="ex: OCC0034008" autoComplete="off" />}
        </Field>
        <Field label="Fuseau horaire">
          {(props) => <Input {...props} name="timezone" type="text" defaultValue="Europe/Paris" />}
        </Field>
        <Field
          label="Email du premier administrateur"
          optional
          className="sm:col-span-2"
          hint="Cette personne devient administrateur du club et reçoit un email Ball Manager pour créer son mot de passe."
        >
          {(props) => <Input {...props} name="admin_email" type="email" placeholder="admin@club-b.example" autoComplete="off" />}
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" variant="primary" loading={isPending} icon={<Plus />}>
          {isPending ? "Création…" : "Créer le club"}
        </Button>
        {message ? <FormMessage tone={message.success ? "success" : "danger"}>{message.text}</FormMessage> : null}
      </div>
    </form>
  );
}
