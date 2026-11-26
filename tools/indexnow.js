// Avisa a los buscadores que usan IndexNow (Bing, Yandex, Seznam, Naver...) de que
// hay páginas nuevas o cambiadas. Google no usa IndexNow: para Google vale el sitemap.
//
// Uso manual:
//   node tools/indexnow.js              -> envía todas las URL del sitemap.xml
//   node tools/indexnow.js URL1 URL2    -> envía solo esas URL
//   node tools/indexnow.js --dry        -> enseña qué enviaría, sin enviar nada
//
// Uso automático (lo lanza el hook pre-push, ver tools/githooks/pre-push):
//   node tools/indexnow.js --after-push <sha_remoto> <sha_local> [--wait] [--dry]
//   Mira qué archivos cambia el push, decide qué URL avisar y, con --wait, espera
//   a que GitHub Pages publique esa versión antes de avisar (hasta 8 minutos).
//
// La clave es el nombre del archivo <clave>.txt de la raíz del sitio (el propio
// archivo contiene la misma clave): así los buscadores comprueban que eres el dueño.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HOST = "alexcatto.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const WAIT_STEP_MS = 10 * 1000;
const WAIT_MAX_MS = 8 * 60 * 1000;

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const dry = flag("--dry") || process.env.INDEXNOW_DRY === "1";
const wait = flag("--wait");
const log = (...m) => console.log(new Date().toISOString().slice(0, 19).replace("T", " "), ...m);

const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.replace(/\r\n/g, "\n");

// ---------- clave ----------
function findKey() {
  const f = fs.readdirSync(ROOT).find((n) => /^[0-9a-f]{32}\.txt$/.test(n) &&
    fs.readFileSync(path.join(ROOT, n), "utf8").trim() === n.replace(".txt", ""));
  if (!f) {
    console.error("No encuentro el archivo de clave de IndexNow en la raíz del proyecto.");
    process.exit(1);
  }
  return f;
}

// ---------- sitemap: URL <-> archivo ----------
function sitemapPages() {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const url = m[1].trim();
    const p = new URL(url).pathname.replace(/^\//, "");
    return { url, file: p === "" ? "index.html" : p };
  });
}

// ---------- qué avisar tras un push ----------
const PAGE_ASSET = /\.(css|js|html|xml|txt|json|svg)$/i;
const IGNORED = /^(tools\/|\.claude\/|\.github\/|google-business-fotos\/|README|\.gitignore)/i;

function planAfterPush(remoteSha, localSha) {
  const pages = sitemapPages();
  const zero = /^0+$/.test(remoteSha);
  let changed;
  try {
    changed = zero ? null : git("diff", "--name-only", remoteSha, localSha).split("\n").filter(Boolean);
  } catch (e) {
    changed = null; // sha remoto desconocido: se avisa todo
  }
  if (changed === null) return { urls: pages.map((p) => p.url), check: pages.map((p) => p.file), why: "rama nueva o historial no disponible" };

  const relevant = changed.filter((f) => !IGNORED.test(f));
  const pageHits = pages.filter((p) => relevant.includes(p.file));
  const sitemapChanged = relevant.includes("sitemap.xml");
  // CSS, JS, imágenes o fuentes cambian el aspecto de todas las páginas
  const siteWide = relevant.some((f) => /^(assets|images)\//.test(f));

  let urls;
  if (sitemapChanged || siteWide) urls = pages.map((p) => p.url);
  else urls = pageHits.map((p) => p.url);

  // qué archivos de texto comprobar en la web antes de avisar
  const check = relevant.filter((f) => PAGE_ASSET.test(f) && fs.existsSync(path.join(ROOT, f)));
  return { urls, check, why: `${relevant.length} archivo(s) de la web cambiados`, relevant };
}

// ---------- espera a que GitHub Pages publique esa versión ----------
async function liveMatches(file, localSha) {
  let local;
  try {
    local = git("show", `${localSha}:${file}`);
  } catch (e) {
    return true; // el archivo ya no existe en esa versión: nada que comprobar
  }
  const route = file === "index.html" ? "" : file;
  const res = await fetch(`https://${HOST}/${route}?nc=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } });
  if (!res.ok) return false;
  return norm(await res.text()) === norm(local);
}

async function waitForDeploy(files, localSha) {
  // con muchos archivos basta con comprobar unos pocos (los HTML primero)
  const sample = [...files].sort((a, b) => Number(/\.html$/.test(b)) - Number(/\.html$/.test(a))).slice(0, 4);
  if (!sample.length) {
    log("Sin archivos de texto que comprobar; espero 90 s por si hay imágenes.");
    await sleep(90 * 1000);
    return true;
  }
  const start = Date.now();
  while (Date.now() - start < WAIT_MAX_MS) {
    const results = await Promise.all(sample.map((f) => liveMatches(f, localSha).catch(() => false)));
    if (results.every(Boolean)) {
      log(`La web ya sirve la versión nueva (${sample.join(", ")}).`);
      return true;
    }
    await sleep(WAIT_STEP_MS);
  }
  return false;
}

// ---------- envío ----------
async function send(urls) {
  const keyFile = findKey();
  const key = keyFile.replace(".txt", "");
  const body = { host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: urls };
  log(`IndexNow: ${urls.length} URL de ${HOST}`);
  urls.forEach((u) => console.log("  - " + u));
  if (dry) {
    log("(modo --dry: no se ha enviado nada)");
    return 0;
  }
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
  log(`Respuesta: ${res.status} ${meaning[res.status] || ""} ${text}`.trim());
  return res.ok ? 0 : 1;
}

(async () => {
  const i = args.indexOf("--after-push");
  if (i >= 0) {
    const remoteSha = args[i + 1];
    const localSha = args[i + 2];
    if (!remoteSha || !localSha) {
      console.error("Uso: --after-push <sha_remoto> <sha_local>");
      process.exit(1);
    }
    const plan = planAfterPush(remoteSha, localSha);
    log(`Push detectado (${remoteSha.slice(0, 7)}..${localSha.slice(0, 7)}): ${plan.why}.`);
    if (!plan.urls.length) {
      log("Ninguna página cambia en este push: no hace falta avisar.");
      process.exit(0);
    }
    if (wait && !dry) {
      const ok = await waitForDeploy(plan.check, localSha);
      if (!ok) {
        log("La web no publicó la versión nueva en 8 minutos (¿falló el push o el despliegue?). No se avisa.");
        process.exit(1);
      }
    } else if (wait && dry) {
      log("(modo --dry: compruebo si la web ya sirve esta versión, sin esperar)");
      const results = await Promise.all(plan.check.slice(0, 4).map((f) => liveMatches(f, localSha).catch(() => false)));
      log("Coincide con la web publicada: " + (results.length ? results.every(Boolean) : "nada que comprobar"));
    }
    process.exit(await send(plan.urls));
  }

  const explicit = args.filter((a) => a.startsWith("http"));
  const urls = explicit.length ? explicit : sitemapPages().map((p) => p.url);
  if (!urls.length) {
    console.error("No hay URL que enviar.");
    process.exit(1);
  }
  process.exit(await send(urls));
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
