"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, Input } from "@/components/ui/Field";

/**
 * §20 de la demande : envoyé directement à ball-manager-back en HTTPS
 * (Client Component, jamais un Server Action) — jamais stocké dans
 * localStorage, jamais loggé côté frontend, jamais renvoyé après succès.
 * Le champ mot de passe est vidé après un enregistrement réussi.
 *
 * BACKEND_API_GAP (voir docs/MIGRATION_TO_API.md) : l'identifiant FBI déjà
 * enregistré n'est plus pré-rempli — `GET /v1/clubs/:clubId/integrations`
 * n'expose pas le `username` configuré (par choix : seul `configured`/
 * `connected` sont exposés). Le champ reste donc toujours vide au chargement.
 */
export function FbiCredentialsForm({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    if (!username) {
      setMessage({ success: false, text: "L'identifiant est requis." });
      return;
    }

    startTransition(async () => {
      try {
        await browserApi.integrations.saveFbi(clubId, { username, password: passwordValue || undefined });
        setMessage({ success: true, text: "Identifiants FBI enregistrés." });
        setPassword("");
        router.refresh();
      } catch (error) {
        setMessage({ success: false, text: error instanceof ApiError ? error.message : "Enregistrement impossible. Réessaie." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Identifiant FBI" required>
          {(props) => <Input {...props} name="username" type="text" autoComplete="off" placeholder="ex: club0034008" />}
        </Field>
        <Field label="Mot de passe FBI" hint="Jamais affiché ni renvoyé une fois enregistré — chiffré (AES-256-GCM) côté ball-manager-back.">
          {(props) => (
            <Input
              {...props}
              name="password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Laisser vide pour ne pas changer"
            />
          )}
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={isPending} icon={<Save />}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {message ? <FormMessage tone={message.success ? "success" : "danger"}>{message.text}</FormMessage> : null}
      </div>
    </form>
  );
}
