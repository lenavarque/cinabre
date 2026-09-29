// Point d'entrée : navigation, barre du haut, panneau des groupes, popups.

import {
  etat, index, charger, enregistrer, annuler, modifier, ecouter, emettre, echapper, couleurDe,
  formatDuree, groupe, dateAffichee, filtreActif, descriptionTheme, SANS_GROUPE, SANS_THEME, LECTURE_SEULE, EXPORTE_LE,
  nomAffiche, mettreDeCote, dureePeriode, formatAnnee, jeuActif, themeClair, indexer,
} from "./donnees.js";
import { t, tn, langue, LANGUES, choisirLangue, traduirePage, dateCourte } from "./langue.js";
import { exporterHtml } from "./export.js";
import { initPopup, gabarit, detailsSources, fermer as fermerPopup } from "./popup.js";
import * as frise from "./frise.js";
import * as stats from "./stats.js";
import * as jeu from "./jeu.js";
import * as gestion from "./gestion.js";
import * as aide from "./aide.js";

const VUES = { frise, stats, jeu, donnees: gestion, aide };   // page exportée : tous les onglets, Données en lecture seule
let onglet = null;
const $ = (s) => document.querySelector(s);

const app = {
  compteur(texte) { $("#compteur").textContent = texte; },
  // Ouvre l'onglet Frise à cette année, ou sur l'élément id (e<n> ou p<i>) mis en évidence
  ouvrirFrise(annee, id = null) {
    // le routeur (abonné avant) a déjà affiché la frise quand ce rappel s'exécute
    const aller = () => { if (!id || !frise.montrer(id)) frise.allerAnnee(annee, "auto"); };
    window.addEventListener("hashchange", aller, { once: true });
    location.hash = "frise";
  },
  // Ouvre l'onglet Données sur le sous-onglet Réglages
  ouvrirReglages() {
    if (LECTURE_SEULE) return;
    gestion.montrerSousOnglet("reglages");
    location.hash = "donnees";
  },
  // Ouvre l'onglet Données sur cet élément (identifiant d'exécution e<n> ou p<i>)
  ouvrirDonnees(id) {
    const t = id.startsWith("e") ? index.evenements.get(id) : null, p = id.startsWith("p") ? index.periodes.get(id) : null;
    const item = t ? { type: "ev", ev: t.ev, date: t.date } : p ? { type: "p", p } : null;
    if (!item) return;
    if (onglet === "donnees") return gestion.ouvrirElement(item);
    window.addEventListener("hashchange", () => gestion.ouvrirElement(item), { once: true });
    location.hash = "donnees";
  },
};

// Icône d'onglet : le « C » cinabre du nom de l'application, dessiné avec Spectral une fois la police chargée
async function iconeOnglet() {
  const police = (taille) => `600 ${taille}px Spectral`;
  try { await document.fonts.load(police(100), "C"); } catch { return; }
  if (!document.fonts.check(police(100), "C")) return;            // hors ligne : on garde l'icône de secours
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  ctx.font = police(100);
  const m = ctx.measureText("C");
  const l = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const k = 60 / Math.max(l, h);                                   // la lettre remplit l'icône
  ctx.font = police(100 * k);
  ctx.fillStyle = themeClair() ? "#bf452b" : "#d8573c";        // --accent du thème
  ctx.fillText("C", 32 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) * k / 2, 32 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * k / 2);
  $("#icone").href = c.toDataURL("image/png");
}

async function demarrer() {
  traduirePage();
  initLangues();
  initTheme();
  iconeOnglet();
  try { etat.filtre = new Set(JSON.parse(localStorage.getItem("filtre") || "[]")); } catch { etat.filtre = new Set(); }
  try { etat.filtreThemes = new Set(JSON.parse(localStorage.getItem("filtre.themes") || "[]")); } catch { etat.filtreThemes = new Set(); }
  initPopup(contenuPopup);
  initBarre();
  window.addEventListener("hashchange", router);
  document.addEventListener("keydown", raccourcis);
  window.addEventListener("beforeunload", (e) => { if (etat.modifie) { e.preventDefault(); e.returnValue = ""; } });
  ecouter("enregistrement", majEnregistrement);
  ecouter("donnees", () => { panneauGroupes(); majTitreFrise(); majOngletJeu(); Object.values(VUES).forEach((v) => v.majDonnees?.()); });
  initFrises();

  try {
    await charger();
  } catch (e) {
    $("#chargement").innerHTML = `<h2>${t("Impossible de charger les données")}</h2><p>${echapper(e.message)}</p>
      <p>${t("Vérifie que <code>serveur.py</code> est lancé et que <code>dates.json</code> se trouve à côté.")}</p>`;
    return;
  }
  // Retire les groupes du filtre qui n'existent plus
  etat.filtre = new Set([...etat.filtre].filter((g) => index.groupes.some((x) => x.nom === g)));
  etat.filtreThemes = new Set([...etat.filtreThemes].filter((t) => t === SANS_THEME || index.themes.includes(t)));
  panneauGroupes();
  majOngletJeu();
  $("#chargement").remove();
  for (const [nom, vue] of Object.entries(VUES)) vue.init($(`#vue-${nom}`), app);
  router();
}

