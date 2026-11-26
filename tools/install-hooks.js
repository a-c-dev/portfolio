// Instala los hooks de git de tools/githooks/ en .git/hooks/.
// Hay que hacerlo una vez en cada copia del repositorio (los hooks de .git no se versionan).
//   node tools/install-hooks.js

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(__dirname, "githooks");
const gitDir = execFileSync("git", ["rev-parse", "--git-path", "hooks"], { cwd: ROOT, encoding: "utf8" }).trim();
const DEST = path.resolve(ROOT, gitDir);

fs.mkdirSync(DEST, { recursive: true });
for (const name of fs.readdirSync(SRC)) {
  const from = path.join(SRC, name);
  const to = path.join(DEST, name);
  // los hooks son scripts de sh: siempre con saltos de línea LF
  const text = fs.readFileSync(from, "utf8").replace(/\r\n/g, "\n");
  fs.writeFileSync(to, text, { mode: 0o755 });
  try { fs.chmodSync(to, 0o755); } catch (e) { /* en Windows no hace falta */ }
  console.log("Hook instalado:", path.relative(ROOT, to));
}

// el registro de IndexNow no debe aparecer como cambio pendiente
const exclude = path.join(ROOT, ".git", "info", "exclude");
try {
  const cur = fs.existsSync(exclude) ? fs.readFileSync(exclude, "utf8") : "";
  if (!cur.includes("tools/.indexnow.log")) {
    fs.appendFileSync(exclude, (cur.endsWith("\n") || !cur ? "" : "\n") + "tools/.indexnow.log\n");
    console.log("Registro tools/.indexnow.log excluido de git.");
  }
} catch (e) { /* si .git/info no existe, no pasa nada */ }
