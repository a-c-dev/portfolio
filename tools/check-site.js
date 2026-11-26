// Revisa el sitio antes de publicar:
//  - JSON-LD válido en cada página
//  - archivos locales referenciados (imágenes, CSS, JS) que existen
//  - anclas (#id) que existen, también las de enlaces a otras páginas
//  - exactamente un <h1> y un <title> por página
//  - todas las páginas del sitemap existen
//
//   node tools/check-site.js        (código de salida 1 si hay problemas)

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const sitemap = read("sitemap.xml");
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
  const p = new URL(m[1].trim()).pathname.replace(/^\//, "");
  return p === "" ? "index.html" : p;
});
if (fs.existsSync(path.join(ROOT, "404.html"))) pages.push("404.html");

let problems = 0;
const bad = (page, msg) => { problems++; console.log(`  ✗ ${page}: ${msg}`); };

for (const page of pages) {
  if (!fs.existsSync(path.join(ROOT, page))) { bad("sitemap.xml", `la página ${page} no existe`); continue; }
  const html = read(page);
  const before = problems;

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { bad(page, "JSON-LD no válido (" + e.message + ")"); }
  }

  const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)].map((m) => m[1])
    .filter((u) => !/^(https?:|mailto:|data:|tel:)/.test(u) && u !== "/");
  for (const u of new Set(refs)) {
    const p = decodeURIComponent(u).replace(/^\//, "");
    if (!fs.existsSync(path.join(ROOT, p))) bad(page, `falta el archivo ${u}`);
  }

  const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.has(m[1])) bad(page, `ancla rota #${m[1]}`);
  for (const m of html.matchAll(/href="([A-Za-z0-9_-]+\.html)#([^"]+)"/g)) {
    const target = path.join(ROOT, m[1]);
    if (!fs.existsSync(target)) { bad(page, `enlace a ${m[1]}, que no existe`); continue; }
    if (!fs.readFileSync(target, "utf8").includes(`id="${m[2]}"`)) bad(page, `ancla rota ${m[1]}#${m[2]}`);
  }

  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (page !== "404.html" && h1 !== 1) bad(page, `tiene ${h1} <h1> (debe ser 1)`);
  if (!/<title>[^<]+<\/title>/.test(html)) bad(page, "no tiene <title>");

  if (problems === before) console.log(`  ✓ ${page}`);
}

console.log(problems ? `\n${problems} problema(s).` : "\nTodo correcto.");
process.exit(problems ? 1 : 0);
