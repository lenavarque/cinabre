// Infobulle affichée au survol de tout élément portant data-pop="<identifiant>".
// Elle disparaît dès que la souris quitte l'élément. Contenu fourni par un « résolveur ».
// Après 3 s de survol, ou sur un double-clic, elle s'épingle : on peut y amener la souris
// (liens cliquables, texte qu'on fait défiler) et elle s'agrandit par le bas avec les sources.

import { echapper } from "./donnees.js";
import { t, tn } from "./langue.js";

const DELAI_OUVERTURE = 140;   // ms avant la première ouverture
const DELAI_CHAUD = 400;       // ms pendant lesquelles on passe d'un élément à l'autre sans délai
const DELAI_EPINGLE = 3000;    // ms de survol avant que la popup s'épingle
const DELAI_TRAVERSEE = 300;   // ms laissées pour aller de l'élément à la popup épinglée
const TIRET = 10;              // px : longueur de chaque tiret du liseré multicolore

let popup, resolveur, cible = null, contenu = null, epinglee = false, fermeeA = 0, souris = { x: 0, y: 0 };
let minuterie = null, minuterieEpingle = null, minuterieFermeture = null;

export function initPopup(fn) {
  resolveur = fn;
  popup = document.getElementById("popup");
  document.addEventListener("mouseover", survol);
  document.addEventListener("mouseout", sortie);
  document.addEventListener("dblclick", (e) => {
    const el = e.target.closest("[data-pop]");
    if (!el || popup.contains(el)) return;
    e.preventDefault();
    if (el !== cible || !popup.classList.contains("visible")) { clearTimeout(minuterie); cible = el; ouvrir(el); }
    epingler();
  });
  document.addEventListener("scroll", (e) => { if (!popup.contains(e.target)) fermer(); }, true);
  document.addEventListener("mousedown", (e) => { if (epinglee && !popup.contains(e.target)) fermer(); });
  window.addEventListener("blur", fermer);
}

const dansZone = (n) => n && ((cible && cible.contains(n)) || (epinglee && popup.contains(n)));

function survol(e) {
  souris = { x: e.clientX, y: e.clientY };
  if (dansZone(e.target)) { clearTimeout(minuterieFermeture); return; }   // retour sur l'élément ou dans la popup épinglée
  const el = e.target.closest("[data-pop]");
  if (!el || el === cible || epinglee) return;
  clearTimeout(minuterie);
  clearTimeout(minuterieEpingle);
  cible = el;
  const chaud = popup.classList.contains("visible") || performance.now() - fermeeA < DELAI_CHAUD;
  minuterie = setTimeout(() => ouvrir(el), chaud ? 0 : DELAI_OUVERTURE);
}

function sortie(e) {
  if (!cible) return clearTimeout(minuterie);
  if (dansZone(e.relatedTarget)) return;
  if (epinglee) {                                    // on laisse le temps de rejoindre la popup
    clearTimeout(minuterieFermeture);
    minuterieFermeture = setTimeout(fermer, DELAI_TRAVERSEE);
  } else if (e.target.closest("[data-pop]") === cible) fermer();
}

export function fermer() {
  clearTimeout(minuterie);
  clearTimeout(minuterieEpingle);
  clearTimeout(minuterieFermeture);
  if (popup.classList.contains("visible")) fermeeA = performance.now();
  popup.classList.remove("visible", "epinglee");
  epinglee = false;
  cible = null;
}

function ouvrir(el) {
  if (el !== cible || !el.isConnected) return;
  contenu = resolveur(el.dataset.pop, el);
  if (!contenu) return;
  popup.style.setProperty("--ct", contenu.couleur || "var(--texte-3)");
  // plusieurs groupes : liseré en tirets successifs, un par groupe, qui forment une ligne continue
  const cs = contenu.couleurs || [];
  if (cs.length > 1)
    popup.style.setProperty("--lisere", `repeating-linear-gradient(to bottom, ${cs.map((c, i) => `${c} ${i * TIRET}px ${(i + 1) * TIRET}px`).join(", ")})`);
  else popup.style.removeProperty("--lisere");
  popup.innerHTML = contenu.html;
  popup.classList.remove("epinglee");
  epinglee = false;
  placer(el);
  popup.classList.add("visible");
  clearTimeout(minuterieEpingle);
  minuterieEpingle = setTimeout(epingler, DELAI_EPINGLE);
}

// La popup devient interactive et s'agrandit par le bas avec les détails (sources)
function epingler() {
  if (epinglee || !cible || !popup.classList.contains("visible")) return;
  epinglee = true;
  if (contenu?.details) popup.insertAdjacentHTML("beforeend", contenu.details);
  popup.querySelector(".pop-indice")?.remove();
  popup.classList.add("epinglee");
  placer(cible);
}

