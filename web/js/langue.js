// Langue de l'interface : français ou anglais. Les données (dates.json) ne sont jamais traduites.
// Les textes sont écrits en français dans le code et passent par t() ; la table anglaise est dans anglais.js.
// Une page exportée garde la langue du moment de l'export (attribut data-langue), sans choix possible.

import { TEXTES } from "./anglais.js";

export const LANGUES = { fr: "Français", en: "English" };

const EXPORT = document.getElementById("cinabre-donnees");
export const langue = EXPORT?.dataset.langue || lireLangue();
export const anglais = langue === "en";
document.documentElement.lang = langue;

// Choix retenu, sinon la langue du navigateur : français s'il est en français, anglais sinon
function lireLangue() {
  try { const l = localStorage.getItem("langue"); if (l in LANGUES) return l; } catch {}
  return (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
}

// Retenue pour les prochaines visites ; la page est rechargée par app.js
export function choisirLangue(l) {
  try { localStorage.setItem("langue", l); } catch {}
}

// Texte traduit ; {nom} est remplacé par vars.nom. Un texte absent de la table reste en français (et est signalé une fois).
const signales = new Set();
export function t(texte, vars) {
  if (!texte) return texte ?? "";
  let s = texte;
  if (anglais) {
    s = TEXTES[texte];
    if (s == null) {
      s = texte;
      if (!signales.has(texte)) { signales.add(texte); console.warn("Traduction manquante :", texte); }
    }
  }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
}

// Singulier ou pluriel selon n (français : 0 et 1 au singulier ; anglais : 1 seul) ; {n} est le nombre mis en forme
export function tn(n, un, plusieurs, vars = {}) {
  const pluriel = anglais ? n !== 1 : n > 1;
  return t(pluriel ? plusieurs : un, { n: nombre(n), ...vars });
}

export function nombre(n) {
  return anglais ? n.toLocaleString("en-US") : n.toLocaleString("fr-FR").replace(/ | /g, " ");
}

// Date du jour d'un export (AAAA-MM-JJ) : 23/09/2026 ou 2026-09-23
export const dateCourte = (iso) => (anglais ? iso : iso.split("-").reverse().join("/"));

// Textes fixes de index.html : data-t (contenu), data-t-title, data-t-placeholder, data-t-aria
export function traduirePage(racine = document) {
  if (!anglais) return;
  racine.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.textContent.trim())));
  for (const [marque, attr] of [["data-t-title", "title"], ["data-t-placeholder", "placeholder"], ["data-t-aria", "aria-label"]])
    racine.querySelectorAll(`[${marque}]`).forEach((el) => el.setAttribute(attr, t(el.getAttribute(attr))));
}
