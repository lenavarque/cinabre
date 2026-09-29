// Onglet Jeu (affiché seulement si reglages.jeu, dans Données, Réglages) : « la frise qui se construit ».
// Un premier évènement est posé, daté ; chaque nouvel évènement doit être glissé au bon endroit parmi ceux déjà posés.
// Une erreur coûte une vie (l'évènement est alors posé à sa vraie place) ; la partie s'arrête sans vie ou quand tout est posé.
// Les lieux et les thèmes en jeu sont ceux du filtre commun (panneau de gauche) ; la plage d'années et l'affichage
// des descriptions se choisissent ici. Pas de score retenu : seulement le résultat de la partie en cours.

import {
  etat, index, passeFiltre, filtreActif, parserAnnee, formatAnnee, echapper, dateAffichee, couleurDe, rayures,
  groupe, instantDe, normaliser, nomAffiche, SANS_GROUPE, SANS_THEME,
} from "./donnees.js";
import { t, tn } from "./langue.js";
import { fermer as fermerPopup } from "./popup.js";

const VIES = 3;
let app, racine, entete, zone, aRefaire = false;
let options = { debut: "", fin: "", descriptions: false };
let partie = null;   // { pioche, placees, courante, vies, bien, dernier: { el, ok }, curseur, finie }
const visible = () => racine && racine.classList.contains("active");

export function init(el, application) {
  app = application;
  racine = el;
  try { options = { ...options, ...JSON.parse(localStorage.getItem("jeu.options") || "{}") }; } catch {}
  racine.innerHTML = `
    <div class="stats-outils">
      <h2 class="stats-titre">${t("La frise qui se construit")}</h2>
      <div class="stats-note jeu-etat"></div>
    </div>
    <div class="jeu-zone"></div>`;
  entete = racine.querySelector(".jeu-etat");
  zone = racine.querySelector(".jeu-zone");
  zone.addEventListener("click", clic);
  zone.addEventListener("mousemove", () => zone.classList.remove("clavier"));
  zone.addEventListener("change", changer);
  zone.addEventListener("input", (e) => { if (e.target.name === "debut" || e.target.name === "fin") majCompte(); });
  document.addEventListener("keydown", clavier);
}

export function afficher() { if (aRefaire || !zone.innerHTML) { aRefaire = false; rendre(); } }
// Les données ou le filtre changent : l'accueil se met à jour ; une partie en cours continue avec ses évènements
export function majDonnees() { if (!racine) return; if (partie && !partie.finie) return; if (visible()) rendre(); else aRefaire = true; }
export function majFiltre() { majDonnees(); }

// ─── Évènements en jeu ───

function candidats() {
  const debut = parserAnnee(options.debut), fin = parserAnnee(options.fin);
  const vus = new Set(), liste = [];
  for (const { ev, date } of index.evenements.values()) {
    if (date.annee == null || !ev.label) continue;
    if (!passeFiltre(ev.groupes, ev.themes)) continue;
    if (debut != null && date.annee < debut) continue;
    if (fin != null && date.annee > fin) continue;
    const cle = normaliser(ev.label) + "|" + instantDe(date);          // doublons exacts : un seul
    if (vus.has(cle)) continue;
    vus.add(cle);
    liste.push({ ev, date, instant: instantDe(date) });
  }
  return liste;
}

function melanger(liste) {
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  return liste;
}

// Tant qu'un évènement n'est pas posé, les nombres de son nom et de sa description sont masqués (ils trahiraient la date)
// Ils sont « caviardés » : un pavé plein, de la longueur du texte caché (le thème exclut le flou).
// Sont cachés : les dates avec un mois (« 14 juillet 1789 », « July 1789 »), les siècles et millénaires (« IVe siècle av. J.-C. »),
// et tout nombre d'au moins deux chiffres avec son ère ou son unité (« - 2 334 », « 45k », « 2.9 Ga », « 476 apr. J.-C. »).
const MOIS = "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre"
  + "|january|february|march|april|may|june|july|august|september|october|november|december";