// ─── Onglets ───

// L'onglet Jeu n'existe que si la frise le demande (Données, Réglages)
function majOngletJeu() {
  $('.onglets a[data-onglet="jeu"]').hidden = !jeuActif();
  if (onglet === "jeu" && !jeuActif()) location.hash = "frise";
}

function router() {
  const cible = (location.hash.slice(1) || "frise").split("?")[0];
  const nom = VUES[cible] && (cible !== "jeu" || jeuActif()) ? cible : "frise";
  if (nom !== cible && location.hash) history.replaceState(null, "", `#${nom}`);   // l'adresse suit l'onglet affiché
  if (nom === onglet) return;
  onglet = nom;
  fermerPopup();
  document.querySelectorAll(".onglets a").forEach((a) => a.classList.toggle("actif", a.dataset.onglet === nom));
  document.querySelectorAll(".vue").forEach((v) => v.classList.toggle("active", v.id === `vue-${nom}`));
  document.title = `${t({ frise: "Frise", stats: "Statistiques", jeu: "Jeu", donnees: "Données", aide: "Guide" }[nom])} · Cinabre`;
  $("#recherche").placeholder = t({ donnees: "Rechercher dans les titres et descriptions", aide: "Rechercher dans le guide" }[nom]
    || "Rechercher un évènement ou une année");
  VUES[nom].afficher?.();
  VUES[nom].rechercher?.(etat.recherche, false);
}

// ─── Barre du haut ───

function initBarre() {
  const champ = $("#recherche");
  let minuterie;
  champ.addEventListener("input", () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      etat.recherche = champ.value;
      VUES[onglet]?.rechercher?.(etat.recherche);
    }, 160);
  });
  champ.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); etat.recherche = champ.value; VUES[onglet]?.suivant?.(e.shiftKey ? -1 : 1); }
    if (e.key === "Escape") { champ.value = ""; etat.recherche = ""; VUES[onglet]?.rechercher?.(""); champ.blur(); }
  });
  $("#enregistrer").addEventListener("click", enregistrer);
}

function raccourcis(e) {
  const saisie = e.target.closest?.("input, textarea, select, [contenteditable]");
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); enregistrer(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !saisie) { e.preventDefault(); annuler(); return; }
  if (saisie || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "/") { e.preventDefault(); $("#recherche").focus(); $("#recherche").select(); }
  else if (e.key === "1") location.hash = "frise";
  else if (e.key === "2") location.hash = "stats";
  else if (e.key === "3") location.hash = "donnees";
  else if (e.key === "4") location.hash = "aide";
  else if (e.key === "5" && jeuActif()) location.hash = "jeu";
  else if (e.key === "Escape") { fermerPopup(); fermerMenuFrises(); VUES[onglet]?.fermerMenus?.(); }
}

// ─── Langue de l'interface (FR · EN, en haut à droite) ───
// Changer de langue recharge la page ; les modifications non enregistrées sont reprises (voir mettreDeCote()).
function initLangues() {
  const el = $("#langues");
  if (LECTURE_SEULE) { el.remove(); return; }     // page exportée : la langue de l'export, sans choix
  el.innerHTML = Object.entries(LANGUES).map(([code, nom]) =>
    `<button data-langue="${code}" class="${code === langue ? "actif" : ""}" title="${nom}" lang="${code}"${code === langue ? ` aria-current="true"` : ""}>${code.toUpperCase()}</button>`).join("");
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-langue]");
    if (!b || b.dataset.langue === langue) return;
    if (!mettreDeCote()) { el.title = t("Enregistre d'abord les modifications, puis change de langue."); return; }
    choisirLangue(b.dataset.langue);
    etat.modifie = false;           // pas d'avertissement : les modifications sont reprises après le rechargement
    location.reload();
  });
}

