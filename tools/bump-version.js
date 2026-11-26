// Pone (o cambia) el número de versión (?v=...) de los CSS y JS en todas las páginas y en
// los @import de main.css. Así el navegador no mezcla estilos antiguos con HTML nuevo
// (GitHub Pages sirve los CSS con 10 minutos de caché).
//
//   node tools/bump-version.js          -> AAAAMMDD + letra siguiente (20261126a, 20261126b...)
//   node tools/bump-version.js --dry    -> solo enseña el cambio
//
// Añade la versión también donde todavía no la hay (por ejemplo, en una página nueva).

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const dry = process.argv.includes("--dry");

// href/src que apuntan a CSS o JS propios (con o sin barra inicial), con versión opcional
const HTML_REF = /((?:href|src)="\/?assets\/(?:css|js)\/[A-Za-z0-9._-]+\.(?:css|js))(?:\?v=[0-9a-z]+)?"/g;
// @import de fonts.css y custom.css dentro de main.css
const CSS_REF = /(@import url\("(?:fonts|custom)\.css)(?:\?v=[0-9a-z]+)?"\)/g;

const htmlFiles = fs.readdirSync(ROOT).filter((n) => n.endsWith(".html")).map((n) => path.join(ROOT, n));
const cssFile = path.join(ROOT, "assets", "css", "main.css");

// versión actual: la primera que se encuentre en una referencia propia
let current = null;
for (const f of [...htmlFiles, cssFile]) {
  const text = fs.readFileSync(f, "utf8");
  const m = /assets\/(?:css|js)\/[A-Za-z0-9._-]+\.(?:css|js)\?v=(\d{8})([a-z]*)/.exec(text) ||
            /@import url\("(?:fonts|custom)\.css\?v=(\d{8})([a-z]*)"\)/.exec(text);
  if (m) { current = { date: m[1], letters: m[2] }; break; }
}

const d = new Date();
const today = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

function nextLetters(l) {
  if (!l) return "a";
  const chars = l.split("");
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] !== "z") { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); return chars.join(""); }
    chars[i] = "a"; i--;
  }
  return "a" + chars.join("");
}

const next = current && current.date === today ? today + nextLetters(current.letters) : today + "a";
console.log(`Versión: ${current ? current.date + current.letters : "(ninguna)"} -> ${next}`);

// en Windows un antivirus o el visor pueden tener el archivo abierto un instante: se reintenta
function writeSafe(file, text) {
  for (let i = 0; i < 8; i++) {
    try { fs.writeFileSync(file, text); return; }
    catch (e) {
      if (i === 7) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
  }
}

let n = 0;
let added = 0;
function apply(file, regex, suffix) {
  const text = fs.readFileSync(file, "utf8");
  const out = text.replace(regex, (m, head) => {
    n++;
    if (!/\?v=/.test(m)) added++;
    return `${head}?v=${next}${suffix}`;
  });
  if (out !== text && !dry) writeSafe(file, out);
}
for (const f of htmlFiles) apply(f, HTML_REF, '"');
apply(cssFile, CSS_REF, '")');

console.log(`${n} referencia(s) ${dry ? "se cambiarían (--dry)" : "actualizadas"}${added ? `, ${added} sin versión que ahora la llevan` : ""}.`);