const ERE = String.raw`(?:\s?(?:av\.?|apr\.?|avant|après)\s?J\.?-?\s?C\.?|\s?(?:BCE|BC|AD|CE)\b|\s?(?:ka|k|Ma|Ga)\b)?`;
const NOMBRE = String.raw`(?:-\s?)?\d[\d  .,]*\d`;
const DATES = new RegExp([
  String.raw`(?:(?:1er|\d{1,2})\s)?(?:${MOIS})\s(?:de l'an\s)?(?:-\s?)?\d(?:[\d  ]*\d)?${ERE}`,
  String.raw`\b[IVXLC]+(?:e|er|ème|è|re)\s(?:siècle|millénaire)${ERE}`,
  String.raw`\b(?:\d{1,2}(?:st|nd|rd|th)|[IVXLC]+(?:st|nd|rd|th)?)\s(?:century|millennium)${ERE}`,
  NOMBRE + ERE,
].join("|"), "giu");
function masquer(s) {
  let html = "", k = 0;
  for (const m of s.matchAll(DATES)) {
    if (m[0].replace(/\D/g, "").length < 2 && !/si[eè]cle|mill[eé]nai|century|millennium/i.test(m[0])) continue;   // « 3 », « 7 » : gardés
    html += echapper(s.slice(k, m.index)) + `<span class="jeu-cache" title="${t("Date masquée")}">${echapper(m[0])}</span>`;
    k = m.index + m[0].length;
  }
  return html + echapper(s.slice(k));
}

// ─── Accueil : réglages de la partie ───

function rendre() {
  fermerPopup();
  if (partie) return rendrePartie();
  const tous = candidats();
  entete.textContent = "";
  const noms = (filtre, sans, liste) => {
    const choisis = liste.filter((n) => filtre.has(n)).map((n) => echapper(nomAffiche(n)));
    if (filtre.has(sans)) choisis.push(echapper(nomAffiche(sans)));
    return filtre.size ? choisis.join(", ") || "—" : t("tous");
  };
  const lieux = noms(etat.filtre, SANS_GROUPE, index.groupes.map((g) => g.nom));
  const themes = noms(etat.filtreThemes, SANS_THEME, index.themes);
  zone.innerHTML = `<div class="jeu-accueil">
    <p class="jeu-regle">${t("Un premier évènement est posé, avec sa date. Les suivants arrivent un par un, sans date : place chacun au bon endroit dans la frise qui se construit. Une erreur coûte une vie ({n} en tout) ; l'évènement est alors posé à sa vraie place.", { n: VIES })}</p>
    <div class="jeu-reglages">
      <div class="jeu-ligne"><span class="jeu-cle">${t("Lieux")}</span><span>${lieux}</span></div>
      <div class="jeu-ligne"><span class="jeu-cle">${t("Thèmes")}</span><span>${themes}</span></div>
      <p class="dn-aide">${t("Les lieux et les thèmes en jeu sont ceux du filtre, dans le panneau de gauche.")}</p>
      <div class="jeu-ligne"><span class="jeu-cle">${t("Années")}</span>
        <span class="dn-plage"><label>${t("De")} <input type="text" name="debut" value="${echapper(options.debut)}" placeholder="${t("le début")}" spellcheck="false" autocomplete="off"></label>
        <label>${t("à")} <input type="text" name="fin" value="${echapper(options.fin)}" placeholder="${t("la fin")}" spellcheck="false" autocomplete="off"></label></span></div>
      <label class="jeu-ligne jeu-case"><input type="checkbox" name="descriptions"${options.descriptions ? " checked" : ""}> ${t("Montrer les descriptions")}</label>
    </div>
    <p class="jeu-compte"></p>
    <button class="bouton principal" data-jeu="commencer">${t("Commencer")}</button>
  </div>`;
  majCompte(tous);
}