function placer(el) {
  popup.classList.add("mesure");
  const texte = popup.querySelector(".pop-texte");   // description trop longue : fondu en bas (sauf épinglée : on la fait défiler)
  if (texte) texte.classList.toggle("coupe", !epinglee && texte.scrollHeight > texte.clientHeight + 4);
  const r = el.getBoundingClientRect();
  const { width: l, height: h } = popup.getBoundingClientRect();
  const marge = 8, ecart = 6;
  let x, y;
  if (contenu.ancrage === "droite") {          // panneau de gauche : à droite de l'élément
    x = r.right + 10;
    y = r.top - 8;
  } else if (contenu.ancrage === "souris") {   // éléments verticaux (barres, bandes) : à côté du pointeur
    x = souris.x + 14 + l > innerWidth - marge ? souris.x - l - 14 : souris.x + 14;
    y = souris.y - 18;
  } else {                                    // sinon sous l'élément, ou au-dessus s'il manque de place
    x = r.left;
    y = r.bottom + ecart;
    if (y + h > innerHeight - marge) y = r.top - h - ecart;
  }
  x = Math.max(marge, Math.min(x, innerWidth - l - marge));
  y = Math.max(marge, Math.min(y, innerHeight - h - marge));
  popup.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  popup.classList.remove("mesure");
}

// ─── Gabarit commun ───

// groupe : un nom, ou une liste de { nom, couleur } (chaque groupe dans sa couleur)
// sources : nombre de sources, annoncé discrètement tant que la popup n'est pas épinglée
// themes : liste de thèmes, en petites étiquettes neutres sous le titre
// exemples : liste de { date, texte }, affichée sous la description
export function gabarit({ groupe, date, titre, sousTitre, badges = [], texte, pied, sources = 0, themes = [], exemples = [] }) {
  const groupes = Array.isArray(groupe) ? groupe : groupe ? [{ nom: groupe }] : [];
  return `
    <div class="pop-entete">
      ${groupes.length ? `<span class="pop-groupes">${groupes.map((g) =>
        `<span class="pop-groupe"${g.couleur ? ` style="--ct:${g.couleur}"` : ""}><i></i>${echapper(g.nom)}</span>`).join("")}</span>` : ""}
      ${date ? `<span class="pop-date">${echapper(date)}</span>` : ""}
    </div>
    <div class="pop-titre">${echapper(titre)}</div>
    ${sousTitre ? `<div class="pop-sous-titre">${echapper(sousTitre)}</div>` : ""}
    ${themes?.length ? `<div class="pop-themes">${themes.map((t) => `<span class="pop-theme">${echapper(t)}</span>`).join("")}</div>` : ""}
    ${badges.length ? `<div class="pop-badges">${badges.map((b) => `<span class="badge ${b.classe || ""}">${echapper(b.texte)}</span>`).join("")}</div>` : ""}
    ${texte ? `<div class="pop-texte">${echapper(texte)}</div>` : ""}
    ${exemples.length ? `<div class="pop-exemples"><div class="pop-exemples-titre">${t("Exemples")}</div>${exemples.map((x) =>
      `<div class="pop-exemple"><span class="pop-exemple-date">${echapper(x.date)}</span><span>${echapper(x.texte)}</span></div>`).join("")}</div>` : ""}
    ${pied ? `<div class="pop-pied">${echapper(pied)}</div>` : ""}
    ${sources ? `<div class="pop-indice">${tn(sources, "{n} source", "{n} sources")}</div>` : ""}`;
}

// Détails affichés quand la popup s'épingle : les sources (titre, lien, citation)
export function detailsSources(sources) {
  if (!sources || !sources.length) return "";
  const domaine = (lien) => { try { return new URL(lien).hostname.replace(/^www\./, ""); } catch { return lien; } };
  return `<div class="pop-sources"><div class="pop-sources-titre">${t("Sources")}</div>${sources.map((s) => {
    const titre = s.titre || (s.lien ? domaine(s.lien) : "");
    const entete = s.lien
      ? `<a href="${echapper(s.lien)}" target="_blank" rel="noopener noreferrer">${echapper(titre)}</a>${s.titre ? ` <span class="pop-domaine">${echapper(domaine(s.lien))}</span>` : ""}`
      : titre ? `<span class="pop-source-titre">${echapper(titre)}</span>` : "";
    return `<div class="pop-source">${entete}${s.citation ? `<blockquote>${echapper(s.citation)}</blockquote>` : ""}</div>`;
  }).join("")}</div>`;
}