// Thème clair ou sombre : celui du système, jusqu'à ce qu'on en choisisse un avec le bouton (retenu dans localStorage ;
// le script en tête de page le pose avant le premier affichage). Changer de thème recalcule les couleurs des groupes.
function initTheme() {
  const bouton = $("#theme"), racine = document.documentElement;
  const systeme = matchMedia("(prefers-color-scheme: light)");
  const maj = () => bouton.setAttribute("aria-label", t(themeClair() ? "Passer en thème sombre" : "Passer en thème clair"));
  const appliquer = () => {
    maj();
    iconeOnglet();
    if (!etat.donnees) return;
    indexer();
    emettre("donnees");
  };
  bouton.addEventListener("click", () => {
    racine.dataset.theme = themeClair() ? "sombre" : "clair";
    try { localStorage.setItem("theme", racine.dataset.theme); } catch { /* sans importance */ }
    appliquer();
  });
  systeme.addEventListener("change", () => { if (!racine.dataset.theme) appliquer(); });
  maj();
  bouton.title = t("Thème clair ou sombre");
}

function majEnregistrement(info = {}) {
  const el = $("#etat-enregistrement"), bouton = $("#enregistrer");
  if (LECTURE_SEULE) {
    el.textContent = t("Lecture seule");
    el.title = EXPORTE_LE ? t("Frise exportée de Cinabre le {date}", { date: dateCourte(EXPORTE_LE) }) : "";
    return;
  }
  el.className = "etat-enregistrement";
  if (info.enCours) { el.textContent = t("Enregistrement…"); return; }
  if (info.erreur) { el.classList.add("erreur"); el.textContent = info.erreur; bouton.hidden = false; return; }
  if (etat.modifie) { el.classList.add("modifie"); el.textContent = t("Modifications non enregistrées"); bouton.hidden = false; return; }
  bouton.hidden = true;
  el.textContent = t("Enregistré");   // tout est écrit dans le fichier
}

// ─── Frises : ouvrir une autre frise du dossier, en créer une, renommer celle qui est ouverte ───

let frises = null;        // { actuelle, frises: [{ fichier, titre, evenements, periodes }] }
let enAttente = null;     // action retenue le temps de décider quoi faire des modifications non enregistrées

async function initFrises() {
  const bouton = $("#frise-courante"), menu = $("#menu-frises");
  if (LECTURE_SEULE) { bouton.disabled = true; bouton.title = ""; majTitreFrise(); return; }
  bouton.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (menu.classList.toggle("ouvert")) { enAttente = null; await chargerFrises(); menuFrises(); }
  });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) fermerMenuFrises(); });
  menu.addEventListener("click", clicMenuFrises);
  menu.addEventListener("submit", soumettreMenuFrises);
  await chargerFrises();
}

async function chargerFrises() {
  try { frises = await (await fetch("/api/frises")).json(); } catch { frises = null; }
  majTitreFrise();
}

function fermerMenuFrises() { $("#menu-frises")?.classList.remove("ouvert"); }

function titreFrise() {
  return etat.donnees?.titre || frises?.frises.find((f) => f.fichier === frises.actuelle)?.titre || "";
}
function majTitreFrise() { const el = $("#frise-titre"); if (el) el.textContent = titreFrise(); }