function majCompte(liste) {
  const el = zone.querySelector(".jeu-compte");
  if (!el) return;
  const debut = zone.querySelector('[name="debut"]').value, fin = zone.querySelector('[name="fin"]').value;
  const erreur = (debut.trim() && parserAnnee(debut) == null) || (fin.trim() && parserAnnee(fin) == null);
  if (!liste) { options.debut = debut; options.fin = fin; liste = erreur ? [] : candidats(); }
  const n = liste.length;
  el.className = "jeu-compte" + (erreur || n < 2 ? " erreur" : "");
  el.textContent = erreur ? t("Année non comprise : écris par exemple « - 500 », « 1453 » ou « 45k ».")
    : n < 2 ? t(filtreActif() ? "Pas assez d'évènements avec ce filtre et ces années : élargis-les." : "Pas assez d'évènements datés dans ces années.")
    : tn(n, "{n} évènement en jeu", "{n} évènements en jeu");
  zone.querySelector('[data-jeu="commencer"]').disabled = !!erreur || n < 2;
}

function changer(e) {
  if (e.target.name === "descriptions") options.descriptions = e.target.checked;
  if (e.target.name === "debut" || e.target.name === "fin") {
    const v = e.target.value.trim(), a = parserAnnee(v);
    if (a != null) e.target.value = formatAnnee(a);                   // écriture habituelle
    options[e.target.name] = e.target.value.trim();
    majCompte();
  }
  try { localStorage.setItem("jeu.options", JSON.stringify(options)); } catch {}
  if (partie && e.target.name === "descriptions") rendrePartie();
}

// ─── Partie ───

function commencer() {
  const pioche = melanger(candidats());
  if (pioche.length < 2) return rendre();
  const premier = pioche.pop();
  partie = { pioche, placees: [premier], courante: pioche.pop(), vies: VIES, bien: 0, erreurs: 0, dernier: null, finie: false };
  partie.curseur = 1;
  rendrePartie();
}

// L'emplacement k (entre la carte k-1 et la carte k) est juste si l'évènement n'est ni avant la précédente ni après la suivante
function juste(k, x) {
  const p = partie.placees;
  return (k === 0 || p[k - 1].instant <= x.instant) && (k === p.length || x.instant <= p[k].instant);
}

function placer(k) {
  const x = partie.courante;
  if (!x || partie.finie) return;
  const ok = juste(k, x);
  let i = k;
  if (!ok) {
    i = partie.placees.findIndex((p) => p.instant > x.instant);
    if (i < 0) i = partie.placees.length;
    partie.vies--;
    partie.erreurs++;
  } else partie.bien++;
  partie.placees.splice(i, 0, x);
  partie.dernier = { el: x, ok, choix: k };
  partie.courante = partie.vies > 0 ? partie.pioche.pop() ?? null : null;
  partie.finie = !partie.courante;
  partie.curseur = Math.min(i + 1, partie.placees.length);
  rendrePartie();
  zone.querySelector(".jeu-carte.dernier")?.scrollIntoView({ block: "nearest" });
}

function htmlGroupes(ev) {
  const gs = ev.groupes?.length ? ev.groupes : [SANS_GROUPE];
  return gs.map((g) => `<span class="puce-g" style="--ct:${groupe(g).affichage}"><i></i>${echapper(nomAffiche(g))}</span>`).join("");
}

function htmlCourante(x) {
  const fond = rayures(x.ev.groupes);
  return `<div class="jeu-courante">
    <div class="jeu-titre-carte">${t("À placer")}</div>
    <div class="jeu-nom${fond ? " multi" : ""}" style="--ct:${couleurDe(x.ev.groupes)}${fond ? `;--rayures:${fond}` : ""}">${x.ev.important ? "★ " : ""}${masquer(x.ev.label)}</div>
    <div class="jeu-groupes">${htmlGroupes(x.ev)}</div>
    ${options.descriptions && x.ev.comment ? `<p class="jeu-desc">${masquer(x.ev.comment)}</p>` : ""}
  </div>`;
}

