import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/BrandMark";

/** Page de texte simple, publique (confidentialité, aide) : lisible sur iPhone comme sur ordinateur. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-3">
        <BrandMark className="size-9 rounded-[10px]" />
        <span className="text-[15px] font-semibold text-foreground">Ball Manager</span>
      </div>
      <header className="flex flex-col gap-1">
        <h1 className="type-title text-foreground">{title}</h1>
        <p className="type-meta">Mise à jour : {updated}</p>
      </header>
      <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-foreground [&_h2]:pt-2 [&_h2]:text-[17px] [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
    </main>
  );
}

/** Adresse de contact configurée au déploiement (jamais inventée) ; sinon le club. */
export function supportEmail(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