function menuFrises() {
  const menu = $("#menu-frises");
  if (!frises) { menu.innerHTML = `<p class="mf-erreur">${t("Impossible de lister les frises : le serveur ne répond pas.")}</p>`; return; }
  const liste = frises.frises.map((f) => {
    const actuelle = f.fichier === frises.actuelle, n = actuelle ? index.evenements.size : f.evenements;
    return `<button class="mf-frise${actuelle ? " actuelle" : ""}" data-fichier="${echapper(f.fichier)}" title="${echapper(f.fichier)}">
      <i></i><span class="mf-titre">${echapper(actuelle ? titreFrise() : f.titre)}</span><span class="mf-n">${tn(n, "{n} évènement", "{n} évènements")}</span></button>`;
  }).join("");
  const avert = enAttente ? `<div class="mf-avert">${t("Cette frise a des modifications non enregistrées.")}
      <div class="mf-boutons"><button class="bouton principal petit" data-mf="enregistrer">${t("Enregistrer, puis continuer")}</button>
      <button class="bouton discret petit" data-mf="abandonner">${t("Continuer sans enregistrer")}</button></div></div>` : "";
  menu.innerHTML = `<h4>${t("Frises")}</h4><div class="mf-liste">${liste}</div>${avert}
    <form class="mf-form" data-mf="creer"><label for="mf-nouvelle">${t("Nouvelle frise")}</label>
      <div><input id="mf-nouvelle" name="titre" placeholder="${t("Nom de la frise")}" autocomplete="off"><button class="bouton petit">${t("Créer")}</button></div></form>
    <form class="mf-form" data-mf="renommer"><label for="mf-nom">${t("Renommer cette frise")}</label>
      <div><input id="mf-nom" name="titre" value="${echapper(titreFrise())}" autocomplete="off"><button class="bouton petit">${t("Renommer")}</button></div></form>
    <div class="mf-form"><span class="mf-label">${t("Partager")}</span>
      <p class="mf-aide">${t("Une page HTML unique, en lecture seule (frise, statistiques, filtre, popups), qui s'ouvre dans un navigateur, sans Python ni serveur.")}
        ${t("Elle est dans la langue actuelle de l'interface.")}</p>
      <div><button class="bouton petit" data-mf="exporter">${t("Exporter en page HTML")}</button></div></div>
    <p class="mf-message" hidden></p>`;
}

function messageFrises(texte, erreur = true) {
  const m = $("#menu-frises .mf-message");
  if (!m) return;
  m.hidden = false;
  m.textContent = texte;
  m.classList.toggle("erreur", erreur);
}

// Changer de frise remplace les données affichées : les modifications en cours doivent d'abord être réglées
function demander(action) {
  if (!etat.modifie) return executer(action);
  enAttente = action;
  menuFrises();
}

async function executer(action) {
  const rep = await fetch(action.type === "ouvrir" ? "/api/frises/ouvrir" : "/api/frises/creer", {
    method: "POST", headers: { "Content-Type": "application/json" },
    // une nouvelle frise reçoit ses thèmes de départ dans la langue de l'interface
    body: JSON.stringify(action.type === "ouvrir" ? { fichier: action.fichier } : { titre: action.titre, langue }),
  }).catch(() => null);
  const corps = rep ? await rep.json().catch(() => ({})) : {};
  if (!rep || !rep.ok) return messageFrises(t(corps.erreur || "Le serveur ne répond pas : vérifie qu'il est lancé."));
  etat.modifie = false;           // la page se recharge sur la nouvelle frise
  location.reload();
}

async function clicMenuFrises(e) {
  e.stopPropagation();
  const f = e.target.closest(".mf-frise");
  if (f && !f.classList.contains("actuelle")) return demander({ type: "ouvrir", fichier: f.dataset.fichier });
  const b = e.target.closest("[data-mf]");
  if (b?.dataset.mf === "exporter") return exporter(b);
  if (!b || !enAttente) return;
  if (b.dataset.mf === "enregistrer") {
    await enregistrer();
    if (etat.modifie) return messageFrises(t("L'enregistrement a échoué : voir le message en haut à droite."));
  }
  if (b.dataset.mf === "enregistrer" || b.dataset.mf === "abandonner") executer(enAttente);
}

async function exporter(bouton) {
  bouton.disabled = true;
  try {
    const nom = await exporterHtml(titreFrise());
    messageFrises(t("Page exportée : {nom}, dans le dossier des téléchargements.", { nom })
      + (etat.modifie ? " " + t("Elle inclut les modifications non enregistrées.") : ""), false);
  } catch (err) {
    messageFrises(t("L'export a échoué : {erreur} Vérifie que le serveur est lancé.", { erreur: err.message }));
  }
  bouton.disabled = false;
}

function soumettreMenuFrises(e) {
  e.preventDefault();
  const titre = e.target.elements.titre.value.trim();
  if (!titre) return messageFrises(t("Indique un nom."));
  if (e.target.dataset.mf === "creer") return demander({ type: "creer", titre });
  // renommer : le titre est enregistré dans le fichier, juste après « version »
  modifier((d) => {
    const reste = Object.entries(d).filter(([k]) => k !== "titre");
    for (const [k] of reste) delete d[k];
    for (const [k, v] of reste) { d[k] = v; if (k === "version") d.titre = titre; }
    if (!("titre" in d)) d.titre = titre;
  });
  messageFrises(t("Frise renommée. Enregistre (Ctrl+S) pour garder ce nom."), false);
}

