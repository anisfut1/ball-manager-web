"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * « Télécharger en PDF » : ouvre l'impression du navigateur, qui propose
 * « Enregistrer en PDF » partout (Mac, Windows, iPhone, Android) — aucune
 * dépendance PDF. Seule la zone `#print-area` est imprimée (globals.css) ;
 * le titre du document devient le nom du fichier proposé.
 */
export function PrintIssuesButton({ fileName }: { fileName: string }) {
  function print() {
    const previous = document.title;
    document.title = fileName;
    window.addEventListener("afterprint", () => (document.title = previous), { once: true });
    window.print();
  }
  return (
    <Button variant="secondary" size="sm" icon={<FileDown />} onClick={print} className="print:hidden">
      Télécharger en PDF
    </Button>
  );
}
