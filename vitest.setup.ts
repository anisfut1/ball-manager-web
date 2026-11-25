import { vi } from "vitest";

/**
 * Valeurs d'environnement factices pour que les modules qui valident leur
 * config au chargement (src/config/env.*.ts) puissent être importés en test
 * sans dépendre d'un vrai projet Supabase. Aucune valeur réelle ici.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.NEXT_PUBLIC_CLUB_MANAGER_API_URL ??= "https://api.test.example.com";

/**
 * `server-only` ne s'exécute correctement que sous la condition de résolution
 * "react-server" fournie par Next.js ; en dehors (ici, Vitest/Node), il lève
 * systématiquement pour signaler un mauvais usage. On le neutralise en test
 * pour pouvoir tester le code serveur qui l'importe (ex: config/env.server.ts).
 */
vi.mock("server-only", () => ({}));
