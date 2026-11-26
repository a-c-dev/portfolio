// Avisa a los buscadores que usan IndexNow (Bing, Yandex, Seznam, Naver...) de que
// hay páginas nuevas o cambiadas. Google no usa IndexNow: para Google vale el sitemap.
//
// Uso (después de publicar con git push):
//   node tools/indexnow.js              -> envía todas las URL del sitemap.xml
//   node tools/indexnow.js URL1 URL2    -> envía solo esas URL
//   node tools/indexnow.js --dry        -> enseña qué enviaría, sin enviar nada
//
// La clave es el nombre del archivo <clave>.txt de la raíz del sitio (el propio
// archivo contiene la misma clave): así los buscadores comprueban que eres el dueño.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HOST = "alexcatto.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const explicit = args.filter((a) => a.startsWith("http"));

// 1) Clave: archivo de 32 caracteres hexadecimales cuyo contenido es su propio nombre
const keyFile = fs.readdirSync(ROOT).find((n) => /^[0-9a-f]{32}\.txt$/.test(n) &&
  fs.readFileSync(path.join(ROOT, n), "utf8").trim() === n.replace(".txt", ""));
if (!keyFile) {
  console.error("No encuentro el archivo de clave de IndexNow en la raíz del proyecto.");
  process.exit(1);
}
const key = keyFile.replace(".txt", "");

// 2) URLs: las indicadas, o todas las del sitemap
let urls = explicit;
if (!urls.length) {
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}
if (!urls.length) {
  console.error("No hay URL que enviar.");
  process.exit(1);
}

const body = { host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: urls };
console.log(`IndexNow: ${urls.length} URL de ${HOST}`);
urls.forEach((u) => console.log("  - " + u));

if (dry) {
  console.log("\n(modo --dry: no se ha enviado nada)");
  process.exit(0);
}

(async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const meaning = {
    200: "OK: enviado",
    202: "Aceptado: se validará la clave en breve",
    400: "Petición mal formada",
    403: "Clave no válida (¿está publicado el archivo de clave?)",
    422: "URL que no pertenecen al host o clave que no coincide",
    429: "Demasiadas peticiones",
  };
  console.log(`\nRespuesta: ${res.status} ${meaning[res.status] || ""} ${text}`.trim());
  process.exit(res.ok ? 0 : 1);
})().catch((e) => { console.error("Error de red:", e.message); process.exit(1); });
