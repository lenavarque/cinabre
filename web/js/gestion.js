// Onglet Données : consulter et modifier les évènements, les périodes et les groupes.
// Tables denses à gauche ; un clic sur une ligne ouvre son formulaire dans le panneau de droite.
// Toute modification passe par modifier() (annulable avec Ctrl+Z) ; l'enregistrement reste explicite.
// Page exportée (LECTURE_SEULE) : tout se consulte (tables, tri, recherche, formulaires), rien ne se modifie : les
// champs sont verrouillés (verrouiller()), les actions retirées, et les données elles-mêmes sont gelées (donnees.js).

import {
  etat, index, passeFiltre, filtreActif, groupe, echapper, normaliser, parserAnnee, formatAnnee,
  couleurAffichage, modifier, annuler, peutAnnuler, trierDates, lireApprox, dateAffichee, texteDate, SANS_GROUPE, SANS_THEME,
  parserDate, instant, instantDe, instantDebut, instantFin, formatDate, ecrireDate, regroupement,
  detail, DETAIL_DEFAUT, uneSeuleLigne, rappelContinu, jeuActif, plagesStats, plagesParDefaut, tranchesStats, MAX_TRANCHES,
  LECTURE_SEULE,
} from "./donnees.js";
import { t, tn, anglais } from "./langue.js";

const SOUS_ONGLETS = [
  ["evenements", "Évènements", "Ajouter un évènement"],
  ["periodes", "Périodes", "Ajouter une période"],
  ["groupes", "Groupes", "Ajouter un groupe"],
  ["themes", "Thèmes", "Ajouter un thème"],
  ["verifier", "À vérifier", null],
  ["reglages", "Réglages", null],
];
const DATES_EXEMPLES = anglais ? "1453, 14 July 1789, 2334 BC, 45k, 2.9 Ga" : "1453, 14 juillet 1789, - 2 334, 45k, 2.9 Ga";
const EXEMPLES = t("Exemples : {liste}", { liste: DATES_EXEMPLES });
const MOTS_VIDES = new Set(["debut", "epoque", "periode", "empire", "dynastie", "regne", "royaume",
  "start", "beginning", "end", "period", "dynasty", "reign", "kingdom", "era"]);

let app, racine, nav, zone, panneau, boutonAjouter, boutonLot, boutonAnnuler;
let courant = "evenements", recherche = "", lignes = [], aRefaire = false;
const tris = { evenements: { cle: "date", sens: 1 }, periodes: { cle: "debut", sens: 1 } };
// Élément ouvert dans le panneau : { type: "ev", ev, date } | { type: "p", p } | { type: "g", nom } | { type: "relier", ev, date }
// (ev, p ou nom à null : création)
let sel = null, modifiee = false, choixGroupes = [], choixThemes = [];
// Un élément existant s'enregistre au fil de la saisie (pas de bouton Valider) : texte après une courte pause,
// cases, listes et puces tout de suite. Un nouvel élément garde un bouton « Ajouter ».
const PAUSE_SAISIE = 600;       // ms
let minuterieSaisie = null, champSaisi = null;
// Échap ferme le détail mais garde la ligne sélectionnée (« retenue ») : ↑ ↓ déplacent la sélection, Entrée rouvre le détail
let retenu = null;
const direct = () => !!sel && ((sel.type === "ev" && sel.ev) || (sel.type === "p" && sel.p) || ((sel.type === "g" || sel.type === "t") && sel.nom));
// Modification en série : évènements ou périodes cochés dans la table (des objets, comme sel).
// Tant qu'il y en a, le panneau latéral est celui de la modification en série (sel.type === "serie").
const coches = new Set();
let derniereCoche = -1;         // dernière ligne touchée : c'est aussi le curseur du clavier en mode sélection
const visible = () => racine && racine.classList.contains("active");

export function init(el, application) {
  app = application;
  racine = el;
  try { courant = localStorage.getItem("donnees.onglet") || courant; } catch {}
  racine.innerHTML = `
    <div class="dn-outils">
      <nav class="dn-onglets"></nav>
      <div class="dn-actions">
        <button class="bouton" data-action="annuler" title="${t("Annuler la dernière modification (Ctrl+Z)")}">${t("Annuler")}</button>
        <button class="bouton" data-action="ajouter-lot" title="${t("Coller plusieurs évènements ou époques d'un coup, une ligne chacun")}">${t("Ajouter plusieurs")}</button>
        <button class="bouton" data-action="ajouter"></button>
      </div>
    </div>
    <div class="dn-corps">
      <div class="dn-table-zone"></div>
      <aside class="dn-panneau" aria-label="${t("Formulaire")}"></aside>
    </div>`;
  nav = racine.querySelector(".dn-onglets");
  zone = racine.querySelector(".dn-table-zone");
  panneau = racine.querySelector(".dn-panneau");
  boutonAjouter = racine.querySelector('[data-action="ajouter"]');
  boutonLot = racine.querySelector('[data-action="ajouter-lot"]');
  boutonAnnuler = racine.querySelector('[data-action="annuler"]');
  boutonLot.addEventListener("click", () => { if (quitterFormulaire()) ouvrir({ type: "lot" }); });

  nav.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sous]");
    if (b && quitterFormulaire()) { courant = b.dataset.sous; try { localStorage.setItem("donnees.onglet", courant); } catch {} fermer(); rendre(); }
  });
  boutonAnnuler.addEventListener("click", () => { clearTimeout(minuterieSaisie); minuterieSaisie = null; modifiee = false; annuler(); });
  boutonAjouter.addEventListener("click", () => {
    if (!quitterFormulaire()) return;
    if (courant === "evenements") ouvrir({ type: "ev", ev: null, date: null });
    else if (courant === "periodes") ouvrir({ type: "p", p: null });
    else if (courant === "groupes") ouvrir({ type: "g", nom: null });
    else if (courant === "themes") ouvrir({ type: "t", nom: null });
  });
  zone.addEventListener("click", clicTable);
  zone.addEventListener("change", (e) => {
    if (LECTURE_SEULE) return;
    if (e.target.name === "regroupement") changerReglages({ regroupement: e.target.value === "jour" ? null : e.target.value, detail: null });
    if (e.target.name === "detail") changerReglages({ detail: e.target.value === DETAIL_DEFAUT[regroupement()] ? null : e.target.value });
    if (e.target.name === "une_seule_ligne") changerReglages({ une_seule_ligne: e.target.value === "oui" ? true : null });
    if (e.target.name === "rappel") changerReglages({ rappel: e.target.value === "continu" ? "continu" : null });
    if (e.target.name === "jeu") changerReglages({ jeu: e.target.value === "oui" ? true : null });
    if (e.target.name?.startsWith("plage-")) lirePlages(e.target);
  });
  // Tab dans les plages : le réglage est redessiné au changement, on remet le curseur sur le champ suivant
  zone.addEventListener("keydown", (e) => { tabPlage = e.key === "Tab" && e.target.name?.startsWith("plage-") ? (e.shiftKey ? -1 : 1) : 0; });
  zone.addEventListener("mousedown", (e) => { if (e.shiftKey && e.target.closest("tr[data-i]")) e.preventDefault(); });
  document.addEventListener("keydown", clavierSelection);
  panneau.addEventListener("click", clicPanneau);
  panneau.addEventListener("input", saisiePanneau);
  panneau.addEventListener("change", saisiePanneau);
  panneau.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input[type=text]")) { e.preventDefault(); direct() ? appliquerMaintenant() : valider(); }
    if (e.key === "Escape") { e.stopPropagation(); fermerDetail(); }
  });
}

export function afficher() { aRefaire = false; rendre(); }
export function majDonnees() {
  if (!racine) return;
  elaguerCoches();
  if (sel && !existe(sel)) fermer();       // après « annuler », l'élément ouvert peut ne plus exister
  if (retenu && !existe(retenu)) retenu = null;
  if (visible()) rendre(); else aRefaire = true;
}
export function majFiltre() { majDonnees(); }
export function fermerMenus() { fermerDetail(); }
export function rechercher(q) {
  recherche = q || "";
  if (visible()) rendre();
}

function changerRecherche(q) {
  recherche = q;
  etat.recherche = q;
  const global = document.getElementById("recherche");
  if (global) global.value = q;
  rendre();
}

// Ouvre un élément venu d'un autre onglet (Alt + clic dans la frise)
export function ouvrirElement(item) {
  if (!quitterFormulaire()) return;
  courant = item.type === "p" ? "periodes" : "evenements";
  try { localStorage.setItem("donnees.onglet", courant); } catch {}
  rendre();
  if (!zone.querySelector("tr[data-i]") || !lignes.some((l) => l.ev === item.ev && l.p === item.p)) {
    if (recherche) changerRecherche("");     // la recherche masquait la ligne
  }
  ouvrir(item);
  zone.querySelector("tr.choisie")?.scrollIntoView({ block: "center" });
}

function existe(s) {
  const d = etat.donnees;
  if (s.type === "ev" || s.type === "relier") return !s.ev || (d.dates.includes(s.date) && s.date.evenements.includes(s.ev));
  if (s.type === "p") return !s.p || d.periodes.includes(s.p);
  if (s.type === "g") return !s.nom || s.nom in d.groupes;
  if (s.type === "t") return !s.nom || index.themes.includes(s.nom);
  if (s.type === "serie") return coches.size > 0;
  return s.type === "lot";
}

// ─── Outils ───

const compAnnee = (a, b) => (a == null) - (b == null) || (a ?? 0) - (b ?? 0);
const ordreGroupe = (gs) => (gs && gs.length ? Object.keys(etat.donnees.groupes).indexOf(gs[0]) : 999);

function puces(gs) {
  if (!gs || !gs.length) return `<span class="puce-g aucun" style="--ct:${groupe(SANS_GROUPE).affichage}"><i></i>${t(SANS_GROUPE)}</span>`;
  return gs.map((g) => `<span class="puce-g" style="--ct:${groupe(g).affichage}"><i></i>${echapper(g)}</span>`).join("");
}
const etiquette = (texte, classe = "") => `<span class="etiq ${classe}">${texte}</span>`;
const etiquetteSources = (o) => (o.sources?.length ? etiquette(tn(o.sources.length, "{n} source", "{n} sources")) : "");
// Texte échappé, avec la recherche surlignée (comparaison sans accents ni majuscules)
function surligner(texte) {
  const s = String(texte ?? ""), q = normaliser(recherche.trim());
  const n = normaliser(s);
  if (!q || n.length !== s.length) return echapper(s);   // longueurs différentes : pas de surlignage fiable
  let html = "", k = 0, i;
  while ((i = n.indexOf(q, k)) >= 0) {
    html += echapper(s.slice(k, i)) + `<mark>${echapper(s.slice(i, i + q.length))}</mark>`;
    k = i + q.length;
  }
  return html + echapper(s.slice(k));
}

// Début de la description, ou passage autour du premier résultat de la recherche
function extrait(s) {
  const t = (s || "").replace(/\s+/g, " ");
  const q = normaliser(recherche.trim());
  const i = q ? normaliser(t).indexOf(q) : -1;
  if (i > 60) return surligner("… " + t.slice(i - 50, i + 170));
  return surligner(t.slice(0, 220));
}

