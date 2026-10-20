"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Export PDF : impression du navigateur (« Enregistrer en PDF »), feuille A4 paysage. */
export function PrintBookingButton() {
  return (
    <Button variant="primary" icon={<FileDown />} onClick={() => window.print()}>
      Exporter en PDF
    </Button>
  );
}
