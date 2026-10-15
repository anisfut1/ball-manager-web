/**
 * Shim de `next/navigation` : routeur inerte. `usePathname()` renvoie le
 * chemin « affiché » par la scène en cours, posé par <ProductShell> dans
 * son propre rendu, juste avant que la Sidebar/Topbar réelles ne le lisent
 * (rendu synchrone, une frame par onglet : aucune course possible).
 */
let currentPathname = "/";
export function __setPathname(pathname: string): void {
  currentPathname = pathname;
}
const noop = (..._args: unknown[]) => undefined;
export function useRouter() {
  return { push: noop, replace: noop, refresh: noop, back: noop, forward: noop, prefetch: noop };
}
export function usePathname(): string {
  return currentPathname;
}
export function useSearchParams() {
  return new URLSearchParams();
}
export function notFound(): never {
  throw new Error("notFound() n'a pas de sens dans la vidéo");
}
export function redirect(): never {
  throw new Error("redirect() n'a pas de sens dans la vidéo");
}
