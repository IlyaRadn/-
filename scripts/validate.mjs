// Checks data/deals.json before every commit: schema, allowed codes, duplicate ids and likely duplicate deals.
// Run: node scripts/validate.mjs   (exit code 1 = errors, fix them before committing)
import { readFileSync } from "node:fs";

const file = new URL("../data/deals.json", import.meta.url);
const data = JSON.parse(readFileSync(file, "utf8"));

const REGION = ["eu", "us", "anz", "gulf", "asia"];
const SECTOR = ["g", "e", "b", "u", "i", "c", "m", "t"];
const CATEGORY = ["gpt", "notes", "build", "data", "frame", "infra", "fraud", "code", "mna"];
const STATUS = [null, "mou", "pilot", "tender", "noaward", "blocked", "free", "ctx"];
const QUALITY = ["d", "p", "w"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const warnings = [];

if (!DATE.test(data.updated ?? "")) errors.push("updated: нужна дата YYYY-MM-DD");
if (!DATE.test(data.baseline ?? "")) errors.push("baseline: нужна дата YYYY-MM-DD");
if (!Array.isArray(data.deals)) errors.push("deals: должен быть массивом");

const ids = new Set();
const keys = new Map();
for (const [i, d] of (data.deals ?? []).entries()) {
  const at = `deals[${i}] ${d.id ?? "(без id)"}`;
  for (const f of ["id", "c", "b", "p", "w", "v", "t", "u", "d"]) {
    if (typeof d[f] !== "string" || !d[f].trim()) errors.push(`${at}: поле ${f} пустое`);
  }
  if (ids.has(d.id)) errors.push(`${at}: id повторяется`);
  ids.add(d.id);
  if (!REGION.includes(d.r)) errors.push(`${at}: r = ${d.r}, допустимо ${REGION}`);
  if (!SECTOR.includes(d.s)) errors.push(`${at}: s = ${d.s}, допустимо ${SECTOR}`);
  if (!CATEGORY.includes(d.k)) errors.push(`${at}: k = ${d.k}, допустимо ${CATEGORY}`);
  if (!STATUS.includes(d.st ?? null)) errors.push(`${at}: st = ${d.st}, допустимо ${STATUS}`);
  if (!QUALITY.includes(d.q)) errors.push(`${at}: q = ${d.q}, допустимо ${QUALITY}`);
  if (typeof d.y !== "number" || d.y < 2015 || d.y > 2031) errors.push(`${at}: y должен быть числом вида 2026.05`);
  if (d.e !== null && (typeof d.e !== "number" || d.e < 0)) errors.push(`${at}: e — число в евро или null`);
  if (!Array.isArray(d.src)) errors.push(`${at}: src должен быть массивом ссылок`);
  else if (!d.src.length && d.added > data.baseline) errors.push(`${at}: у новой сделки нет источника`);
  for (const u of d.src ?? []) if (!/^https?:\/\//.test(u)) errors.push(`${at}: ссылка ${u} не http(s)`);
  if (!DATE.test(d.added ?? "")) errors.push(`${at}: added — дата YYYY-MM-DD`);
  if (d.pd !== undefined && (typeof d.pd !== "string" || !d.pd.trim())) errors.push(`${at}: pd пустое`);
  if (d.pd === undefined && d.added > data.baseline) errors.push(`${at}: у новой сделки нет pd (пояснение к продукту)`);
  if (typeof d.pd === "string" && d.pd.split(/\s+/).length > 9) warnings.push(`${at}: pd длиннее 9 слов`);
  const key = `${d.r}|${d.b}|${d.p}|${d.d}`.toLowerCase();
  if (keys.has(key)) warnings.push(`${at}: похоже на дубль ${keys.get(key)}`);
  keys.set(key, d.id);
}

for (const w of warnings) console.warn("ПРЕДУПРЕЖДЕНИЕ:", w);
for (const e of errors) console.error("ОШИБКА:", e);
console.log(`Сделок: ${data.deals?.length ?? 0}. Ошибок: ${errors.length}. Предупреждений: ${warnings.length}.`);
process.exit(errors.length ? 1 : 0);
