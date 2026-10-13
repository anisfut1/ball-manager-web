"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActionStatus } from "@/components/ui/ActionStatus";

/**
 * §9/§22 de la demande : Client Component → ball-manager-back directement
 * (JWT Supabase), jamais un Server Action qui reproduirait un mini-backend
 * Next.js. `router.refresh()` recharge les Server Components de la page
 * (dernière synchro affichée) après l'appel, sans navigation complète.
 */
export function TriggerFfbbSyncButton({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await browserApi.integrations.triggerFfbbSync(clubId);
        setMessage({ success: true, text: `Synchronisation terminée (${result.status}).` });
        router.refresh();
      } catch (error) {
        setMessage({
          success: false,
          text: error instanceof ApiError ? error.message : "Synchronisation impossible. Réessaie.",
        });
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={handleClick} loading={isPending} icon={<RefreshCw />}>
        {isPending ? "Synchronisation…" : "Relancer maintenant"}
      </Button>
      <ActionStatus status={message ? { kind: message.success ? "success" : "error", text: message.text } : null} />
    </div>
  );
}
