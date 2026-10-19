"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";

/** Retire une anomalie de la liste (`POST /v1/clubs/:clubId/issues/dismiss`). Elle revient si la situation change. */
export function DismissIssueButton({ clubId, issueKey }: { clubId: string; issueKey: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      try {
        await browserApi.issues.dismiss(clubId, issueKey);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Action impossible. Réessaie.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="ghost" size="sm" onClick={handleClick} loading={isPending} icon={<X />}>
        Retirer
      </Button>
      {error ? <FormMessage tone="danger">{error}</FormMessage> : null}
    </div>
  );
}