// ─── Panneau des groupes : filtre commun aux onglets ───

// Trois parties : Lieux, Thèmes, Échelles. Lieux et échelles partagent le filtre des groupes (etat.filtre),
// les thèmes ont le leur (etat.filtreThemes) ; les deux se cumulent.
// Le panneau du filtre peut se replier en une fine bande (petits écrans) ; le choix est retenu,
// et sans choix enregistré il est replié quand la fenêtre est étroite
function panneauReplie() {
  try { const v = localStorage.getItem("panneau.replie"); if (v != null) return v === "1"; } catch {}
  return innerWidth < 1100;
}
// sans choix enregistré, le panneau suit la largeur de la fenêtre
let replieAffiche = null;
addEventListener("resize", () => {
  if (replieAffiche !== null && panneauReplie() !== replieAffiche) { panneauGroupes(); frise.majDonnees(); }
});
function basculerPanneau(replier) {
  try { localStorage.setItem("panneau.replie", replier ? "1" : "0"); } catch {}
  panneauGroupes();
  frise.majDonnees();                 // la largeur laissée à la frise change (retours à la ligne, colonnes)
}

function panneauGroupes() {
  const d = etat.donnees;
  const aside = $("#groupes");
  const replie = panneauReplie();
  replieAffiche = replie;
  document.body.classList.toggle("panneau-replie", replie);
  if (replie) {
    // bande étroite : un clic la déplie ; un point rappelle qu'un filtre est actif
    aside.innerHTML = `<button class="pg-deplier" title="${t("Afficher le filtre")}" aria-label="${t("Afficher le filtre")}">
      <span class="pg-fleche">›</span><span class="pg-deplier-nom">${t("Filtre")}</span>
      ${filtreActif() ? `<i class="pg-actif" title="${t("Un filtre est actif")}"></i>` : ""}</button>`;
    aside.onclick = (e) => { if (e.target.closest(".pg-deplier")) basculerPanneau(false); };
    return;
  }
  const compte = new Map(), compteT = new Map();
  const plus = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  const ajoute = (o) => {
    (o.groupes?.length ? o.groupes : [SANS_GROUPE]).forEach((g) => plus(compte, g));
    if (o.type !== "section") (o.themes?.length ? o.themes : [SANS_THEME]).forEach((t) => plus(compteT, t));
  };
  d.dates.forEach((date) => date.evenements.forEach(ajoute));
  d.periodes.forEach(ajoute);

  const item = (g) => `
    <button class="pg-item${etat.filtre.has(g.nom) ? " choisi" : ""}" data-groupe="${echapper(g.nom)}" data-pop="g:${echapper(g.nom)}" style="--ct:${g.affichage}">
      <i></i><span class="nom">${echapper(nomAffiche(g.nom))}</span><span class="n">${compte.get(g.nom) || 0}</span></button>`;
  const itemTheme = (t) => `
    <button class="pg-item theme${etat.filtreThemes.has(t) ? " choisi" : ""}" data-theme="${echapper(t)}" data-pop="t:${echapper(t)}">
      <i></i><span class="nom">${echapper(nomAffiche(t))}</span><span class="n">${compteT.get(t) || 0}</span></button>`;
  // « Sans groupe » / « Sans thème » n'apparaissent que s'ils contiennent quelque chose (ou sont dans le filtre)
  const utile = (nom, m, f) => m.get(nom) || f.has(nom);
  const lieux = index.groupes.filter((g) => g.type === "lieu" || (g.nom === SANS_GROUPE && utile(g.nom, compte, etat.filtre)));
  const echelles = index.groupes.filter((g) => g.type === "echelle");
  const themes = [...index.themes, ...(utile(SANS_THEME, compteT, etat.filtreThemes) ? [SANS_THEME] : [])];
  const tr = t;   // « t » désigne un thème dans itemTheme
  const bloc = (titre, actif, contenu) => `<div class="pg-bloc${actif ? " filtre-actif" : ""}"><div class="pg-section">${titre}</div>${contenu}</div>`;

  const panneau = $("#groupes");
  panneau.innerHTML = `
    <div class="pg-titre" title="${tr("Clic : afficher uniquement cet élément, puis en ajouter ou en retirer d'autres. Alt + clic : l'isoler. Lieux et thèmes se combinent : Rome + Guerres montre les guerres de Rome.")}">
      <span>${tr("Filtre")}</span><span class="pg-actions"><button class="pg-tout" ${filtreActif() ? "" : "hidden"}>${tr("Tout afficher")}</button>
      <button class="pg-replier" title="${tr("Masquer le filtre")}" aria-label="${tr("Masquer le filtre")}">‹</button></span></div>
    ${lieux.length ? bloc(tr("Lieux"), etat.filtre.size, lieux.map(item).join("")) : ""}
    ${themes.length ? bloc(tr("Thèmes"), etat.filtreThemes.size, themes.map(itemTheme).join("")) : ""}
    ${echelles.length ? bloc(tr("Échelles"), etat.filtre.size, echelles.map(item).join("")) : ""}
    ${lieux.length + echelles.length ? "" : `<p class="pg-vide">${tr("Aucun groupe pour l'instant : on les crée dans Données, onglet Groupes.")}</p>`}`;
  panneau.onclick = (e) => {
    if (e.target.closest(".pg-replier")) return basculerPanneau(true);
    if (e.target.closest(".pg-tout")) return changerFiltre(new Set(), new Set());
    const b = e.target.closest(".pg-item");
    if (!b) return;
    const theme = "theme" in b.dataset, nom = theme ? b.dataset.theme : b.dataset.groupe;
    let f = new Set(theme ? etat.filtreThemes : etat.filtre);
    if (e.altKey) f = f.size === 1 && f.has(nom) ? new Set() : new Set([nom]);
    else f.has(nom) ? f.delete(nom) : f.add(nom);
    theme ? changerFiltre(etat.filtre, f) : changerFiltre(f, etat.filtreThemes);
  };
}

