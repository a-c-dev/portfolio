// Cambia el número de versión (?v=...) de los CSS y JS en todas las páginas y en los
// @import de main.css. Así el navegador no mezcla estilos antiguos con HTML nuevo
// (GitHub Pages sirve los CSS con 10 minutos de caché).
//
//   node tools/bump-version.js          -> AAAAMMDD + letra siguiente (20261126a, 20261126b...)
//   node tools/bump-version.js --dry    -> solo enseña el cambio

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const dry = process.argv.includes("--dry");

const files = fs.readdirSync(ROOT).filter((n) => n.endsWith(".html")).map((n) => path.join(ROOT, n));
files.push(path.join(ROOT, "assets", "css", "main.css"));

const re = /\?v=(\d{8})([a-z]*)/g;
let current = null;
for (const f of files) {
  const m = re.exec(fs.readFileSync(f, "utf8"));
  re.lastIndex = 0;
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

let n = 0;
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const out = text.replace(re, () => { n++; return "?v=" + next; });
  if (out !== text && !dry) fs.writeFileSync(f, out);
}
console.log(`${n} referencia(s) ${dry ? "se cambiarían (--dry)" : "actualizadas"}.`);
