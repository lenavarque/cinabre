// Export : une page HTML unique, en lecture seule, qui s'ouvre sans serveur (double-clic sur le fichier).
// Elle réunit la page, le style, les modules JavaScript et les données affichées (modifications en cours comprises).
// Les modules sont inclus tels quels, en data: URL, via une « import map » : le code est le même que celui de l'application.
// Seule la langue actuelle est exportée : le Guide et la table de l'autre langue sont remplacés par des modules vides.

import { etat } from "./donnees.js";
import { t, anglais, langue } from "./langue.js";

const MODULES = ["langue", "anglais", "guide-fr", "guide-en", "donnees", "popup", "frise", "stats", "jeu", "gestion", "aide", "export", "app"];
const VIDES = anglais
  ? { "guide-fr": "export const GUIDE = [], LECTURE = [];" }
  : { "guide-en": "export const GUIDE = [], LECTURE = [];", anglais: "export const TEXTES = {};" };

// Texte → base64 (UTF-8)
function base64(texte) {
  return base64Octets(new TextEncoder().encode(texte));
}
function base64Octets(octets) {
  let s = "";
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(s);
}

async function lire(chemin) {
  const rep = await fetch(chemin, { cache: "no-store" });
  if (!rep.ok) throw new Error(t("Impossible de lire {chemin} (le serveur a répondu {n}).", { chemin, n: rep.status }));
  return rep.text();
}

// Polices : chaque fichier .woff2 de polices.css est inclus dans la page (data: URL), pour un rendu identique hors ligne
async function policesIncluses() {
  const css = await lire("css/polices.css");
  const urls = [...new Set(css.match(/\.\.\/polices\/[\w.-]+\.woff2/g) || [])];
  const donnees = await Promise.all(urls.map(async (u) => {
    const rep = await fetch(u.slice(3), { cache: "no-store" });
    if (!rep.ok) throw new Error(t("Impossible de lire {chemin} (le serveur a répondu {n}).", { chemin: u.slice(3), n: rep.status }));
    return `data:font/woff2;base64,${base64Octets(new Uint8Array(await rep.arrayBuffer()))}`;
  }));
  return urls.reduce((c, u, i) => c.split(u).join(donnees[i]), css);
}

// Remplace un passage qui doit exister une fois exactement dans la page
function remplacer(page, avant, apres) {
  if (page.split(avant).length !== 2) throw new Error(t("Page d'origine inattendue : « {texte} » introuvable.", { texte: avant }));
  return page.replace(avant, () => apres);
}

// Nom de fichier tiré du titre : sans accents ni caractères spéciaux
export function nomFichier(titre) {
  const base = (titre || t("frise")).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "frise";
  return `${base}.html`;
}

// Construit la page et la propose au téléchargement ; renvoie le nom du fichier
export async function exporterHtml(titre) {
  const [page, polices, css, ...codes] = await Promise.all([
    lire("index.html"), policesIncluses(), lire("css/style.css"), ...MODULES.map((m) => (m in VIDES ? VIDES[m] : lire(`js/${m}.js`))),
  ]);
  // Les imports relatifs (« ./frise.js ») deviennent des noms nus, résolus par l'import map
  const carte = { imports: {} };
  MODULES.forEach((m, i) => {
    const code = codes[i].replace(/from "\.\/([\w-]+)\.js"/g, 'from "cinabre/$1.js"');
    carte.imports[`cinabre/${m}.js`] = `data:text/javascript;base64,${base64(code)}`;
  });
  const { source, ...reste } = etat.donnees;      // source : le fichier d'origine d'un import, sans intérêt pour qui lit la page
  const donnees = { ...reste, titre };
  // « < » échappé : le JSON ne peut pas fermer la balise <script> qui le contient
  const json = JSON.stringify(donnees).replace(/</g, "\\u003c");
  const jour = new Date().toISOString().slice(0, 10);

  let html = page;
  html = remplacer(html, `<link rel="stylesheet" href="css/polices.css">`, `<style>\n${polices}\n</style>`);
  html = remplacer(html, `<link rel="stylesheet" href="css/style.css">`,`<style>\n${css}\n</style>`);
  html = remplacer(html, `<script type="module" src="js/app.js"></script>`,
    `<script type="application/json" id="cinabre-donnees" data-exporte-le="${jour}" data-langue="${langue}">${json}</script>
  <script type="importmap">${JSON.stringify(carte)}</script>
  <script type="module">import "cinabre/app.js";</script>`);
  html = remplacer(html, "<body>", `<body class="lecture-seule">`);
  html = remplacer(html, `<html lang="fr">`, `<html lang="${langue}">`);

  const nom = nomFichier(titre);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nom });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return nom;
}