function changerFiltre(groupes, themes) {
  etat.filtre = groupes;
  etat.filtreThemes = themes;
  try {
    localStorage.setItem("filtre", JSON.stringify([...groupes]));
    localStorage.setItem("filtre.themes", JSON.stringify([...themes]));
  } catch {}
  panneauGroupes();
  Object.values(VUES).forEach((v) => v.majFiltre?.());
  emettre("filtre");
}

// ─── Contenu des popups ───

// Contenu d'une popup ; épinglée, elle rappelle discrètement ce que fait Alt + clic sur l'élément
function contenuPopup(id, el) {
  const c = contenuElement(id, el);
  const astuce = astuceAlt(id, el);
  if (c && astuce) c.details = (c.details || "") + `<div class="pop-astuce">${t("<kbd>Alt</kbd> + clic : {action}", { action: astuce })}</div>`;
  return c;
}

function astuceAlt(id, el) {
  if (id.startsWith("g:")) return t("afficher seulement ce groupe");
  if (id.startsWith("t:")) return t("afficher seulement ce thème");
  if (/^[ep]\d/.test(id) && el.closest(".frise-defil")) return t(LECTURE_SEULE ? "voir dans Données" : "modifier dans Données");
  return null;
}

function contenuElement(id, el) {
  if (id.startsWith("g:") || id.startsWith("t:")) return popupPanneau(id[0], id.slice(2));
  if (id.startsWith("s")) return stats.contenuPopup(id);
  if (id.startsWith("e")) {
    const trouve = index.evenements.get(id);
    if (!trouve) return null;
    const { ev, date } = trouve;
    const badges = [];
    if (ev.limite === "debut") badges.push({ texte: t("Début d'époque") });
    if (ev.limite === "fin") badges.push({ texte: t("Fin d'époque") });
    if (ev.regne) badges.push({ texte: t("Début de règne"), classe: "or" });
    if (ev.important) badges.push({ texte: t("★ Important"), classe: "important" });
    return {
      couleur: couleurDe(ev.groupes),
      couleurs: couleursGroupes(ev.groupes),
      html: gabarit({ groupe: groupesPopup(ev.groupes), date: dateAffichee(date.date, ev.approx), titre: ev.label, badges, texte: ev.comment,
        sources: ev.sources?.length, themes: ev.themes }),
      details: detailsSources(ev.sources),
    };
  }
  const p = index.periodes.get(id);
  if (!p) return null;
  const maintenant = new Date().getFullYear();
  const finNum = p.fin_annee ?? (p.fin ? maintenant : null);
  const duree = dureePeriode(p, finNum);          // en jours ou en mois si les deux bornes sont précises et proches
  const debut = dateAffichee(p.debut, p.debut_approx) || "?", fin = dateAffichee(p.fin, p.fin_approx);
  const periode = p.fin ? t("de {debut} à {fin}", { debut, fin }) : t("à partir de {debut}", { debut });
  const badges = [];
  if (p.type === "epoque") badges.push({ texte: t("Époque") });
  if (p.regne) badges.push({ texte: t("Début de règne"), classe: "or" });
  if (p.important) badges.push({ texte: t("★ Important"), classe: "important" });
  if (p.debut_deduit) badges.push({ texte: t("Début provisoire, à vérifier") });
  return {
    couleur: couleurDe(p.groupes),
    couleurs: couleursGroupes(p.groupes),
    details: detailsSources(p.sources),
    ancrage: el.matches(".barre-ep, .bande") ? "souris" : null,
    html: gabarit({
      groupe: groupesPopup(p.groupes), date: periode, titre: p.label, sousTitre: p.sous_titre,
      badges, texte: p.comment, pied: duree ? t("Durée : {duree}", { duree }) : null, sources: p.sources?.length, themes: p.themes,
    }),
  };
}

