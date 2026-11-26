---
name: publicar
description: Publica alexcatto.com. Revisa el sitio, sube la versión de CSS/JS si hace falta, actualiza el lastmod del sitemap, hace push a main y deja que IndexNow avise a Bing. Úsala cuando Alex pida publicar, subir la web o hacer push.
disable-model-invocation: true
---

# Publicar alexcatto.com

Alex ha invocado `/publicar`: eso cuenta como su petición de **hacer push a `main`**. No hace falta volver a preguntar si subir, pero sí hay que enseñarle lo que se sube. Responde siempre en español.

La web es estática y se sirve con GitHub Pages desde `main` de `a-c-dev/portfolio`. Tarda 1–2 minutos en actualizarse y sirve los CSS/JS con 10 minutos de caché.

## Pasos

1. **Estado.** `git status --short` y `git log origin/main..HEAD --oneline`.
   - Si hay cambios sin commitear, enséñalos y pregunta si los incluye. Si dice que sí, haz commit con un mensaje claro en español y termina con la línea `Co-Authored-By` que indique el sistema.
   - Si no hay nada que subir (`git log origin/main..HEAD` vacío), dilo y para.
2. **Revisión.** `node tools/check-site.js`. Debe acabar en "Todo correcto". Si falla, arregla el problema o cuéntaselo a Alex antes de seguir. No publiques con enlaces rotos.
3. **Versión de CSS/JS.** Mira si algún archivo de `assets/` cambia en lo que se va a subir: `git diff --name-only origin/main..HEAD -- assets`.
   - Si hay CSS o JS cambiado, ejecuta `node tools/bump-version.js` y haz commit del cambio. Sin esto, los visitantes pueden ver estilos antiguos mezclados con HTML nuevo.
4. **Sitemap.** Si cambia el contenido de alguna página (`*.html`), pon su `<lastmod>` en `sitemap.xml` a la fecha de hoy (`YYYY-MM-DD`). Solo las páginas que hayan cambiado de verdad: un `lastmod` que no refleja cambios reales hace que Google lo ignore. Haz commit.
5. **Push.** `git push origin main`.
   - El hook `pre-push` (`tools/githooks/pre-push`) lanza solo, en segundo plano, `tools/indexnow.js --after-push ... --wait`: espera a que GitHub Pages publique la versión nueva y entonces avisa a IndexNow (Bing, Yandex…). No bloquea el push.
   - Si el hook no está instalado en esta copia del repo (`.git/hooks/pre-push` no existe), ejecuta `node tools/install-hooks.js` o, como alternativa puntual, `node tools/indexnow.js` a mano después de comprobar que la web ya está actualizada.
6. **Comprobación.** Espera unos 90 segundos y verifica en la web real, con un parámetro para saltarte la caché (`?nc=$(date +%s)`):
   - que `https://alexcatto.com/` responde 200 y trae la versión nueva de los estilos (`theme.css?v=...`);
   - que un cambio concreto de este push ya está publicado (busca una frase o clase nueva).
   Luego mira el registro del aviso: `tail -n 15 tools/.indexnow.log`. Debe aparecer "La web ya sirve la versión nueva" y "Respuesta: 202" (o 200).
7. **Resumen para Alex.** Qué commits se han subido, qué comprobaste en la web real, y el resultado del aviso a IndexNow. Si algo no se pudo comprobar, dilo claramente.

## Reglas

- Nunca uses `--force`, `--no-verify` ni saltes el hook. Para un push concreto sin aviso: `SKIP_INDEXNOW=1 git push origin main`.
- IndexNow solo cubre Bing y similares. Google no lo usa: para Google vale el sitemap ya enviado en Search Console.
- Las páginas de servicio se generan con un script que no está en el repo; edita los HTML resultantes solo si Alex te lo pide expresamente.
- La carpeta `google-business-fotos/` está excluida de git a propósito: no la añadas.
