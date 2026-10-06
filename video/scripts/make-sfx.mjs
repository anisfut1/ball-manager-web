// Kit SFX minimal, synthétisé (aucun fichier téléchargé, rendu déterministe) → public/sfx/*.wav
// notif : notification douce · click : clic d'interface · whoosh : mouvement caméra
// thump : arrivée du logo · pad : nappe chaude de l'end card.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 48000;
const out = join(dirname(fileURLToPath(import.meta.url)), "../public/sfx");
mkdirSync(out, { recursive: true });

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function wav(name, seconds, fn) {
  const n = Math.round(seconds * RATE);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i += 1) data[i] = fn(i / RATE, i);
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i] * gain)) * 32767), 44 + i * 2);
  writeFileSync(join(out, `${name}.wav`), buf);
}

const TAU = Math.PI * 2;
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

wav("notif", 0.35, (t) => {
  const f = t < 0.07 ? 1318 : 1760;
  return Math.sin(TAU * f * t) * env(t % 0.07 === t ? t : t - 0.07, 0.004, 0.06) * 0.6;
});

let lp = 0;
wav("click", 0.09, (t) => {
  const noise = rand();
  lp += (noise - lp) * 0.35;
  return (lp * 0.7 + Math.sin(TAU * 2300 * t) * 0.5) * env(t, 0.0015, 0.012);
});

let w1 = 0;
let w2 = 0;
wav("whoosh", 0.9, (t) => {
  const p = t / 0.9;
  const cutoff = 0.02 + 0.22 * Math.sin(Math.PI * p);
  const x = rand();
  w1 += (x - w1) * cutoff;
  w2 += (w1 - w2) * cutoff;
  return w2 * Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.15)), 2);
});

wav("thump", 1.6, (t) => {
  const f = 46 + 30 * Math.exp(-t / 0.08);
  const body = Math.sin(TAU * f * t) * env(t, 0.004, 0.38);
  const air = Math.sin(TAU * 880 * t) * 0.05 * env(t, 0.02, 0.5) + Math.sin(TAU * 1320 * t) * 0.03 * env(t, 0.03, 0.6);
  return body + air;
});

const chord = [110, 164.81, 220, 277.18, 329.63];
wav("pad", 7.5, (t) => {
  const attack = Math.min(1, t / 2.2);
  const release = t > 6 ? Math.max(0, 1 - (t - 6) / 1.5) : 1;
  let s = 0;
  chord.forEach((f, i) => {
    s += Math.sin(TAU * f * t + Math.sin(TAU * 0.13 * t + i) * 0.4) / (i + 1.4);
    s += Math.sin(TAU * f * 1.003 * t) / (i + 2.5);
  });
  return s * attack * release;
});

console.log(`SFX → ${out}`);