// Date d'un exemple : l'année seule pour une date précise (« 14 juillet 1789 » ne tient pas dans la colonne)
const dateExemple = (texte, mois, annee, approx) => (mois ? `${approx ? "~ " : ""}${formatAnnee(annee)}` : dateAffichee(texte, approx));

// Popup d'un lieu, d'une échelle ou d'un thème du panneau : description, nombre d'éléments,
// et quelques exemples tirés au hasard à chaque survol (remis dans l'ordre chronologique)
const NB_EXEMPLES = 4;
function popupPanneau(sorte, nom) {
  const theme = sorte === "t", g = theme ? null : groupe(nom);
  const concerne = theme
    ? (o) => (nom === SANS_THEME ? !o.themes?.length && o.type !== "section" : o.themes?.includes(nom))
    : (o) => (nom === SANS_GROUPE ? !o.groupes?.length : o.groupes?.includes(nom));
  const tous = [];
  etat.donnees.dates.forEach((x) => x.evenements.forEach((e) => {
    if (concerne(e)) tous.push({ date: dateExemple(x.date, x.mois, x.annee, e.approx), label: e.label, annee: x.annee });
  }));
  etat.donnees.periodes.forEach((p) => {
    if (concerne(p)) tous.push({ date: dateExemple(p.debut, p.debut_mois, p.debut_annee, p.debut_approx), label: p.label, annee: p.debut_annee });
  });
  for (let i = tous.length - 1; i > 0; i--) {             // mélange, puis on garde les premiers
    const j = Math.floor(Math.random() * (i + 1));
    [tous[i], tous[j]] = [tous[j], tous[i]];
  }
  const choix = tous.slice(0, NB_EXEMPLES).sort((a, b) => (a.annee ?? 0) - (b.annee ?? 0));
  const sorteTexte = t(theme ? "Thème" : g.type === "echelle" ? "Échelle" : g.type === "lieu" ? "Lieu" : "");
  const n = tous.length;
  return {
    couleur: theme ? "var(--texte-2)" : g.affichage,
    ancrage: "droite",
    html: gabarit({
      groupe: sorteTexte, titre: nomAffiche(nom), texte: theme ? descriptionTheme(nom) : g.description,
      exemples: choix.map((c) => ({ date: c.date, texte: c.label })),
      pied: n ? `${tn(n, "{n} élément", "{n} éléments")}${n > NB_EXEMPLES ? ` · ${t("{n} exemples tirés au hasard", { n: NB_EXEMPLES })}` : ""}` : t("Aucun élément pour l'instant."),
    }),
  };
}

// Chaque groupe avec sa couleur (en-tête de la popup)
function groupesPopup(gs) {
  return (gs && gs.length ? gs : [SANS_GROUPE]).map((nom) => ({ nom: nomAffiche(nom), couleur: groupe(nom).affichage }));
}
const couleursGroupes = (gs) => (gs || []).map((g) => groupe(g).affichage);

demarrer();