function rendrePartie() {
  fermerPopup();
  const p = partie;
  const coeurs = "♥".repeat(Math.max(0, p.vies)) + `<span class="jeu-perdue">${"♥".repeat(VIES - Math.max(0, p.vies))}</span>`;
  entete.innerHTML = `<span class="jeu-vies" title="${t("Vies restantes")}">${coeurs}</span>
    ${tn(p.bien, "{n} bien placé", "{n} bien placés")} · ${tn(p.pioche.length + (p.courante ? 1 : 0), "{n} restant", "{n} restants")}`;
  // identifiants d'exécution des évènements, pour la popup des cartes posées
  const ids = new Map([...index.evenements].map(([id, { ev }]) => [ev, id]));
  let liste = "";
  const fente = (k) => p.finie ? "" : `<button class="jeu-fente${k === p.curseur ? " curseur" : ""}" data-fente="${k}"><span>${t("Placer ici")}</span></button>`;
  p.placees.forEach((x, k) => {
    liste += fente(k);
    const d = p.dernier?.el === x ? p.dernier : null;
    const fond = rayures(x.ev.groupes);
    const id = ids.get(x.ev);
    liste += `<div class="jeu-carte${d ? " dernier " + (d.ok ? "ok" : "rate") : ""}">
      <span class="jeu-date">${echapper(dateAffichee(x.date.date, x.ev.approx))}</span>
      <span class="ev${fond ? " multi" : ""}${x.ev.comment ? " note" : ""}"${id ? ` data-pop="${id}"` : ""} style="--ct:${couleurDe(x.ev.groupes)}${fond ? `;--rayures:${fond};--rayures-survol:${rayures(x.ev.groupes, 24)}` : ""}">${x.ev.important ? `<span class="etoile">★</span>` : ""}${echapper(x.ev.label)}</span>
      ${d ? `<span class="jeu-verdict">${d.ok ? t("✓ Bien placé") : t("✗ Mal placé : le voici à sa place")}</span>` : ""}
    </div>`;
  });
  liste += fente(p.placees.length);

  const fin = p.finie ? `<div class="jeu-fin">
      <p><b>${p.vies > 0 ? t("Tout est placé !") : t("Partie terminée.")}</b>
      ${tn(p.bien, "{n} évènement bien placé", "{n} évènements bien placés")}${p.erreurs ? `, ${tn(p.erreurs, "{n} erreur", "{n} erreurs")}` : ""}.</p>
      <button class="bouton principal" data-jeu="commencer">${t("Rejouer")}</button>
      <button class="bouton discret" data-jeu="accueil">${t("Changer les réglages")}</button>
    </div>` : "";
  zone.innerHTML = `<div class="jeu-partie">
    ${p.courante ? htmlCourante(p.courante) : fin}
    <div class="jeu-frise">${liste}</div>
    ${p.finie ? "" : `<div class="jeu-pied"><label class="jeu-case"><input type="checkbox" name="descriptions"${options.descriptions ? " checked" : ""}> ${t("Montrer les descriptions")}</label>
      <button class="bouton discret petit" data-jeu="accueil">${t("Arrêter la partie")}</button></div>`}
  </div>`;
}

function clic(e) {
  const f = e.target.closest("[data-fente]");
  if (f) return placer(Number(f.dataset.fente));
  const b = e.target.closest("[data-jeu]");
  if (!b) return;
  if (b.dataset.jeu === "commencer") commencer();
  if (b.dataset.jeu === "accueil") { partie = null; rendre(); }
}

// Clavier pendant une partie : ↑ ↓ choisissent l'emplacement, Entrée y pose l'évènement
function clavier(e) {
  if (!visible() || !partie || partie.finie || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest?.("input, textarea, select")) return;
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    if (!zone.classList.contains("clavier")) zone.classList.add("clavier");   // première flèche : montre l'emplacement actuel
    else partie.curseur = Math.max(0, Math.min(partie.placees.length, partie.curseur + (e.key === "ArrowDown" ? 1 : -1)));
    zone.querySelectorAll(".jeu-fente").forEach((el) => el.classList.toggle("curseur", Number(el.dataset.fente) === partie.curseur));
    zone.querySelector(".jeu-fente.curseur")?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter" && !e.target.closest?.("button") && zone.classList.contains("clavier")) {
    e.preventDefault();
    placer(partie.curseur);
  }
}