// Lit un texte de date : { texte, annee, mois, jour, ok, inst, instFin } (précise à l'année, au mois ou au jour).
// « aujourd'hui » est accepté pour une fin. inst : position de la date ; instFin : sa fin (fin du mois ou de l'année).
function lireDate(texte, fin = false) {
  const t = (texte || "").trim();
  if (!t) return { texte: null, annee: null, ok: fin, vide: true };
  if (fin && /^(aujourd'?hui|today)$/i.test(t)) return { texte: "aujourd'hui", annee: null, ok: true };   // écrit toujours ainsi dans le fichier
  const d = parserDate(t);
  if (!d) return { texte: t, annee: null, ok: false };
  return { texte: t, ...d, ok: true, inst: instant(d.annee, d.mois, d.jour),
    instFin: instantFin({ fin_annee: d.annee, fin_mois: d.mois, fin_jour: d.jour }) };
}

function tousLesEvenements() {
  const r = [];
  let ordre = 0;
  for (const date of etat.donnees.dates) for (const ev of date.evenements) r.push({ type: "ev", ev, date, ordre: ordre++ });
  return r;
}

function correspond(texte) {
  const q = normaliser(recherche.trim());
  return !q || normaliser(texte).includes(q);
}

// ─── Rendu ───

function rendre() {
  if (!etat.donnees) return;
  const aVerifier = verifications();
  const nVerif = aVerifier.reduce((s, c) => s + c.items.length, 0);
  const nombres = {
    evenements: tousLesEvenements().length, periodes: etat.donnees.periodes.length,
    groupes: Object.keys(etat.donnees.groupes).length, themes: index.themes.length, verifier: nVerif,
  };
  nav.innerHTML = SOUS_ONGLETS.map(([cle, titre]) =>
    `<button class="dn-onglet${cle === courant ? " actif" : ""}${cle === "verifier" && nVerif ? " alerte" : ""}" data-sous="${cle}">${t(titre)}${nombres[cle] != null ? `<span class="n">${nombres[cle]}</span>` : ""}</button>`).join("");
  const ajout = SOUS_ONGLETS.find(([cle]) => cle === courant)[2];
  boutonAjouter.hidden = !ajout;
  boutonAjouter.textContent = t(ajout) || "";
  boutonLot.hidden = courant !== "evenements" && courant !== "periodes";
  boutonAnnuler.disabled = !peutAnnuler();

  const defilement = zone.scrollTop;
  if (courant === "evenements") zone.innerHTML = tableEvenements();
  else if (courant === "periodes") zone.innerHTML = tablePeriodes();
  else if (courant === "groupes") zone.innerHTML = tableGroupes();
  else if (courant === "themes") zone.innerHTML = tableThemes();
  else if (courant === "reglages") zone.innerHTML = reglages();
  else zone.innerHTML = tableVerifier(aVerifier);
  zone.scrollTop = defilement;
  if (LECTURE_SEULE) verrouiller(zone);
  majCoches();
  const n = lignes.length;
  app.compteur(recherche.trim() ? `${n}` : "");
}

function entete(colonnes, tri) {
  return `<colgroup>${colonnes.map((c) => `<col style="width:${c.l}">`).join("")}</colgroup>
    <thead><tr>${colonnes.map((c) => {
      const cl = [c.cl, tri && c.tri && tri.cle === c.tri ? `trie${tri.sens < 0 ? " desc" : ""}` : ""].filter(Boolean).join(" ");
      return `<th${c.tri ? ` data-tri="${c.tri}"` : ""}${cl ? ` class="${cl}"` : ""}>${c.html ?? t(c.titre)}</th>`;
    }).join("")}</tr></thead>`;
}

const estChoisi = (item, s = sel || retenu) => !!s && ((item.type === "ev" && (s.type === "ev" || s.type === "relier") && s.ev === item.ev)
  || (item.type === "p" && s.type === "p" && s.p === item.p) || (item.type === s.type && (item.type === "g" || item.type === "t") && s.nom === item.nom));
const majChoisies = () => zone.querySelectorAll("tr[data-i]").forEach((tr) => tr.classList.toggle("choisie", estChoisi(lignes[Number(tr.dataset.i)])));
// élément du panneau → sélection à retenir (évènement, période, groupe, thème existants)
const aRetenir = (s) => (s && ((s.type === "ev" || s.type === "relier") && s.ev ? { type: "ev", ev: s.ev, date: s.date }
  : s.type === "p" && s.p ? { type: "p", p: s.p } : (s.type === "g" || s.type === "t") && s.nom ? { type: s.type, nom: s.nom } : null));

function ligne(item, cellules) {
  lignes.push(item);
  const cl = [estChoisi(item) ? "choisie" : "", coches.has(objet(item)) ? "cochee" : ""].filter(Boolean).join(" ");
  return `<tr data-i="${lignes.length - 1}"${cl ? ` class="${cl}"` : ""}>${cellules}</tr>`;
}
const objet = (item) => item.ev || item.p || null;

// Case à cocher de la modification en série (tables Évènements et Périodes)
const COL_COCHE = { html: `<input type="checkbox" data-tout aria-label="${t("Cocher toutes les lignes affichées")}" title="${t("Cocher toutes les lignes affichées")}">`, l: "28px", cl: "c-coche" };
const celluleCoche = (o) => LECTURE_SEULE ? "" : `<td class="c-coche"><input type="checkbox" data-coche${coches.has(o) ? " checked" : ""} aria-label="${t("Cocher cette ligne")}"></td>`;

const sansCoche = (colonnes) => (LECTURE_SEULE ? colonnes.filter((c) => c !== COL_COCHE) : colonnes);

// Lecture seule : les champs se lisent (et se copient) mais ne se modifient pas ; les boutons qui modifient
// disparaissent ; seuls restent ceux qui servent à naviguer (fermer, voir dans la frise, trier, sous-onglets)
const NAVIGATION = '[data-action="abandonner"], [data-action="frise"], [data-sous]';
function verrouiller(el) {
  el.querySelectorAll("input, textarea, select").forEach((c) => {
    if (c.matches('textarea, input[type="text"], input:not([type])')) c.readOnly = true;
    else c.disabled = true;
  });
  el.querySelectorAll("button").forEach((b) => {
    if (b.matches(NAVIGATION)) return;
    if (b.matches(".puce-choix")) b.disabled = true;           // on voit encore les groupes et les thèmes choisis
    else b.remove();
  });
}

// Évènements

const COL_ETOILE = { html: "★", tri: "important", l: "30px", cl: "c-etoile" };
const COL_EV = [
  COL_COCHE, COL_ETOILE, { titre: "Date", tri: "date", l: "96px", cl: "c-date" }, { titre: "Nom", tri: "nom", l: "29%" },
  { titre: "Groupes", tri: "groupe", l: "17%" }, { titre: "Thèmes", tri: "theme", l: "15%" }, { titre: "Marques", l: "130px" },
  { titre: "Description", l: "auto" },
];

// Étoile cliquable : marque l'élément comme important sans ouvrir le formulaire
const celluleEtoile = (o) => `<td class="c-etoile"><button class="etoile-btn${o.important ? " on" : ""}" data-etoile
  title="${t(o.important ? (LECTURE_SEULE ? "Important" : "Important : cliquer pour retirer l'étoile") : (LECTURE_SEULE ? "" : "Cliquer pour marquer comme important"))}">${o.important ? "★" : "☆"}</button></td>`;

function cellulesEvenement({ ev, date }) {
  const marques = [
    ev.limite === "debut" ? etiquette(t("début d'époque")) : "", ev.limite === "fin" ? etiquette(t("fin d'époque")) : "",
    ev.regne ? etiquette(t("règne"), "or") : "", etiquetteSources(ev),
  ].join("");
  return `${celluleCoche(ev)}${celluleEtoile(ev)}<td class="c-date">${echapper(dateAffichee(date.date, ev.approx))}</td>
    <td class="${ev.limite ? "fort" : ""}" title="${echapper(ev.label)}">${surligner(ev.label)}</td>
    <td>${puces(ev.groupes)}</td><td class="c-themes">${texteThemes(ev.themes)}</td><td>${marques}</td><td class="c-desc">${extrait(ev.comment)}</td>`;
}

function tableEvenements() {
  lignes = [];
  const items = tousLesEvenements().filter(({ ev, date }) => passeFiltre(ev.groupes, ev.themes)
    && correspond(`${ev.label} | ${ev.comment ?? ""}`));
  const { cle, sens } = tris.evenements;
  const parDate = (a, b) => compAnnee(instantDe(a.date), instantDe(b.date));
  const cmp = {
    date: parDate,
    nom: (a, b) => a.ev.label.localeCompare(b.ev.label, "fr"),
    important: (a, b) => !!b.ev.important - !!a.ev.important || parDate(a, b),
    groupe: (a, b) => ordreGroupe(a.ev.groupes) - ordreGroupe(b.ev.groupes) || parDate(a, b),
    theme: (a, b) => ordreTheme(a.ev.themes) - ordreTheme(b.ev.themes) || parDate(a, b),
  }[cle];
  items.sort((a, b) => sens * cmp(a, b) || a.ordre - b.ordre);
  if (!items.length) return vide();
  return `<table class="dn">${entete(sansCoche(COL_EV), tris.evenements)}<tbody>${items.map((it) => ligne(it, cellulesEvenement(it))).join("")}</tbody></table>`;
}

// Périodes

const COL_P = [
  COL_COCHE, COL_ETOILE, { titre: "Type", tri: "type", l: "104px" }, { titre: "Nom", tri: "nom", l: "25%" }, { titre: "Groupes", tri: "groupe", l: "15%" },
  { titre: "Thèmes", tri: "theme", l: "14%" },
  { titre: "Début", tri: "debut", l: "96px", cl: "c-date" }, { titre: "Fin", l: "96px", cl: "c-date" },
  { titre: "Marques", l: "120px" }, { titre: "Description", l: "auto" },
];

function cellulesPeriode({ p }) {
  const inversee = p.type === "epoque" && p.fin_annee != null && p.debut_annee != null && instantFin(p) < instantDebut(p);
  const marques = [
    p.debut_deduit ? etiquette(t("début déduit"), "alerte") : "", inversee ? etiquette(t("fin avant début"), "alerte") : "",
    p.regne ? etiquette(t("règne"), "or") : "", etiquetteSources(p),
  ].join("");
  return `${celluleCoche(p)}${celluleEtoile(p)}<td class="c-type">${t(p.type === "section" ? "Ligne spéciale" : "Époque")}</td>
    <td class="fort" title="${echapper(p.label)}">${surligner(p.label)}${p.sous_titre ? ` <span class="c-sous">${surligner(p.sous_titre)}</span>` : ""}</td>
    <td>${puces(p.groupes)}</td><td class="c-themes">${texteThemes(p.themes)}</td><td class="c-date">${echapper(dateAffichee(p.debut, p.debut_approx))}</td><td class="c-date">${echapper(dateAffichee(p.fin, p.fin_approx))}</td>
    <td>${marques}</td><td class="c-desc">${extrait(p.comment)}</td>`;
}

function tablePeriodes() {
  lignes = [];
  const items = etat.donnees.periodes.map((p, ordre) => ({ type: "p", p, ordre }))
    .filter(({ p }) => passeFiltre(p.groupes, p.themes) && correspond(`${p.label} | ${p.sous_titre ?? ""} | ${p.comment ?? ""}`));
  const { cle, sens } = tris.periodes;
  const parDebut = (a, b) => compAnnee(instantDebut(a.p), instantDebut(b.p));
  const cmp = {
    type: (a, b) => a.p.type.localeCompare(b.p.type) || parDebut(a, b),
    nom: (a, b) => a.p.label.localeCompare(b.p.label, "fr"),
    important: (a, b) => !!b.p.important - !!a.p.important || parDebut(a, b),
    groupe: (a, b) => ordreGroupe(a.p.groupes) - ordreGroupe(b.p.groupes) || parDebut(a, b),
    theme: (a, b) => ordreTheme(a.p.themes) - ordreTheme(b.p.themes) || parDebut(a, b),
    debut: parDebut,
  }[cle];
  items.sort((a, b) => sens * cmp(a, b) || a.ordre - b.ordre);
  if (!items.length) return vide();
  return `<table class="dn">${entete(sansCoche(COL_P), tris.periodes)}<tbody>${items.map((it) => ligne(it, cellulesPeriode(it))).join("")}</tbody></table>`;
}

// Groupes

function comptesGroupes() {
  const c = {};
  for (const nom of Object.keys(etat.donnees.groupes)) c[nom] = { ev: 0, p: 0 };
  etat.donnees.dates.forEach((x) => x.evenements.forEach((e) => e.groupes.forEach((g) => c[g] && c[g].ev++)));
  etat.donnees.periodes.forEach((p) => p.groupes.forEach((g) => c[g] && c[g].p++));
  return c;
}

function tableGroupes() {
  lignes = [];
  const c = comptesGroupes();
  const noms = Object.keys(etat.donnees.groupes);
  const echelles = noms.filter((n) => etat.donnees.groupes[n].type === "echelle");   // niveau = rang parmi les échelles
  if (!noms.length) return `<p class="dn-vide">${t("Aucun groupe pour l'instant : « Ajouter un groupe », en haut à droite. Un groupe est un <b>lieu</b> (Rome, Chine…), ou une <b>échelle</b> (éon, ère…) pour les lignes spéciales.")}</p>`;
  const col = [{ titre: "Ordre", l: "70px" }, { titre: "Nom", l: "30%" }, { titre: "Type", l: "110px" },
    { titre: "Couleur", l: "110px" }, { titre: "Évènements", l: "100px", cl: "c-nombre" }, { titre: "Périodes", l: "auto", cl: "c-nombre" }];
  const corps = noms.filter((nom) => correspond(nom)).map((nom) => {
    const g = etat.donnees.groupes[nom], k = noms.indexOf(nom);
    return ligne({ type: "g", nom }, `
      <td class="c-ordre">${flechesOrdre(k, noms.length)}</td>
      <td>${puces([nom])}</td><td>${g.type === "echelle" ? `${t("Échelle")} · ${t("niveau {n}", { n: echelles.indexOf(nom) + 1 })}` : t("Lieu")}</td>
      <td class="c-desc">${echapper(g.couleur)}</td><td class="c-nombre">${c[nom].ev}</td><td class="c-nombre">${c[nom].p}</td>`);
  }).join("");
  return `<table class="dn">${entete(col)}<tbody>${corps}</tbody></table>
    <p class="dn-note">${t("L'ordre des groupes est celui du panneau de gauche et des colonnes d'époques de la frise.")}</p>`;
}
const flechesOrdre = (k, n) => `<button class="dn-ordre" data-deplacer="-1" ${k ? "" : "disabled"} aria-label="${t("Monter")}">↑</button><button class="dn-ordre" data-deplacer="1" ${k < n - 1 ? "" : "disabled"} aria-label="${t("Descendre")}">↓</button>`;

// Réglages de la frise (enregistrés dans son fichier, clé « reglages »)

function reglages() {
  lignes = [];
  const r = regroupement(), det = detail(), une = uneSeuleLigne() ? "oui" : "non";
  const radio = (nom, actuel) => (valeur, titre, aide) => `<label class="dn-reglage"><input type="radio" name="${nom}" value="${valeur}"${actuel === valeur ? " checked" : ""}>
    <span><b>${t(titre)}</b>${aide ? `<span class="dn-aide">${t(aide)}</span>` : ""}</span></label>`;
  const choix = radio("regroupement", r), choixDetail = radio("detail", det), choixLigne = radio("une_seule_ligne", une);
  const choixRappel = radio("rappel", rappelContinu() ? "continu" : "bref");
  const choixJeu = radio("jeu", jeuActif() ? "oui" : "non");
  const parDefaut = (v) => (v === DETAIL_DEFAUT[r] ? t("Par défaut.") : "");
  const details = r === "jour"
    ? `<p class="dn-aide">${t("Avec une ligne par jour, la date entière est sur la ligne : rien à écrire devant les noms.")}</p>`
    : `<p class="dn-aide">${t("Ce que la ligne ne montre pas peut être écrit en petit devant le nom de chaque évènement :")}</p>
      ${choixDetail("aucun", "Rien", "")}
      ${r === "annee" ? choixDetail("mois", "Le mois", `${t("« juil. Prise de la Bastille »")} ${parDefaut("mois")}`) : ""}
      ${choixDetail("jour", r === "annee" ? "Le jour et le mois" : "Le jour", `${t(r === "annee" ? "« 14 juil. Prise de la Bastille »" : "« 14 Prise de la Bastille »")} ${parDefaut("jour")}`)}`;
  return `<div class="dn-reglages">
    <h3>${t("Dates précises")}</h3>
    <p class="dn-aide">${t("Une date peut être précise à l'année (1789), au mois (juillet 1789) ou au jour (14 juillet 1789). La frise peut montrer :")}</p>
    ${choix("annee", "Une ligne par année", "Les évènements d'une même année sont côte à côte sur la ligne « 1789 », le jour et le mois écrits en petit devant le nom (« 14 juil. »).")}
    ${choix("mois", "Une ligne par mois", "Les évènements d'un même mois sont côte à côte sur la ligne « juil. 1789 », le jour écrit en petit devant le nom.")}
    ${choix("jour", "Une ligne par jour", "Chaque date a sa ligne : « 14 juil. 1789 », « 20 juil. 1789 »…")}
    <p class="dn-aide">${t("Une ligne spéciale qui commence en cours d'année ou de mois coupe la ligne en deux, pour rester à sa place.")}</p>
    <h3>${t("Détail des dates dans les évènements")}</h3>
    ${details}
    <h3>${t("Dates aux nombreux évènements")}</h3>
    ${choixLigne("non", "Passer à la ligne", "Quand les évènements d'une date ne tiennent pas sur une ligne, la ligne continue en dessous ; le nombre par ligne dépend de la largeur de l'écran. Par défaut.")}
    ${choixLigne("oui", "Toujours sur une seule ligne", "Les évènements rétrécissent pour tenir sur la ligne ; les noms sont raccourcis (…), complets au survol.")}
    <h3>${t("Rappel des lignes spéciales")}</h3>
    <p class="dn-aide">${t("En haut de la frise, les lignes spéciales que l'on vient de dépasser restent affichées :")}</p>
    ${choixRappel("bref", "Brièvement", "Chaque ligne reste une dizaine de lignes après son passage, puis la frise la pousse vers le haut. Par défaut.")}
    ${choixRappel("continu", "Jusqu'à la suivante de même niveau", "On voit toujours l'éon, l'ère, la période… en cours : chaque ligne spéciale reste jusqu'à la suivante de même niveau, ou jusqu'à sa fin si elle en a une.")}
    <p class="dn-aide">${t("Le niveau d'une ligne spéciale est son groupe de type échelle : dans l'onglet Groupes, la première échelle de la liste est le niveau le plus large, les suivantes de plus en plus fines (flèches ↑ ↓ pour les réordonner).")}</p>
    ${reglagesStats()}
    <h3>${t("Jeu")}</h3>
    ${choixJeu("non", "Pas de jeu", "Par défaut.")}
    ${choixJeu("oui", "Afficher l'onglet Jeu", "« La frise qui se construit » : replacer un à un des évènements de la frise dans l'ordre. Aussi dans les pages exportées de cette frise.")}
    <p class="dn-note">${t("Réglages propres à cette frise, enregistrés dans son fichier (Ctrl+S) ; ils ne changent pas les dates.")}</p>
  </div>`;
}

// ─── Réglages des statistiques : plages d'années, chacune avec la durée de ses tranches ───

function reglagesStats() {
  const { plages, defaut } = plagesStats();
  const n = tranchesStats(plages).length;
  const ligne = (p, i) => `<div class="dn-plage">
      <label>${t("De")} <input type="text" name="plage-debut" value="${echapper(formatAnnee(p.debut))}" spellcheck="false" autocomplete="off"></label>
      <label>${t("à")} <input type="text" name="plage-fin" value="${echapper(formatAnnee(p.fin))}" spellcheck="false" autocomplete="off"></label>
      <label>${t("par tranches de")} <input type="number" name="plage-pas" min="1" step="1" value="${p.pas}"> ${t("ans")}</label>
      ${plages.length > 1 ? `<button class="dn-fermer" data-reglage="retirer" data-i="${i}" title="${t("Retirer cette plage")}" aria-label="${t("Retirer cette plage")}">×</button>` : ""}
    </div>`;
  return `<h3>${t("Statistiques")}</h3>
    <p class="dn-aide">${t("Le graphique compte les évènements par tranche d'années. Par défaut : de la première date de la frise (au plus tôt - 5 000) à la dernière, en tranches de 1, 5, 10, 25, 100, 500 ou 1 000 ans, la plus fine qui ne donne pas plus de 80 barres. On peut définir ses propres plages, chacune avec la durée de ses tranches (par exemple 500 ans pour l'Antiquité, 1 an pour une révolution).")}</p>
    <div class="dn-plages">${plages.map(ligne).join("") || `<span class="dn-aide">${t("Aucune date pour l'instant.")}</span>`}</div>
    <p class="dn-aide" data-aide="plages">${defaut ? t("Réglage par défaut.") + " " : ""}${tn(n, "{n} tranche", "{n} tranches")}</p>
    <div class="dn-boutons"><button class="bouton discret petit" data-reglage="ajouter">${t("+ Ajouter une plage")}</button>
      ${defaut ? "" : `<button class="bouton discret petit" data-reglage="defaut">${t("Revenir au réglage par défaut")}</button>`}</div>`;
}

// Lit les plages saisies ; les applique si elles sont valides, sinon dit pourquoi (rien n'est changé)
let tabPlage = 0;
function lirePlages(champ) {
  const champs = [...zone.querySelectorAll(".dn-plages input")], k = champs.indexOf(champ) + tabPlage;
  const aide = zone.querySelector('[data-aide="plages"]');
  const plages = [];
  for (const el of zone.querySelectorAll(".dn-plage")) {
    const val = (nom) => el.querySelector(`[name="${nom}"]`).value;
    const debut = parserAnnee(val("plage-debut")), fin = parserAnnee(val("plage-fin")), pas = Number(val("plage-pas"));
    const erreur = debut == null ? t("Début non compris.") : fin == null ? t("Fin non comprise.") : fin < debut ? t("La fin précède le début.")
      : !(Number.isInteger(pas) && pas >= 1) ? t("La durée des tranches doit être un nombre entier d'années.")
      : plages.length && debut <= plages[plages.length - 1].fin ? t("Les plages doivent se suivre sans se chevaucher.") : null;
    if (erreur) { aide.textContent = erreur; aide.className = "dn-aide erreur"; return; }
    plages.push({ debut, fin, pas });
  }
  // écriture habituelle (« -1000 » → « - 1 000 »), même si rien ne change
  zone.querySelectorAll(".dn-plage").forEach((el, i) => {
    el.querySelector('[name="plage-debut"]').value = formatAnnee(plages[i].debut);
    el.querySelector('[name="plage-fin"]').value = formatAnnee(plages[i].fin);
  });
  if (tranchesStats(plages).length > MAX_TRANCHES) {
    aide.textContent = t("Trop de tranches (plus de {n}) : allonge leur durée ou réduis les plages.", { n: MAX_TRANCHES });
    aide.className = "dn-aide erreur";
    return;
  }
  const defaut = JSON.stringify(plagesParDefaut());
  aide.className = "dn-aide";
  aide.textContent = tn(tranchesStats(plages).length, "{n} tranche", "{n} tranches");
  changerReglages({ stats: JSON.stringify(plages) === defaut ? null : { plages } });
  if (tabPlage) setTimeout(() => zone.querySelectorAll(".dn-plages input")[k]?.focus());
}

function actionPlages(action, i) {
  const plages = plagesStats().plages.map((p) => ({ ...p }));
  if (action === "defaut") return changerReglages({ stats: null });
  if (action === "retirer") plages.splice(i, 1);
  if (action === "ajouter") {
    // la suite de la dernière plage, avec la même durée de tranches
    const der = plages[plages.length - 1] ?? { fin: -1, pas: 100 };
    plages.push({ debut: der.fin + 1, fin: der.fin + 10 * der.pas, pas: der.pas });
  }
  changerReglages({ stats: plages.length ? { plages } : null });
}

// Ouvre un sous-onglet depuis un autre onglet (Statistiques → Réglages)
export function montrerSousOnglet(cle) {
  if (!racine || !quitterFormulaire()) return;
  courant = cle;
  try { localStorage.setItem("donnees.onglet", courant); } catch {}
  fermer();
  if (visible()) rendre(); else aRefaire = true;
}

// Réglages : { clé: valeur } ; une valeur null (= la valeur par défaut) retire la clé du fichier.
// Changer le regroupement remet le détail à sa valeur par défaut (une précision de plus que la ligne).
function changerReglages(valeurs) {
  const avant = JSON.stringify(etat.donnees.reglages || {});
  const r = { ...(etat.donnees.reglages || {}) };
  for (const [k, v] of Object.entries(valeurs)) { if (v == null) delete r[k]; else r[k] = v; }
  if (JSON.stringify(r) === avant) return;
  modifier((d) => {
    // « reglages » est rangé juste avant « groupes » ; les valeurs par défaut ne sont pas écrites
    const cles = Object.keys(d).filter((k) => k !== "reglages");
    const valeurs = Object.fromEntries(cles.map((k) => [k, d[k]]));
    for (const k of Object.keys(d)) delete d[k];
    for (const k of cles) {
      if (k === "groupes" && Object.keys(r).length) d.reglages = r;
      d[k] = valeurs[k];
    }
  });
}

// Thèmes : une liste ordonnée de noms, sans couleur (la couleur reste aux lieux)

const ordreTheme = (ts) => (ts && ts.length ? index.themes.indexOf(ts[0]) : 999);
const texteThemes = (ts) => (ts && ts.length ? ts.map(echapper).join(", ") : "");

function comptesThemes() {
  const c = Object.fromEntries(index.themes.map((t) => [t, { ev: 0, p: 0 }]));
  etat.donnees.dates.forEach((x) => x.evenements.forEach((e) => (e.themes || []).forEach((t) => c[t] && c[t].ev++)));
  etat.donnees.periodes.forEach((p) => (p.themes || []).forEach((t) => c[t] && c[t].p++));
  return c;
}

function tableThemes() {
  lignes = [];
  const noms = index.themes;
  if (!noms.length) return `<p class="dn-vide">${t("Aucun thème pour l'instant : « Ajouter un thème », en haut à droite. Un thème classe les évènements par sujet (guerres, religion, sciences…), en plus de leur lieu.")}</p>`;
  const c = comptesThemes();
  const col = [{ titre: "Ordre", l: "70px" }, { titre: "Nom", l: "40%" }, { titre: "Évènements", l: "110px", cl: "c-nombre" }, { titre: "Périodes", l: "auto", cl: "c-nombre" }];
  const corps = noms.filter((nom) => correspond(nom)).map((nom) => {
    const k = noms.indexOf(nom);
    return ligne({ type: "t", nom }, `
      <td class="c-ordre">${flechesOrdre(k, noms.length)}</td>
      <td><span class="puce-t">${echapper(nom)}</span></td><td class="c-nombre">${c[nom].ev}</td><td class="c-nombre">${c[nom].p}</td>`);
  }).join("");
  return `<table class="dn">${entete(col)}<tbody>${corps}</tbody></table>
    <p class="dn-note">${t("L'ordre des thèmes est celui du panneau de gauche. Un évènement peut avoir plusieurs thèmes.")}</p>`;
}

// À vérifier

function verifications() {
  const d = etat.donnees;
  const evs = tousLesEvenements();
  const ps = d.periodes.map((p) => ({ type: "p", p }));
  const parNom = new Map();
  evs.forEach((it) => {
    const cle = normaliser(it.ev.label).replace(/[^a-z0-9]+/g, " ").trim();
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle).push(it);
  });
  return [
    { cle: "debuts", titre: t("Débuts d'époque sans fin"), aide: t("À relier à leur fin pour devenir une époque (barre de durée dans la frise)."),
      items: evs.filter((it) => it.ev.limite === "debut") },
    { cle: "fins", titre: t("Fins d'époque isolées"), aide: t("Souvent la fin d'un des débuts ci-dessus."),
      items: evs.filter((it) => it.ev.limite === "fin") },
    { cle: "deduits", titre: t("Lignes spéciales à début déduit"), aide: t("Début provisoire, à confirmer."),
      items: ps.filter((it) => it.p.debut_deduit) },
    { cle: "sans", titre: t("Évènements sans groupe"), aide: t("Ils apparaissent en gris dans la frise."),
      items: evs.filter((it) => !it.ev.groupes.length) },
    { cle: "sansTheme", titre: t("Sans thème"), aide: t("Évènements et époques à classer dans au moins un thème."),
      items: [...evs.filter((it) => !it.ev.themes?.length), ...ps.filter((it) => it.p.type === "epoque" && !it.p.themes?.length)] },
    { cle: "dates", titre: t("Dates non comprises"), aide: EXEMPLES,
      items: [...evs.filter((it) => it.date.annee == null), ...ps.filter((it) => it.p.debut_annee == null)] },
    { cle: "inversees", titre: t("Époques dont la fin précède le début"), aide: "",
      items: ps.filter(({ p }) => p.fin_annee != null && p.debut_annee != null && instantFin(p) < instantDebut(p)) },
    { cle: "longs", titre: t("Noms trop longs"), aide: t("Plus de {n} caractères : ils sont tronqués dans la frise ; la suite peut aller dans la description.", { n: NOM_LONG }),
      items: [...evs.filter((it) => it.ev.label.length > NOM_LONG), ...ps.filter((it) => it.p.label.length > NOM_LONG)] },
    { cle: "doublons", titre: t("Doublons possibles"), aide: t("Même nom à plusieurs endroits."),
      items: [...parNom.values()].filter((l) => l.length > 1).flat() },
  ].filter((c) => c.items.length);
}

const NOM_LONG = 50;           // « À vérifier » : au-delà, un nom est signalé comme trop long

function tableVerifier(categories) {
  lignes = [];
  if (!categories.length) return `<p class="dn-vide">${t("Rien à vérifier.")}</p>`;
  const col = [{ titre: "Date", l: "96px", cl: "c-date" }, { titre: "Nom", l: "38%" }, { titre: "Groupes", l: "22%" }, { titre: "", l: "auto" }];
  let corps = "";
  for (const c of categories) {
    const items = c.items.filter((it) => it.type === "ev"
      ? passeFiltre(it.ev.groupes, it.ev.themes) && correspond(`${it.ev.label} | ${it.ev.comment ?? ""}`)
      : passeFiltre(it.p.groupes, it.p.themes) && correspond(`${it.p.label} | ${it.p.comment ?? ""}`));
    if (!items.length) continue;
    corps += `<tr class="dn-categorie"><td colspan="4"><b>${c.titre}</b><span class="n">${items.length}</span>${c.aide ? `<span class="aide">${echapper(c.aide)}</span>` : ""}</td></tr>`;
    corps += items.map((it) => it.type === "ev"
      ? ligne(it, `<td class="c-date">${echapper(dateAffichee(it.date.date, it.ev.approx))}</td><td class="${it.ev.limite ? "fort" : ""}">${surligner(it.ev.label)}</td><td>${puces(it.ev.groupes)}</td>
          <td>${c.cle === "debuts" ? `<button class="bouton petit" data-relier>${t("Relier à une fin")}</button>`
            : c.cle === "longs" ? `<span class="c-desc">${tn(it.ev.label.length, "{n} caractère", "{n} caractères")}</span>` : `<span class="c-desc">${extrait(it.ev.comment)}</span>`}</td>`)
      : ligne(it, `<td class="c-date">${echapper(dateAffichee(it.p.debut, it.p.debut_approx))}</td><td class="fort">${surligner(it.p.label)}</td><td>${puces(it.p.groupes)}</td>
          <td class="c-desc">${c.cle === "longs" ? tn(it.p.label.length, "{n} caractère", "{n} caractères")
            : `${t(it.p.type === "section" ? "Ligne spéciale" : "Époque")}, ${t("jusqu'à {fin}", { fin: echapper(texteDate(it.p.fin) || "?") })}`}</td>`)).join("");
  }
  if (!corps) return vide();
  return `<table class="dn">${entete(col)}<tbody>${corps}</tbody></table>`;
}

function vide() {
  const d = etat.donnees;
  if (courant === "evenements" && !d.dates.length)
    return `<p class="dn-vide">${t("Aucun évènement pour l'instant : « Ajouter un évènement », en haut à droite.")}</p>`;
  if (courant === "periodes" && !d.periodes.length)
    return `<p class="dn-vide">${t("Aucune période pour l'instant : « Ajouter une période », en haut à droite.")}</p>`;
  return `<p class="dn-vide">${t("Aucun résultat")}${recherche.trim() ? " " + t("pour cette recherche") : ""}${filtreActif() ? " " + t("avec ce filtre") : ""}.</p>`;
}

// ─── Clics dans la table ───

function clicTable(e) {
  if (LECTURE_SEULE && e.target.closest("[data-reglage], [data-deplacer], [data-etoile], [data-coche], [data-tout], [data-relier]")) return;
  const act = e.target.closest("[data-reglage]");
  if (act) return actionPlages(act.dataset.reglage, Number(act.dataset.i));
  const th = e.target.closest("th[data-tri]");
  if (th) {
    const t = tris[courant];
    if (t.cle === th.dataset.tri) t.sens = -t.sens; else { t.cle = th.dataset.tri; t.sens = 1; }
    return rendre();
  }
  if (e.target.closest("[data-tout]")) return toutCocher();
  const tr = e.target.closest("tr[data-i]");
  if (!tr) return;
  const item = lignes[Number(tr.dataset.i)];
  const dep = e.target.closest("[data-deplacer]");
  if (dep) return (item.type === "t" ? deplacerTheme : deplacerGroupe)(item.nom, Number(dep.dataset.deplacer));
  if (e.target.closest("[data-etoile]")) return basculerImportant(item);
  if (e.altKey && item.type !== "g") return voirDansFrise(item);   // Alt + clic : revenir à la frise
  // une case cochée, ou une ligne quand d'autres sont déjà cochées : cocher ou décocher (Maj : toute la plage)
  if (e.target.closest("[data-coche]") || coches.size) return cocher(Number(tr.dataset.i), e.shiftKey);
  if (!quitterFormulaire()) return;
  if (e.target.closest("[data-relier]")) return ouvrir({ type: "relier", ev: item.ev, date: item.date });
  ouvrirLigne(item);
}

function ouvrirLigne(item) {
  if (item.type === "ev") ouvrir({ type: "ev", ev: item.ev, date: item.date });
  else if (item.type === "p") ouvrir({ type: "p", p: item.p });
  else ouvrir({ type: item.type, nom: item.nom });
}

// ─── Modification en série : cocher des lignes ───

function cocher(i, plage) {
  if (!coches.size && !quitterFormulaire()) return majCoches();   // formulaire en cours : la case reste vide
  const oui = !coches.has(objet(lignes[i]));
  const avant = plage && derniereCoche >= 0 && derniereCoche < lignes.length ? derniereCoche : i;
  for (let k = Math.min(i, avant); k <= Math.max(i, avant); k++) {
    if (oui) coches.add(objet(lignes[k])); else coches.delete(objet(lignes[k]));
  }
  derniereCoche = i;
  majSerie();
}

// Case de l'en-tête : coche toutes les lignes affichées, ou les décoche si elles le sont déjà
function toutCocher() {
  const toutes = lignes.length > 0 && lignes.every((l) => coches.has(objet(l)));
  if (!coches.size && !quitterFormulaire()) return majCoches();
  lignes.forEach((l) => (toutes ? coches.delete(objet(l)) : coches.add(objet(l))));
  majSerie();
}

function majSerie(message = "") {
  if (coches.size) ouvrir({ type: "serie" }, message);
  else fermer();
}

// Met les cases et le fond des lignes d'accord avec « coches » (sans tout redessiner)
// Mode sélection (des lignes sont cochées) : ↑ ↓ déplacent le curseur, Espace coche ou décoche sa ligne,
// Maj + ↑ ↓ cochent au passage. Sans effet dans un champ de saisie ou dans le panneau de droite.
// Hors sélection : ↑ ↓ ouvrent la ligne précédente ou suivante (celle dont le détail est affiché sert de départ).
function clavierSelection(e) {
  if (!visible() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!["ArrowUp", "ArrowDown", " ", "Enter"].includes(e.key)) return;
  if (e.target.closest("textarea, select, input:not([type=checkbox]), .dn-panneau, #recherche")) return;
  if (e.key === "Enter") {                          // détail fermé par Échap : Entrée le rouvre
    if (!sel && retenu && !coches.size && !e.target.closest("button, a")) { e.preventDefault(); ouvrirLigne(retenu); }
    return;
  }
  if (!coches.size) {
    if (e.key === " " || !lignes.length) return;
    e.preventDefault();
    const i = lignes.findIndex((l) => estChoisi(l));
    const j = i < 0 ? 0 : Math.max(0, Math.min(lignes.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    if (j !== i) {
      if (!sel && retenu) { retenu = aRetenir(lignes[j]); majChoisies(); }   // détail fermé : on ne déplace que la sélection
      else if (quitterFormulaire()) ouvrirLigne(lignes[j]);
    }
    zone.querySelector(`tr[data-i="${j}"]`)?.scrollIntoView({ block: "nearest" });
    return;
  }
  e.preventDefault();
  if (e.key === " ") { if (lignes[derniereCoche]) cocher(derniereCoche, false); return; }
  const i = Math.max(0, Math.min(lignes.length - 1, (derniereCoche < 0 ? 0 : derniereCoche) + (e.key === "ArrowDown" ? 1 : -1)));
  derniereCoche = i;
  if (e.shiftKey) { coches.add(objet(lignes[i])); majSerie(); } else majCoches();
  zone.querySelector(`tr[data-i="${i}"]`)?.scrollIntoView({ block: "nearest" });
}

function majCoches() {
  zone.querySelectorAll("tr[data-i]").forEach((tr) => {
    const oui = coches.has(objet(lignes[Number(tr.dataset.i)]));
    tr.classList.toggle("cochee", oui);
    tr.classList.toggle("curseur", coches.size > 0 && Number(tr.dataset.i) === derniereCoche);
    const c = tr.querySelector("[data-coche]");
    if (c) c.checked = oui;
  });
  const tout = zone.querySelector("[data-tout]");
  if (tout) {
    const n = lignes.filter((l) => coches.has(objet(l))).length;
    tout.checked = n > 0 && n === lignes.length;
    tout.indeterminate = n > 0 && n < lignes.length;
  }
}

// Après une annulation, les objets sont recréés : les anciens ne sont plus cochés
function elaguerCoches() {
  if (!coches.size) return;
  const tous = new Set([...etat.donnees.dates.flatMap((x) => x.evenements), ...etat.donnees.periodes]);
  for (const o of coches) if (!tous.has(o)) coches.delete(o);
}

// Ouvre la frise sur cet évènement ou cette période, mis en évidence
function voirDansFrise(item) {
  let id = null;
  if (item.type === "ev" || item.type === "relier") {
    for (const [k, t] of index.evenements) if (t.ev === item.ev) id = k;
    app.ouvrirFrise(item.date.annee, id);
  } else if (item.type === "p") {
    for (const [k, p] of index.periodes) if (p === item.p) id = k;
    app.ouvrirFrise(item.p.debut_annee, id);
  }
}

// ─── Panneau latéral ───

// Quitter l'élément affiché (autre ligne, autre sous-onglet…) : ce qui attend est appliqué ; si une saisie reste invalide
// (date non comprise, nom vide…), on reste sur l'élément pour ne pas la perdre, et le panneau le signale.
function quitterFormulaire() {
  appliquerMaintenant();
  if (!modifiee) return true;
  signaler();
  return false;
}

function signaler() {
  const m = panneau.querySelector(".dn-message");
  if (m) { m.textContent = t(direct() ? "Une saisie n'est pas valide : corrige-la avant de changer de ligne, ou Échap pour l'abandonner."
    : "Modifications en cours : valide-les ou abandonne-les."); m.className = "dn-message erreur"; }
  panneau.classList.remove("signale");
  void panneau.offsetWidth;
  panneau.classList.add("signale");
}

// garder : la ligne de l'élément fermé reste sélectionnée (Échap, ×)
function fermer(garder = false) {
  retenu = garder ? aRetenir(sel) : null;
  sel = null;
  modifiee = false;
  clearTimeout(minuterieSaisie);
  minuterieSaisie = null;
  coches.clear();
  derniereCoche = -1;
  panneau.classList.remove("ouvert");
  panneau.innerHTML = "";
  majChoisies();
  majCoches();
}

// Échap ou × : un élément existant se ferme en gardant sa ligne sélectionnée ; une saisie invalide y est abandonnée
// (elle n'a jamais été appliquée) ; un formulaire à valider (nouvel élément, relier…) avec des changements le signale
function fermerDetail() {
  if (!sel) return;
  appliquerMaintenant();
  if (!modifiee || direct()) fermer(direct());
  else signaler();
}

function ouvrir(s, message = "") {
  if (LECTURE_SEULE && (["serie", "lot", "relier"].includes(s.type) || !(s.ev || s.p || s.nom))) return;
  // un autre élément que celui affiché : le panneau revient en haut
  const meme = sel && sel.type === s.type && (sel.ev || sel.p || sel.nom || null) === (s.ev || s.p || s.nom || null);
  clearTimeout(minuterieSaisie);
  minuterieSaisie = null;
  sel = s;
  retenu = null;
  modifiee = false;
  if (s.type !== "serie") { coches.clear(); derniereCoche = -1; }
  if (s.type === "serie") panneau.innerHTML = formSerie();
  else if (s.type === "ev") panneau.innerHTML = formEvenement(s);
  else if (s.type === "p") panneau.innerHTML = formPeriode(s);
  else if (s.type === "g") panneau.innerHTML = formGroupe(s);
  else if (s.type === "t") panneau.innerHTML = formTheme(s);
  else if (s.type === "lot") panneau.innerHTML = formLot();
  else panneau.innerHTML = formRelier(s);
  panneau.classList.add("ouvert");
  panneau.classList.toggle("large", s.type === "lot");
  if (!meme) panneau.scrollTop = 0;
  if (message) { const m = panneau.querySelector(".dn-message"); m.textContent = message; m.className = "dn-message ok"; }
  majAides();
  zone.querySelectorAll("tr[data-i]").forEach((tr) => tr.classList.toggle("choisie", estChoisi(lignes[Number(tr.dataset.i)])));
  majCoches();
  panneau.querySelectorAll("[data-partiel]").forEach((c) => (c.indeterminate = true));
  if (s.type === "lot") champ("lot").focus();
  else if (s.type !== "relier" && !(s.ev || s.p || s.nom)) panneau.querySelector("input[type=text]")?.focus();
  if (LECTURE_SEULE) verrouiller(panneau);         // une fois tout dessiné (les puces le sont par majAides)
}

const champ = (nom) => panneau.querySelector(`[name="${nom}"]`);
const valeur = (nom) => champ(nom)?.value ?? "";
const coche = (nom) => !!champ(nom)?.checked;

function entetePanneau(titre, sousTitre = "") {
  return `<div class="dn-form-tete"><h3>${echapper(titre)}</h3><button class="dn-fermer" data-action="abandonner" aria-label="${t("Fermer")}">×</button></div>
    ${sousTitre ? `<p class="dn-sous-titre">${sousTitre}</p>` : ""}<p class="dn-message"></p>`;
}

// Élément existant (supprimable) : enregistré au fil de la saisie, seuls restent Supprimer et les actions ;
// nouvel élément : « Ajouter » ; « Relier à une fin » (action) : Valider et Abandonner.
function boutons(supprimable, extra = "", action = false) {
  const principaux = action
    ? `<button class="bouton principal" data-action="valider">${t("Valider")}</button>
       <button class="bouton discret" data-action="abandonner">${t("Abandonner")}</button>`
    : supprimable ? `<button class="bouton danger" data-action="supprimer">${t("Supprimer")}</button>`
    : `<button class="bouton principal" data-action="valider">${t("Ajouter")}</button>`;
  return `<div class="dn-boutons">${principaux}${action || !extra ? "" : extra}</div>`;
}

function choixDeGroupes(gs) {
  choixGroupes = [...(gs || [])];
  return `<div class="dn-champ"><span>${t("Groupes <em>le premier donne la couleur du texte</em>")}</span><div class="dn-groupes"></div></div>`;
}

function choixDeThemes(ts) {
  choixThemes = [...(ts || [])];
  return `<div class="dn-champ"><span>${t("Thèmes <em>un ou plusieurs</em>")}</span><div class="dn-themes"></div></div>`;
}

// Thèmes : un clic ajoute ou retire ; ils restent dans l'ordre de la liste des thèmes
function dessinerChoixThemes() {
  const el = panneau.querySelector(".dn-themes");
  if (!el) return;
  el.innerHTML = index.themes.map((th) => `<button type="button" class="puce-choix theme${choixThemes.includes(th) ? " choisi" : ""}" data-theme="${echapper(th)}"
    title="${t(choixThemes.includes(th) ? "Retirer ce thème" : "Ajouter ce thème")}"><i></i>${echapper(th)}</button>`).join("")
    || `<span class="dn-aide">${t("Aucun thème : on les crée dans l'onglet Thèmes.")}</span>`;
}

function dessinerChoixGroupes() {
  const el = panneau.querySelector(".dn-groupes");
  if (!el) return;
  const puce = (nom, choisi, k) => `<button type="button" class="puce-choix${choisi ? " choisi" : ""}" data-groupe="${echapper(nom)}" style="--ct:${groupe(nom).affichage}"
      title="${t(choisi ? (k ? "Clic : en faire le groupe principal" : "Groupe principal") : "Ajouter ce groupe")}">
      <i></i>${echapper(nom)}${choisi && !k && choixGroupes.length > 1 ? ` <small>${t("principal")}</small>` : ""}${choisi ? `<span class="retirer" data-retirer title="${t("Retirer")}">×</span>` : ""}</button>`;
  const autres = Object.keys(etat.donnees.groupes).filter((g) => !choixGroupes.includes(g));
  el.innerHTML = `<div class="dn-choisis">${choixGroupes.length ? choixGroupes.map((g, k) => puce(g, true, k)).join("") : `<span class="dn-aide">${t("Aucun groupe")}</span>`}</div>
    <div class="dn-dispo">${autres.map((g) => puce(g, false)).join("")}</div>`;
}

// Formulaire d'évènement
function formEvenement({ ev, date }) {
  const nouveau = !ev;
  // un nouvel évènement reprend le lieu et le thème du filtre s'il n'y en a qu'un
  const seul = (f, sans) => (f.size === 1 ? [...f].filter((x) => x !== sans) : []);
  ev = ev || { label: "", groupes: seul(etat.filtre, SANS_GROUPE), themes: seul(etat.filtreThemes, SANS_THEME), limite: null, regne: false, comment: null };
  const extra = nouveau ? "" : `${boutonFrise()}
    <button class="bouton discret" data-action="relier" title="${t("Faire de cet évènement une époque, avec une barre de durée jusqu'à sa fin")}">${t("Relier à une fin…")}</button>`;
  return `<div class="dn-form">
    ${entetePanneau(t(nouveau ? "Nouvel évènement" : "Évènement"))}
    <div class="dn-champ"><span>${t("Date")}</span>
      <div class="dn-date"><input type="text" name="date" value="${echapper(date?.date ?? "")}" autocomplete="off" spellcheck="false" aria-label="${t("Date")}">
        <label class="dn-case"><input type="checkbox" name="approx"${ev.approx ? " checked" : ""}> ${t("Approximative")}</label></div>
      <span class="dn-aide" data-aide="date"></span></div>
    <label class="dn-champ"><span>${t("Nom")}</span><input type="text" name="label" value="${echapper(ev.label)}" autocomplete="off"></label>
    ${choixDeGroupes(ev.groupes)}
    <label class="dn-champ"><span>${t("Description")}</span><textarea name="comment" rows="9">${echapper(ev.comment ?? "")}</textarea></label>
    ${choixDeThemes(ev.themes)}
    <div class="dn-ligne">
      <label class="dn-champ"><span>${t("Début ou fin d'époque")}</span><select name="limite">
        <option value="">${t("Non")}</option><option value="debut"${ev.limite === "debut" ? " selected" : ""}>${t("Début d'époque")}</option>
        <option value="fin"${ev.limite === "fin" ? " selected" : ""}>${t("Fin d'époque")}</option></select></label>
      <label class="dn-case"><input type="checkbox" name="regne"${ev.regne ? " checked" : ""}> ${t("Début de règne")}</label>
      <label class="dn-case"><input type="checkbox" name="important"${ev.important ? " checked" : ""}> ${t("★ Important")}</label>
    </div>
    ${editeurSources(ev.sources)}
    ${boutons(!nouveau, extra)}
  </div>`;
}

// Sources : titre, lien et citation, tous facultatifs (une source vide est ignorée)
function editeurSources(sources) {
  return `<div class="dn-champ"><span>${t("Sources <em>affichées quand la popup s'épingle (3 s de survol ou double-clic)</em>")}</span>
    <div class="dn-sources">${(sources || []).map(htmlSource).join("")}
      <button type="button" class="bouton discret petit" data-action="ajouter-source">${t("+ Ajouter une source")}</button></div></div>`;
}

function htmlSource(s = {}) {
  return `<div class="dn-source">
    <div class="dn-source-ligne"><input type="text" data-source="titre" placeholder="${t("Titre (ex. Wikipédia, Ancien Empire)")}" value="${echapper(s.titre ?? "")}">
      <button type="button" class="dn-fermer" data-action="retirer-source" title="${t("Retirer cette source")}" aria-label="${t("Retirer cette source")}">×</button></div>
    <input type="text" data-source="lien" placeholder="${t("Lien (https://…)")}" value="${echapper(s.lien ?? "")}" spellcheck="false">
    <textarea data-source="citation" rows="2" placeholder="${t("Citation")}">${echapper(s.citation ?? "")}</textarea>
  </div>`;
}

function lireSources() {
  return [...panneau.querySelectorAll(".dn-source")].map((el) => {
    const s = {};
    for (const k of ["titre", "lien", "citation"]) {
      const v = el.querySelector(`[data-source="${k}"]`).value.trim();
      if (v) s[k] = v;
    }
    if (s.lien) s.lien = completerLien(s.lien);
    return s;
  }).filter((s) => Object.keys(s).length);
}

// « fr.wikipedia.org/… » suffit : on ajoute https:// s'il manque
const completerLien = (lien) => (/^[a-z][a-z0-9+.-]*:/i.test(lien) ? lien : `https://${lien}`);

// « sources » n'est écrit dans le fichier que s'il y en a
function marquerSources(o, sources) { marquerListe(o, "sources", sources); }

// Formulaire de période
function formPeriode({ p }) {
  const nouveau = !p;
  p = p || { label: "", type: "epoque", groupes: [], sous_titre: null, debut: "", fin: "", debut_deduit: false, regne: false, comment: null };
  return `<div class="dn-form">
    ${entetePanneau(t(nouveau ? "Nouvelle période" : "Période"))}
    <label class="dn-champ"><span>${t("Type")}</span><select name="type">
      <option value="epoque"${p.type === "epoque" ? " selected" : ""}>${t("Époque : barre de durée dans la colonne de son lieu")}</option>
      <option value="section"${p.type === "section" ? " selected" : ""}>${t("Ligne spéciale : éon, ère, période…")}</option></select></label>
    <label class="dn-champ"><span>${t("Nom")}</span><input type="text" name="label" value="${echapper(p.label)}" autocomplete="off"></label>
    <label class="dn-champ"><span>${t("Sous-titre")}</span><input type="text" name="sous_titre" value="${echapper(p.sous_titre ?? "")}" autocomplete="off"></label>
    ${choixDeGroupes(p.groupes)}
    <div class="dn-ligne">
      <div class="dn-champ"><span>${t("Début")}</span><input type="text" name="debut" value="${echapper(p.debut ?? "")}" autocomplete="off" spellcheck="false" aria-label="${t("Début")}">
        <span class="dn-aide" data-aide="debut"></span>
        <label class="dn-case"><input type="checkbox" name="debut_approx"${p.debut_approx ? " checked" : ""}> ${t("Approximatif")}</label></div>
      <div class="dn-champ"><span>${t("Fin")}</span><input type="text" name="fin" value="${echapper(p.fin ?? "")}" autocomplete="off" spellcheck="false" aria-label="${t("Fin")}">
        <span class="dn-aide" data-aide="fin"></span>
        <label class="dn-case"><input type="checkbox" name="fin_approx"${p.fin_approx ? " checked" : ""}> ${t("Approximative")}</label></div>
    </div>
    <label class="dn-champ"><span>${t("Description")}</span><textarea name="comment" rows="8">${echapper(p.comment ?? "")}</textarea></label>
    ${choixDeThemes(p.themes)}
    <div class="dn-ligne">
      <label class="dn-case"><input type="checkbox" name="regne"${p.regne ? " checked" : ""}> ${t("Début de règne")}</label>
      <label class="dn-case"><input type="checkbox" name="important"${p.important ? " checked" : ""}> ${t("★ Important")}</label>
      <label class="dn-case" data-section-seule><input type="checkbox" name="debut_deduit"${p.debut_deduit ? " checked" : ""}> ${t("Début déduit, à vérifier")}</label>
    </div>
    ${editeurSources(p.sources)}
    ${boutons(!nouveau, nouveau ? "" : boutonFrise())}
  </div>`;
}

const boutonFrise = () => `<button class="bouton discret" data-action="frise" title="${t("Raccourci : Alt + clic sur la ligne")}">${t("Voir dans la frise")}</button>`;

// Formulaire de groupe
function formGroupe({ nom }) {
  const nouveau = !nom;
  const g = nouveau ? { couleur: "#C8C8C8", type: "lieu" } : etat.donnees.groupes[nom];
  const c = nouveau ? { ev: 0, p: 0 } : comptesGroupes()[nom];
  const autres = Object.keys(etat.donnees.groupes).filter((x) => x !== nom);
  const suppression = nouveau ? "" : `
    <div class="dn-suppression">
      <label class="dn-champ"><span>${t("En cas de suppression, ses {ev} et {p} passent dans", { ev: tn(c.ev, "{n} évènement", "{n} évènements"), p: tn(c.p, "{n} période", "{n} périodes") })}</span>
        <select name="remplacant"><option value="">${t("Aucun groupe")}</option>${autres.map((x) => `<option>${echapper(x)}</option>`).join("")}</select></label>
    </div>`;
  return `<div class="dn-form">
    ${entetePanneau(t(nouveau ? "Nouveau groupe" : "Groupe"))}
    <label class="dn-champ"><span>${t("Nom")}</span><input type="text" name="nom" value="${echapper(nom ?? "")}" autocomplete="off"></label>
    <label class="dn-champ"><span>${t("Description <em>ce qu'il couvre ; affichée au survol dans le panneau de gauche</em>")}</span><textarea name="description" rows="4">${echapper(g.description ?? "")}</textarea></label>
    <div class="dn-ligne">
      <label class="dn-champ"><span>${t("Type")}</span><select name="type">
        <option value="lieu"${g.type === "lieu" ? " selected" : ""}>${t("Lieu")}</option>
        <option value="echelle"${g.type === "echelle" ? " selected" : ""}>${t("Échelle")}</option></select></label>
      <label class="dn-champ"><span>${t("Couleur")}</span><span class="dn-couleur"><input type="color" name="couleur" value="${g.couleur.toLowerCase()}">
        <input type="text" name="couleur_texte" value="${echapper(g.couleur)}" spellcheck="false"></span></label>
    </div>
    <div class="dn-champ"><span>${t("Aperçu dans la frise")}</span><div class="dn-apercu"></div>
      <span class="dn-aide">${t("Choisir la couleur comme pour un fond blanc ; elle est adaptée au thème, clair ou sombre, à l'affichage.")}</span></div>
    ${suppression}
    ${boutons(!nouveau)}
  </div>`;
}

// Formulaire « Relier à une fin »
function candidatsFin(ev, date) {
  const g0 = ev.groupes[0];
  const mots = new Set(normaliser(ev.label).split(/[^a-z0-9]+/).filter((m) => m.length >= 5 && !MOTS_VIDES.has(m)));
  const r = [];
  for (const x of etat.donnees.dates) {
    if (x.annee == null || date.annee == null || instantDe(x) <= instantDe(date)) continue;
    for (const e of x.evenements) {
      if (e === ev || (g0 && e.groupes[0] !== g0)) continue;
      const commun = normaliser(e.label).split(/[^a-z0-9]+/).some((m) => mots.has(m));
      r.push({ ev: e, date: x, probable: e.limite === "fin" && commun });
    }
  }
  // la fin probable (même nom, marquée « fin ») en tête de liste, puis l'ordre chronologique
  return [...r.filter((c) => c.probable), ...r.filter((c) => !c.probable)].slice(0, 80);
}

function formRelier({ ev, date }) {
  const candidats = candidatsFin(ev, date);
  sel.candidats = candidats;
  const probable = candidats.findIndex((c) => c.probable);
  const nom = ev.label.replace(/^début (du |de la |de l'|de l’|des |d'|d’|de )/i, "").replace(/^(start|beginning) of (the )?/i, "");
  return `<div class="dn-form">
    ${entetePanneau(t("Relier à une fin"), `<b>${echapper(ev.label)}</b> · ${echapper(dateAffichee(date.date, ev.approx))}`)}
    <p class="dn-aide">${t("Crée une époque (barre de durée dans la frise) et retire cet évènement de la liste des dates.")}</p>
    <label class="dn-champ"><span>${t("Nom de l'époque")}</span><input type="text" name="label" value="${echapper(nom.charAt(0).toUpperCase() + nom.slice(1))}" autocomplete="off"></label>
    <div class="dn-champ"><span>${ev.groupes[0] ? t("Fin : un évènement du groupe {g} ou une date", { g: echapper(ev.groupes[0]) }) : t("Fin : un évènement ou une date")}</span>
      <div class="dn-candidats">
        <label class="dn-candidat autre"><input type="radio" name="fin" value="autre"${probable < 0 ? " checked" : ""}>
          <span>${t("Autre date")}</span><input type="text" name="fin_texte" autocomplete="off" spellcheck="false" placeholder="${DATES_EXEMPLES}"></label>
        <span class="dn-aide" data-aide="fin_texte"></span>
        ${candidats.map((c, k) => `<label class="dn-candidat"><input type="radio" name="fin" value="${k}"${k === probable ? " checked" : ""}>
          <span class="c-date">${echapper(dateAffichee(c.date.date, c.ev.approx))}</span><span class="${c.ev.limite ? "fort" : ""}" style="color:${groupe(c.ev.groupes[0] || SANS_GROUPE).affichage}">${echapper(c.ev.label)}</span>
          ${c.ev.limite === "fin" ? etiquette(t("fin")) : ""}</label>`).join("") || `<span class="dn-aide">${t("Aucun évènement plus tardif dans ce groupe.")}</span>`}
      </div></div>
    <label class="dn-case"><input type="checkbox" name="retirer_fin"${probable >= 0 ? " checked" : ""}> ${t("Retirer aussi l'évènement de fin de la liste des dates")}</label>
    ${boutons(false, "", true)}
  </div>`;
}

// Formulaire de modification en série : chaque changement s'applique tout de suite à toutes les lignes cochées
const nomSerie = (n) => (courant === "evenements" ? tn(n, "{n} évènement", "{n} évènements") : tn(n, "{n} période", "{n} périodes"));

function formSerie() {
  const liste = [...coches], n = liste.length, ev = courant === "evenements";
  const visibles = new Set(lignes.map(objet));
  const masques = liste.filter((o) => !visibles.has(o)).length;
  const combien = (f) => liste.filter(f).length;
  // puce de groupe ou de thème : pleine si toutes les lignes l'ont, « k/n » si seulement une partie
  const puce = (cle, nom) => {
    const k = combien((o) => (o[cle] || []).includes(nom));
    const attr = cle === "groupes" ? `data-serie-groupe="${echapper(nom)}" style="--ct:${groupe(nom).affichage}"` : `data-serie-theme="${echapper(nom)}"`;
    return `<button type="button" class="puce-choix${cle === "themes" ? " theme" : ""}${k === n ? " choisi" : k ? " partiel" : ""}" ${attr}
      title="${k === n ? t("Retirer de toutes les lignes cochées") : t("Ajouter aux lignes cochées") + (k ? " " + t("(déjà sur {n})", { n: k }) : "")}"><i></i>${echapper(nom)}${k && k < n ? ` <small>${k}/${n}</small>` : ""}</button>`;
  };
  const caseSerie = (cle, libelle, k) => `<label class="dn-case"><input type="checkbox" data-serie="${cle}"${k === n ? " checked" : ""}${k && k < n ? " data-partiel" : ""}>
    ${libelle}${k && k < n ? ` <small>${k}/${n}</small>` : ""}</label>`;
  const groupes = Object.keys(etat.donnees.groupes);
  return `<div class="dn-form dn-serie">
    ${entetePanneau(t("Modification en série"), (ev ? tn(n, "<b>{n} évènement</b> coché", "<b>{n} évènements</b> cochés") : tn(n, "<b>{n} période</b> cochée", "<b>{n} périodes</b> cochées"))
      + (!masques ? "" : ev ? tn(masques, ", dont {n} masqué par la recherche ou le filtre", ", dont {n} masqués par la recherche ou le filtre")
        : tn(masques, ", dont {n} masquée par la recherche ou le filtre", ", dont {n} masquées par la recherche ou le filtre")))}
    <p class="dn-aide">${t("Chaque changement s'applique tout de suite à toutes les lignes cochées ; <b>Annuler</b> le défait en une fois. Clic sur une ligne : la cocher ou la décocher ; Maj + clic : toute une plage. Au clavier : ↑ ↓ pour passer d'une ligne à l'autre, Espace pour la cocher ou la décocher.")}</p>
    <div class="dn-champ"><span>${t("Groupes <em>clic : ajouter partout ; s'il est déjà partout, le retirer</em>")}</span>
      <div class="dn-puces">${groupes.map((x) => puce("groupes", x)).join("") || `<span class="dn-aide">${t("Aucun groupe : on les crée dans l'onglet Groupes.")}</span>`}</div></div>
    <div class="dn-champ"><span>${t("Thèmes")}</span>
      <div class="dn-puces">${index.themes.map((x) => puce("themes", x)).join("") || `<span class="dn-aide">${t("Aucun thème : on les crée dans l'onglet Thèmes.")}</span>`}</div></div>
    <div class="dn-ligne">
      ${caseSerie("important", t("★ Important"), combien((o) => o.important))}
      ${caseSerie("approx", t(ev ? "Date approximative" : "Dates approximatives"), combien((o) => (ev ? o.approx : o.debut_approx)))}
    </div>
    <div class="dn-boutons">
      <button class="bouton danger" data-action="supprimer">${ev ? tn(n, "Supprimer {n} évènement", "Supprimer les {n} évènements") : tn(n, "Supprimer {n} période", "Supprimer les {n} périodes")}</button>
      <button class="bouton discret" data-action="abandonner">${t("Tout décocher")}</button>
    </div>
  </div>`;
}

// Groupe ou thème : ajouté aux lignes qui ne l'ont pas, ou retiré de toutes s'il est déjà partout
function basculerSerie(cle, nom) {
  const liste = [...coches];
  const partout = liste.every((o) => (o[cle] || []).includes(nom));
  const cibles = liste.filter((o) => (o[cle] || []).includes(nom) === partout);
  modifier(() => cibles.forEach((o) => {
    if (cle === "groupes") o.groupes = partout ? o.groupes.filter((x) => x !== nom) : [...o.groupes, nom];   // ajouté en dernier : la couleur ne change pas
    else marquerListe(o, "themes", partout ? o.themes.filter((x) => x !== nom) : index.themes.filter((x) => x === nom || (o.themes || []).includes(x)));
  }));
  majSerie(t(partout ? "{nom} : retiré de {cible}." : "{nom} : ajouté à {cible}.", { nom, cible: nomSerie(cibles.length) }));
}

// « Important » ou « approximatif » : mis ou retiré sur toutes les lignes cochées
function marquerSerie(cle, oui) {
  const ev = courant === "evenements";
  const a = (o) => !!(cle === "important" ? o.important : ev ? o.approx : o.debut_approx);
  const cibles = [...coches].filter((o) => a(o) !== oui);
  if (!cibles.length) return majSerie();
  modifier(() => cibles.forEach((o) => {
    if (cle === "important") marquerImportant(o, oui);
    else if (ev) marquer(o, "approx", oui);
    else { marquer(o, "debut_approx", oui); marquer(o, "fin_approx", oui && !!o.fin && o.fin_annee != null); }
  }));
  const quoi = cle === "important" ? "Étoile" : ev ? "Date approximative" : "Dates approximatives";
  const e = cle !== "important" && !ev ? "es" : "e";               // « Dates approximatives : ajoutées »
  majSerie(t(`${quoi} : ${oui ? `ajouté${e} à` : `retiré${e} de`} {cible}.`, { cible: nomSerie(cibles.length) }));
}

// Mises à jour en direct pendant la saisie
function saisiePanneau(e) {
  if (LECTURE_SEULE) return;
  if (sel?.type === "serie") {
    if (e.type === "change" && e.target.dataset.serie) marquerSerie(e.target.dataset.serie, e.target.checked);
    return;
  }
  modifiee = true;
  const m = panneau.querySelector(".dn-message");
  if (m && m.classList.contains("ok")) { m.textContent = ""; m.className = "dn-message"; }
  if (direct()) {
    // texte : après une pause ; case, liste, couleur : tout de suite
    const texte = e.type === "input" && e.target.matches("input[type=text], textarea");
    programmerApplication(e.target.name || e.target.dataset.source || "sources", texte ? PAUSE_SAISIE : 0);
  }
  if (e.target.name === "couleur") champ("couleur_texte").value = e.target.value.toUpperCase();
  if (e.target.name === "couleur_texte" && /^#[0-9a-f]{6}$/i.test(e.target.value)) champ("couleur").value = e.target.value.toLowerCase();
  if (e.target.name === "fin" && sel?.type === "relier") {
    const c = sel.candidats[Number(e.target.value)];
    champ("retirer_fin").checked = !!c && c.ev.limite === "fin";
  }
  if (e.target.name === "fin_texte") champ("fin").value = "autre";
  if (e.target.name === "debut" && champ("debut_deduit")) champ("debut_deduit").checked = false;
  const caseApprox = { date: "approx", debut: "debut_approx", fin: "fin_approx" }[e.target.name];
  if (caseApprox && champ(caseApprox) && lireApprox(e.target.value).approx) champ(caseApprox).checked = true;
  majAides();
}

function majAides() {
  dessinerChoixGroupesSiBesoin();
  const aide = (nom, fin = false) => {
    const el = panneau.querySelector(`[data-aide="${nom}"]`);
    if (!el) return;
    const v = lireDate(valeur(nom), fin);
    el.className = "dn-aide" + (v.ok || v.vide ? "" : " erreur");
    el.textContent = v.vide ? (fin ? t("Vide : fin inconnue") : EXEMPLES)
      : !v.ok ? `${t("Date non comprise.")} ${EXEMPLES}`
      : v.annee == null ? t("Jusqu'à aujourd'hui")
      : v.mois ? t("Compris : {date}", { date: formatDate(v) }) : t("Année {a}", { a: formatAnnee(v.annee) });
  };
  aide("date"); aide("debut"); aide("fin", true); aide("fin_texte");
  if (sel?.type === "lot") majApercuLot();
  const typeP = champ("type")?.value;
  panneau.querySelectorAll("[data-section-seule]").forEach((el) => (el.hidden = typeP !== "section"));
  const apercu = panneau.querySelector(".dn-apercu");
  if (apercu) {
    const c = /^#[0-9a-f]{6}$/i.test(valeur("couleur_texte")) ? valeur("couleur_texte") : valeur("couleur");
    apercu.innerHTML = `<span class="ev" style="--ct:${couleurAffichage(c)}">${echapper(valeur("nom") || t("Nom du groupe"))}</span>`;
  }
}

let groupesDessines = null, themesDessines = null;
function dessinerChoixGroupesSiBesoin() {
  const el = panneau.querySelector(".dn-groupes");
  if (el && groupesDessines !== el) { groupesDessines = el; dessinerChoixGroupes(); }
  const et = panneau.querySelector(".dn-themes");
  if (et && themesDessines !== et) { themesDessines = et; dessinerChoixThemes(); }
}

function clicPanneau(e) {
  if (LECTURE_SEULE && !e.target.closest(NAVIGATION)) return;
  const ps = e.target.closest("[data-serie-groupe], [data-serie-theme]");
  if (ps) return ps.dataset.serieGroupe != null ? basculerSerie("groupes", ps.dataset.serieGroupe) : basculerSerie("themes", ps.dataset.serieTheme);
  const puce = e.target.closest(".puce-choix");
  if (puce && "theme" in puce.dataset) {
    const t = puce.dataset.theme;
    choixThemes = choixThemes.includes(t) ? choixThemes.filter((x) => x !== t) : index.themes.filter((x) => x === t || choixThemes.includes(x));
    modifiee = true;
    dessinerChoixThemes();
    if (direct()) programmerApplication("themes", 0);
    return;
  }
  if (puce) {
    const nom = puce.dataset.groupe, k = choixGroupes.indexOf(nom);
    if (e.target.closest("[data-retirer]")) choixGroupes.splice(k, 1);
    else if (k < 0) choixGroupes.push(nom);
    else if (k > 0) { choixGroupes.splice(k, 1); choixGroupes.unshift(nom); }
    modifiee = true;
    dessinerChoixGroupes();
    if (direct()) programmerApplication("groupes", 0);
    return;
  }
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const action = b.dataset.action;
  if (action === "abandonner") {
    if (direct()) return fermerDetail();
    appliquerMaintenant();
    if (modifiee && (sel.ev || sel.p || sel.nom) && sel.type !== "relier") ouvrir({ ...sel });   // revient aux valeurs enregistrées
    else fermer(sel.type === "relier");
  }
  else if (action === "valider") valider();
  else if (action === "supprimer") {
    if (!b.classList.contains("confirmer")) { b.classList.add("confirmer"); b.textContent = t("Confirmer la suppression"); return; }
    supprimer();
  }
  else if (action === "frise") voirDansFrise(sel);
  else if (action === "relier" && quitterFormulaire()) ouvrir({ type: "relier", ev: sel.ev, date: sel.date });
  else if (action === "ajouter-source") {
    b.insertAdjacentHTML("beforebegin", htmlSource());
    b.previousElementSibling.querySelector("input").focus();
    modifiee = true;
  }
  else if (action === "retirer-source") { b.closest(".dn-source").remove(); modifiee = true; if (direct()) programmerApplication("sources", 0); }
  else if (action === "modele-json" || action === "modele-texte") {
    champ("lot").value = action === "modele-json" ? MODELE_JSON : EXEMPLE_LOT;
    modifiee = true;
    majAides();
  }
}

function erreur(texte) {
  const m = panneau.querySelector(".dn-message");
  m.textContent = texte;
  m.className = "dn-message erreur";
  return false;
}

// ─── Application en direct (élément existant) ───

function programmerApplication(champ, delai) {
  champSaisi = champ;
  clearTimeout(minuterieSaisie);
  minuterieSaisie = delai ? setTimeout(appliquerMaintenant, delai) : null;
  if (!delai) appliquer();
}

// ce qui attend encore (saisie en cours) est appliqué tout de suite : avant de changer de ligne, de fermer…
function appliquerMaintenant() {
  if (minuterieSaisie) { clearTimeout(minuterieSaisie); minuterieSaisie = null; }
  if (direct() && modifiee) appliquer();
}

function appliquer() {
  minuterieSaisie = null;
  if (!direct()) return;
  const r = { objet: sel.ev || sel.p || sel.nom, champ: champSaisi };
  const ok = sel.type === "ev" ? validerEvenement(r) : sel.type === "p" ? validerPeriode(r) : sel.type === "g" ? validerGroupe(r) : validerTheme(r);
  if (ok === false) return;                   // erreur affichée (date non comprise…) : rien n'est appliqué pour l'instant
  modifiee = false;
  const m = panneau.querySelector(".dn-message");
  if (m && m.classList.contains("erreur")) { m.textContent = ""; m.className = "dn-message"; }
}

// ─── Validation et modifications ───

function valider() {
  if (!sel || sel.type === "serie") return;
  if (sel.type === "ev") return validerEvenement();
  if (sel.type === "p") return validerPeriode();
  if (sel.type === "g") return validerGroupe();
  if (sel.type === "t") return validerTheme();
  if (sel.type === "lot") return validerLot();
  return validerRelier();
}

function validerEvenement(vif = null) {
  const saisie = lireApprox(valeur("date"));      // « ~ 1453 » : préfixe retiré, date marquée approximative
  const sources = lireSources();
  const date = lireDate(saisie.texte);
  const label = valeur("label").trim();
  if (!date.ok) return erreur(date.vide ? t("Indique une date.") : `${t("Date non comprise.")} ${EXEMPLES}`);
  if (!label) return erreur(t("Indique un nom."));
  const valeurs = {
    label, groupes: [...choixGroupes], limite: valeur("limite") || null, regne: coche("regne"),
    comment: valeur("comment").trim() || null,
  };
  const nouveau = !sel.ev;
  const place = modifier((d) => {
    const ev = sel.ev || {};
    Object.assign(ev, valeurs);
    marquerImportant(ev, coche("important"));
    marquer(ev, "approx", coche("approx") || saisie.approx);
    marquerSources(ev, sources);
    marquerListe(ev, "themes", choixThemes);
    const x = placerEvenement(d, ev, sel.date, date);
    if (vif) sel.date = x;            // avant que la frise et les tables se redessinent (la ligne a pu changer)
    return { ev, date: x };
  }, vif);
  if (!vif) ouvrir({ type: "ev", ...place }, t(nouveau ? "Évènement ajouté." : "Modification faite."));
}

// Range l'évènement sur la ligne de sa date : ligne existante de même année, ou nouvelle ligne.
// Une ligne qui se vide est supprimée ; dates reste trié par année.
// v : la date lue ({ texte, annee, mois, jour }) ; deux lignes sont la même date si année, mois et jour sont égaux.
function placerEvenement(d, ev, ancienne, v) {
  const texte = v.texte, annee = v.annee;
  const meme = (x) => (annee != null ? x.annee === annee && (x.mois || 0) === (v.mois || 0) && (x.jour || 0) === (v.jour || 0) : x.date === texte);
  if (ancienne) {
    if (ancienne.date === texte) return ancienne;
    if (meme(ancienne) && ancienne.evenements.length === 1) { ecrireDate(ancienne, v); return ancienne; }
    ancienne.evenements.splice(ancienne.evenements.indexOf(ev), 1);
    if (!ancienne.evenements.length) d.dates.splice(d.dates.indexOf(ancienne), 1);
  }
  let cible = d.dates.find(meme);
  if (!cible) {
    cible = {};
    ecrireDate(cible, v);              // date, annee, mois, jour, puis les évènements
    cible.evenements = [];
    d.dates.push(cible);
    trierDates(d);
  }
  cible.evenements.push(ev);
  return cible;
}

function validerPeriode(vif = null) {
  const type = valeur("type");
  const label = valeur("label").trim();
  const sd = lireApprox(valeur("debut")), sf = lireApprox(valeur("fin"));
  const sources = lireSources();
  const debut = lireDate(sd.texte), fin = lireDate(sf.texte, true);
  if (!label) return erreur(t("Indique un nom."));
  if (!debut.ok) return erreur(debut.vide ? t("Indique un début.") : `${t("Début non compris.")} ${EXEMPLES}`);
  if (!fin.ok) return erreur(`${t("Fin non comprise.")} ${EXEMPLES}, ${t("ou « aujourd'hui ».")}`);
  if (fin.annee != null && fin.instFin < debut.inst) return erreur(t("La fin précède le début."));
  const nouveau = !sel.p;
  const p = modifier((d) => {
    const p = sel.p || {};
    // même ordre des clés que dans le fichier
    const v = {
      label, type, groupes: [...choixGroupes], sous_titre: valeur("sous_titre").trim() || null,
      debut: debut.texte, debut_annee: debut.annee, fin: fin.texte, fin_annee: fin.annee,
      debut_deduit: type === "section" && coche("debut_deduit"), regne: coche("regne"), comment: valeur("comment").trim() || null,
    };
    for (const k of Object.keys(p)) delete p[k];
    Object.assign(p, v);
    ecrireDate(p, debut, "debut_");      // ajoute debut_mois / debut_jour s'ils sont connus
    ecrireDate(p, fin, "fin_");
    marquerImportant(p, coche("important"));
    marquer(p, "debut_approx", coche("debut_approx") || sd.approx);
    marquer(p, "fin_approx", !!fin.texte && (coche("fin_approx") || sf.approx));
    marquerSources(p, sources);
    marquerListe(p, "themes", choixThemes);
    if (nouveau) d.periodes.push(p);
    return p;
  }, vif);
  if (!vif) ouvrir({ type: "p", p }, t(nouveau ? "Période ajoutée." : "Modification faite."));
}

function validerGroupe(vif = null) {
  const nom = valeur("nom").trim();
  const couleur = (/^#[0-9a-f]{6}$/i.test(valeur("couleur_texte")) ? valeur("couleur_texte") : valeur("couleur")).toUpperCase();
  const type = valeur("type");
  const ancien = sel.nom;
  if (!nom) return erreur(t("Indique un nom."));
  if (nom === SANS_GROUPE || nom === t(SANS_GROUPE)) return erreur(t("« {nom} » est réservé.", { nom }));
  if (nom !== ancien && nom in etat.donnees.groupes) return erreur(t("Ce nom est déjà pris."));
  if (ancien && nom !== ancien) renommerDansFiltre(ancien, nom);
  modifier((d) => {
    const g = { couleur, type };
    const description = valeur("description").trim();
    if (description) g.description = description;
    if (!ancien) { d.groupes[nom] = g; return; }
    d.groupes = Object.fromEntries(Object.entries(d.groupes).map(([k, v]) => (k === ancien ? [nom, g] : [k, v])));
    if (nom !== ancien) remplacerGroupe(d, ancien, nom);
    if (vif) sel.nom = nom;
  }, vif && { objet: "groupe", champ: vif.champ });
  if (!vif) ouvrir({ type: "g", nom }, t(!ancien ? "Groupe ajouté." : nom !== ancien ? "Groupe renommé partout." : "Modification faite."));
}

// Les marques facultatives (important, approx, debut_approx, fin_approx) ne sont écrites dans le fichier que si elles sont vraies
function marquer(o, cle, oui) {
  if (oui) o[cle] = true;
  else delete o[cle];
}
const marquerImportant = (o, oui) => marquer(o, "important", oui);
// Les listes facultatives (themes, sources) ne sont écrites que si elles ne sont pas vides
function marquerListe(o, cle, liste) {
  if (liste && liste.length) o[cle] = [...liste];
  else delete o[cle];
}

function basculerImportant(item) {
  const o = item.type === "ev" ? item.ev : item.p;
  modifier(() => marquerImportant(o, !o.important));
  if (sel && !modifiee && (sel.ev === o || sel.p === o)) ouvrir({ ...sel });   // formulaire ouvert sur le même élément
  else if (sel?.type === "serie") majSerie();                                       // compte des étoiles à jour
}

function remplacerGroupe(d, ancien, nouveau) {
  const r = (gs) => [...new Set(gs.map((g) => (g === ancien ? nouveau : g)).filter(Boolean))];
  d.dates.forEach((x) => x.evenements.forEach((e) => (e.groupes = r(e.groupes))));
  d.periodes.forEach((p) => (p.groupes = r(p.groupes)));
}

function renommerDansFiltre(ancien, nouveau) {
  if (!etat.filtre.has(ancien)) return;
  etat.filtre.delete(ancien);
  if (nouveau) etat.filtre.add(nouveau);
  try { localStorage.setItem("filtre", JSON.stringify([...etat.filtre])); } catch {}
}

function deplacerGroupe(nom, sens) {
  const noms = Object.keys(etat.donnees.groupes), k = noms.indexOf(nom);
  if (k + sens < 0 || k + sens >= noms.length) return;
  noms.splice(k, 1);
  noms.splice(k + sens, 0, nom);
  modifier((d) => { d.groupes = Object.fromEntries(noms.map((n) => [n, d.groupes[n]])); });
}

// ─── Thèmes : ajouter, renommer (partout), réordonner, supprimer ───

function formTheme({ nom }) {
  const nouveau = !nom;
  const c = nouveau ? { ev: 0, p: 0 } : comptesThemes()[nom];
  return `<div class="dn-form">
    ${entetePanneau(t(nouveau ? "Nouveau thème" : "Thème"))}
    <label class="dn-champ"><span>${t("Nom")}</span><input type="text" name="nom" value="${echapper(nom ?? "")}" autocomplete="off"></label>
    <label class="dn-champ"><span>${t("Description <em>ce qu'il couvre ; affichée au survol dans le panneau de gauche</em>")}</span><textarea name="description" rows="4">${echapper((nom && etat.donnees.themes[nom]?.description) ?? "")}</textarea></label>
    ${nouveau ? "" : `<p class="dn-aide">${t("{ev} et {p} ont ce thème.", { ev: tn(c.ev, "{n} évènement", "{n} évènements"), p: tn(c.p, "{n} période", "{n} périodes") })}
      ${t("Le renommer le change partout ; le supprimer le retire de tous, sans rien supprimer d'autre.")}</p>`}
    ${boutons(!nouveau)}
  </div>`;
}

function validerTheme(vif = null) {
  const nom = valeur("nom").trim(), ancien = sel.nom;
  if (!nom) return erreur(t("Indique un nom."));
  if (nom === SANS_THEME || nom === t(SANS_THEME)) return erreur(t("« {nom} » est réservé.", { nom }));
  if (nom !== ancien && index.themes.includes(nom)) return erreur(t("Ce thème existe déjà."));
  if (ancien && nom !== ancien) renommerThemeDansFiltre(ancien, nom);
  modifier((d) => {
    const t = {};
    const description = valeur("description").trim();
    if (description) t.description = description;
    if (!ancien) { d.themes[nom] = t; return; }
    d.themes = Object.fromEntries(Object.entries(d.themes).map(([k, v]) => (k === ancien ? [nom, t] : [k, v])));
    remplacerTheme(d, ancien, nom);
    if (vif) sel.nom = nom;
  }, vif && { objet: "theme", champ: vif.champ });
  if (!vif) ouvrir({ type: "t", nom }, t(!ancien ? "Thème ajouté." : nom !== ancien ? "Thème renommé partout." : "Modification faite."));
}

function remplacerTheme(d, ancien, nouveau) {
  const r = (o) => {
    if (!o.themes) return;
    marquerListe(o, "themes", [...new Set(o.themes.map((t) => (t === ancien ? nouveau : t)).filter(Boolean))]);
  };
  d.dates.forEach((x) => x.evenements.forEach(r));
  d.periodes.forEach(r);
}

function renommerThemeDansFiltre(ancien, nouveau) {
  if (!etat.filtreThemes.has(ancien)) return;
  etat.filtreThemes.delete(ancien);
  if (nouveau) etat.filtreThemes.add(nouveau);
  try { localStorage.setItem("filtre.themes", JSON.stringify([...etat.filtreThemes])); } catch {}
}

function deplacerTheme(nom, sens) {
  const noms = [...index.themes], k = noms.indexOf(nom);
  if (k + sens < 0 || k + sens >= noms.length) return;
  noms.splice(k, 1);
  noms.splice(k + sens, 0, nom);
  modifier((d) => { d.themes = Object.fromEntries(noms.map((n) => [n, d.themes[n]])); });
}

function validerRelier() {
  const { ev, date, candidats } = sel;
  const label = valeur("label").trim();
  if (!label) return erreur(t("Indique un nom pour l'époque."));
  const choix = panneau.querySelector('[name="fin"]:checked')?.value;
  let fin, finEv = null;
  if (choix == null) return erreur(t("Choisis la fin."));
  if (choix === "autre") {
    const sf = lireApprox(valeur("fin_texte"));
    fin = { ...lireDate(sf.texte), approx: sf.approx };
    if (!fin.ok) return erreur(fin.vide ? t("Indique la date de fin ou choisis un évènement.") : `${t("Date de fin non comprise.")} ${EXEMPLES}`);
  } else {
    const c = candidats[Number(choix)];
    finEv = c;
    fin = { texte: c.date.date, annee: c.date.annee, mois: c.date.mois, jour: c.date.jour, approx: !!c.ev.approx };
  }
  const finIncl = instantFin({ fin_annee: fin.annee, fin_mois: fin.mois, fin_jour: fin.jour });
  if (date.annee != null && fin.annee != null && finIncl < instantDe(date)) return erreur(t("La fin précède le début."));
  const retirerFin = finEv && coche("retirer_fin");
  const p = modifier((d) => {
    const retirer = (e, x) => {
      x.evenements.splice(x.evenements.indexOf(e), 1);
      if (!x.evenements.length) d.dates.splice(d.dates.indexOf(x), 1);
    };
    const p = {
      label, type: "epoque", groupes: [...ev.groupes], sous_titre: null,
      debut: date.date, debut_annee: date.annee, fin: fin.texte, fin_annee: fin.annee,
      debut_deduit: false, regne: ev.regne,
      comment: [ev.comment, retirerFin && finEv.ev.comment].filter(Boolean).join("\n\n") || null,
    };
    ecrireDate(p, { texte: date.date, annee: date.annee, mois: date.mois, jour: date.jour }, "debut_");
    ecrireDate(p, fin, "fin_");
    marquerImportant(p, !!ev.important);
    marquer(p, "debut_approx", !!ev.approx);
    marquer(p, "fin_approx", !!fin.approx);
    marquerSources(p, [...(ev.sources || []), ...((retirerFin && finEv.ev.sources) || [])]);
    marquerListe(p, "themes", ev.themes);
    d.periodes.push(p);
    retirer(ev, date);
    if (retirerFin) retirer(finEv.ev, finEv.date);
    return p;
  });
  ouvrir({ type: "p", p }, t(retirerFin ? "Époque créée ; le début et la fin ont été retirés des dates." : "Époque créée ; le début a été retiré des dates."));
}

function supprimer() {
  // élément seul : après la suppression, on ouvre la ligne suivante (ou la précédente s'il était le dernier)
  const i = sel.type === "serie" ? -1 : lignes.findIndex((l) => estChoisi(l));
  const suivant = i < 0 ? null : lignes[i + 1] ?? lignes[i - 1] ?? null;
  if (sel.type === "serie") {
    const cochees = new Set(coches);
    modifier((d) => {
      if (courant === "evenements") {
        d.dates.forEach((x) => (x.evenements = x.evenements.filter((e) => !cochees.has(e))));
        d.dates = d.dates.filter((x) => x.evenements.length);      // les lignes vidées disparaissent
      } else d.periodes = d.periodes.filter((p) => !cochees.has(p));
    });
  } else if (sel.type === "ev") {
    modifier((d) => {
      const x = sel.date;
      x.evenements.splice(x.evenements.indexOf(sel.ev), 1);
      if (!x.evenements.length) d.dates.splice(d.dates.indexOf(x), 1);
    });
  } else if (sel.type === "p") {
    modifier((d) => { d.periodes.splice(d.periodes.indexOf(sel.p), 1); });
  } else if (sel.type === "t") {
    const nom = sel.nom;
    renommerThemeDansFiltre(nom, null);
    modifier((d) => {
      delete d.themes[nom];
      remplacerTheme(d, nom, null);
    });
  } else if (sel.type === "g") {
    const nom = sel.nom, remplacant = valeur("remplacant") || null;
    renommerDansFiltre(nom, remplacant);
    modifier((d) => {
      delete d.groupes[nom];
      remplacerGroupe(d, nom, remplacant);
    });
  }
  fermer();
  if (suivant && existe(suivant)) {
    ouvrirLigne(suivant);
    const j = lignes.findIndex((l) => estChoisi(l));
    zone.querySelector(`tr[data-i="${j}"]`)?.scrollIntoView({ block: "nearest" });
  }
}

// ─── Ajout en série : une ligne par évènement ou époque (« date | nom | groupes | description »), ou du JSON ───

const EXEMPLE_LOT = (anglais ? [
  "1453 | Fall of Constantinople | Rome, Arab-Muslim World | The city is taken by Mehmed II.",
  "~ 2350 BC | Sargon of Akkad | Mesopotamia",
  "2685 BC → 2180 BC | Old Kingdom | Ancient Egypt | The age of the pyramids.",
] : [
  "1453 | Chute de Constantinople | Rome, Monde Arabo-Musulman | Prise de la ville par Mehmed II.",
  "~ - 2 350 | Sargon d'Akkad | Mésopotamie",
  "- 2 685 → - 2 180 | Ancien Empire | Égypte Antique | L'âge des pyramides.",
]).join("\n");

// JSON : les clés françaises ou anglaises sont acceptées (nom / name, groupes / groups…)
const MODELE_JSON = JSON.stringify([anglais ? { date: "", name: "", groups: [], description: "" }
  : { date: "", nom: "", groupes: [], description: "" }], null, 2);

function formLot() {
  return `<div class="dn-form">
    ${entetePanneau(t("Ajouter plusieurs éléments"))}
    <div class="dn-aide dn-aide-lot">${t(`<p>Une ligne par évènement : <b>date | nom | groupes et thèmes | description</b></p>
      <ul>
        <li>Seuls la date et le nom sont obligatoires. Dans la 3e colonne, on met les lieux et les thèmes, séparés par des virgules.</li>
        <li>« ~ » ou « vers » devant une date : date approximative.</li>
        <li>Deux dates « début → fin » : une <b>époque</b>, avec sa barre de durée.</li>
        <li>Les lignes vides et celles qui commencent par # sont ignorées.</li>
        <li>On peut aussi coller du JSON : une liste d'objets <code>date</code>, <code>nom</code>, <code>groupes</code>, <code>description</code>,
        et si besoin <code>themes</code>, <code>fin</code>, <code>approx</code>, <code>important</code>, <code>regne</code>, <code>limite</code>, <code>sources</code>.</li>
      </ul>`)}
    </div>
    <textarea name="lot" class="dn-lot" rows="9" spellcheck="false" placeholder="${echapper(EXEMPLE_LOT)}"></textarea>
    <div class="dn-boutons secondaires">
      <button class="bouton discret" data-action="modele-texte">${t("Exemple")}</button>
      <button class="bouton discret" data-action="modele-json">${t("Modèle JSON")}</button>
    </div>
    <div class="dn-apercu-lot"></div>
    <div class="dn-boutons">
      <button class="bouton principal" data-action="valider" disabled>${t("Ajouter")}</button>
      <button class="bouton discret" data-action="abandonner">${t("Fermer")}</button>
    </div>
  </div>`;
}

// Nom de thème tel qu'il existe (sans tenir compte des accents ni des majuscules), ou null
function trouverTheme(nom) {
  return index.themes.find((t) => t === nom) ?? index.themes.find((t) => normaliser(t) === normaliser(nom)) ?? null;
}

// Nom de groupe tel qu'il existe (sans tenir compte des accents ni des majuscules), ou null
function trouverGroupe(nom) {
  const noms = Object.keys(etat.donnees.groupes);
  return noms.find((g) => g === nom) ?? noms.find((g) => normaliser(g) === normaliser(nom)) ?? null;
}

const nettoyerSources = (liste) => (Array.isArray(liste) ? liste : [])
  .map((s) => (typeof s === "string" ? { lien: s } : s))
  .map((s) => ({ titre: s?.titre ?? s?.title, lien: s?.lien ?? s?.link ?? s?.url, citation: s?.citation ?? s?.quote }))
  .map((s) => Object.fromEntries(["titre", "lien", "citation"].filter((k) => s?.[k]).map((k) => [k, String(s[k]).trim()])))
  .map((s) => (s.lien ? { ...s, lien: completerLien(s.lien) } : s))
  .filter((s) => Object.keys(s).length);

function analyserLot(texte) {
  const s = (texte || "").trim();
  if (!s) return [];
  if (s[0] === "[" || s[0] === "{") {
    let brut;
    try { brut = JSON.parse(s); } catch (e) { return [{ n: 1, erreurs: [t("JSON illisible ({erreur}). Vérifie les virgules et les guillemets.", { erreur: e.message })], avertissements: [] }]; }
    const liste = (v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []);
    const LIMITES = { start: "debut", end: "fin" };
    return (Array.isArray(brut) ? brut : [brut]).map((o, i) => verifierElement(i + 1, {
      debut: o.date ?? o.debut ?? o.start, fin: o.fin ?? o.end, label: o.nom ?? o.label ?? o.name,
      groupes: liste(o.groupes ?? o.groups),
      comment: o.description ?? o.comment, approx: o.approx, finApprox: o.fin_approx ?? o.end_approx, important: o.important,
      regne: o.regne ?? o.reign, limite: LIMITES[o.limite ?? o.limit] ?? o.limite ?? o.limit, sousTitre: o.sous_titre ?? o.subtitle, sources: o.sources,
      themes: liste(o.themes),
    }));
  }
  return s.split("\n").map((l, i) => [l.trim(), i + 1]).filter(([l]) => l && !l.startsWith("#")).map(([l, n]) => {
    const [dates = "", nom = "", groupes = "", ...desc] = l.split("|").map((x) => x.trim());
    const [debut, fin] = dates.split(/\s*(?:→|->)\s*/);
    return verifierElement(n, { debut, fin, label: nom, groupes: groupes.split(","), comment: desc.join(" | ") });
  });
}

// Une ligne lue : ses valeurs, ses erreurs (bloquantes) et ses avertissements
function verifierElement(n, o) {
  const erreurs = [], avertissements = [];
  const sd = lireApprox(String(o.debut ?? "")), d = lireDate(sd.texte);
  if (!d.ok) erreurs.push(d.vide ? t("date manquante") : t("date non comprise « {d} »", { d: String(o.debut).trim() }));
  let f = null, sf = { approx: false };
  if (o.fin != null && String(o.fin).trim() !== "") {
    sf = lireApprox(String(o.fin));
    f = lireDate(sf.texte, true);
    if (!f.ok) erreurs.push(t("fin non comprise « {d} »", { d: String(o.fin).trim() }));
    else if (d.ok && f.annee != null && f.instFin < d.inst) erreurs.push(t("la fin précède le début"));
  }
  const label = String(o.label ?? "").trim();
  if (!label) erreurs.push(t("nom manquant"));
  // la 3e colonne mélange lieux et thèmes : chaque nom est reconnu comme groupe, sinon comme thème
  const groupes = [], themes = [];
  for (const brut of [...(o.groupes || []), ...(o.themes || [])].map((g) => String(g).trim()).filter(Boolean)) {
    const g = trouverGroupe(brut), th = g ? null : trouverTheme(brut);
    if (g) { if (!groupes.includes(g)) groupes.push(g); }
    else if (th) { if (!themes.includes(th)) themes.push(th); }
    else erreurs.push(t("« {nom} » n'est ni un groupe ni un thème : corrige-le ou crée-le d'abord", { nom: brut }));
  }
  if (o.limite != null && o.limite !== "debut" && o.limite !== "fin") erreurs.push(t("limite : « debut », « fin » ou rien"));
  const meme = (x) => normaliser(x) === normaliser(label);
  if (d.ok && label && (tousLesEvenements().some(({ ev, date }) => instantDe(date) === d.inst && meme(ev.label))
      || etat.donnees.periodes.some((p) => instantDebut(p) === d.inst && meme(p.label))))
    avertissements.push(t("existe déjà à cette date"));
  return {
    n, type: f ? "p" : "ev", debut: d.texte, annee: d.annee, dateDebut: d, dateFin: f, approx: sd.approx || !!o.approx,
    fin: f?.texte ?? null, finAnnee: f?.annee ?? null, finApprox: sf.approx || !!o.finApprox,
    label, groupes, themes: index.themes.filter((t) => themes.includes(t)), comment: String(o.comment ?? "").trim() || null, important: !!o.important, regne: !!o.regne,
    limite: o.limite ?? null, sousTitre: o.sousTitre ?? null, sources: nettoyerSources(o.sources), erreurs, avertissements,
  };
}

function majApercuLot() {
  const el = panneau.querySelector(".dn-apercu-lot"), bouton = panneau.querySelector('[data-action="valider"]');
  if (!el) return;
  const lignes = analyserLot(valeur("lot"));
  const nErreurs = lignes.filter((l) => l.erreurs.length).length;
  bouton.disabled = !lignes.length || nErreurs > 0;
  bouton.textContent = lignes.length ? tn(lignes.length, "Ajouter {n} élément", "Ajouter {n} éléments") : t("Ajouter");
  if (!lignes.length) { el.innerHTML = ""; return; }
  const date = (l) => (l.type === "p"
    ? `${echapper(dateAffichee(l.debut, l.approx))} → ${echapper(dateAffichee(l.fin, l.finApprox))}`
    : echapper(dateAffichee(l.debut ?? "", l.approx)));
  el.innerHTML = `<div class="dn-apercu-titre">${t("Aperçu")}${nErreurs ? ` · <span class="erreur">${tn(nErreurs, "{n} ligne à corriger", "{n} lignes à corriger")}</span>` : ""}</div>
    <table class="dn dn-lot-table"><tbody>${lignes.map((l) => `
      <tr class="${l.erreurs.length ? "ko" : ""}">
        <td class="c-etat">${l.erreurs.length ? "✗" : l.avertissements.length ? "!" : "✓"}</td>
        <td class="c-date">${date(l)}</td>
        <td>${echapper(l.label ?? "")}${l.type === "p" ? ` ${etiquette(t("époque"))}` : ""}
          ${l.erreurs.map((m) => `<div class="c-erreur">${t("Ligne {n} : {erreur}", { n: l.n, erreur: echapper(m) })}</div>`).join("")}
          ${l.avertissements.map((m) => `<div class="c-avert">${echapper(m)}</div>`).join("")}</td>
        <td>${l.groupes?.length ? puces(l.groupes) : ""}${l.themes?.length ? `<div class="c-themes">${texteThemes(l.themes)}</div>` : ""}</td>
      </tr>`).join("")}</tbody></table>`;
}

function validerLot() {
  const lignes = analyserLot(valeur("lot"));
  if (!lignes.length) return erreur(t("Rien à ajouter : écris au moins une ligne."));
  if (lignes.some((l) => l.erreurs.length)) return erreur(t("Corrige d'abord les lignes en rouge."));
  modifier((d) => {
    for (const l of lignes) {
      if (l.type === "p") {
        const p = {
          label: l.label, type: "epoque", groupes: l.groupes, sous_titre: l.sousTitre, debut: l.debut, debut_annee: l.annee,
          fin: l.fin, fin_annee: l.finAnnee, debut_deduit: false, regne: l.regne, comment: l.comment,
        };
        ecrireDate(p, l.dateDebut, "debut_");
        ecrireDate(p, l.dateFin, "fin_");
        marquer(p, "debut_approx", l.approx);
        marquer(p, "fin_approx", l.finApprox);
        marquerImportant(p, l.important);
        marquerSources(p, l.sources);
        marquerListe(p, "themes", l.themes);
        d.periodes.push(p);
      } else {
        const ev = { label: l.label, groupes: l.groupes, limite: l.limite, regne: l.regne, comment: l.comment };
        marquerImportant(ev, l.important);
        marquer(ev, "approx", l.approx);
        marquerSources(ev, l.sources);
        marquerListe(ev, "themes", l.themes);
        placerEvenement(d, ev, null, l.dateDebut);
      }
    }
  });
  champ("lot").value = "";
  modifiee = false;
  majApercuLot();
  const n = lignes.length, m = panneau.querySelector(".dn-message");
  m.textContent = tn(n, "{n} élément ajouté. « Annuler » retire tout l'ajout d'un coup.", "{n} éléments ajoutés. « Annuler » retire tout l'ajout d'un coup.");
  m.className = "dn-message ok";
}
