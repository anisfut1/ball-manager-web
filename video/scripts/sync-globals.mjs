// Dérive src/.generated/app-globals.css du VRAI src/app/globals.css de l'application
// (seule la ligne `@import "tailwindcss"` est retirée : la vidéo l'importe elle-même,
// depuis ses propres node_modules). Lancé automatiquement avant studio/render/still.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "../../src/app/globals.css");
const target = join(here, "../src/.generated/app-globals.css");
const css = readFileSync(source, "utf8").replace(/^@import\s+["']tailwindcss["'];?\s*$/m, "/* @import \"tailwindcss\" : importé par video/src/styles.css */");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `/* GÉNÉRÉ depuis src/app/globals.css — ne pas modifier, voir video/scripts/sync-globals.mjs */\n${css}`);
console.log(`design tokens synchronisés → ${target}`);
