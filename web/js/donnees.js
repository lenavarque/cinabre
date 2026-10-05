// Chargement, enregistrement et outils communs aux trois onglets.

import { t, tn, anglais } from "./langue.js";

// Pseudo-groupe et pseudo-thème : le nom français sert de clé (filtre mémorisé) ; nomAffiche() le traduit
export const SANS_GROUPE = "Sans groupe";
export const SANS_THEME = "Sans thème";
export const nomAffiche = (nom) => (nom === SANS_GROUPE || nom === SANS_THEME ? t(nom) : nom);

export const etat = {
  donnees: null,
  fichier: "",            // nom du fichier de la frise ouverte (en-tête X-Fichier du serveur)
  version: null,
  modifie: false,
  filtre: new Set(),      // groupes affichés ; vide = tout afficher
  filtreThemes: new Set(), // thèmes affichés ; vide = tout afficher
  recherche: "",
};

// Ce que le navigateur retient pour chaque frise (filtre, position, lieux dépliés) : rangé sous le nom de son fichier,
// pour qu'une frise ne reprenne pas le filtre d'une autre
const cleFrise = (cle) => `${cle}:${etat.fichier}`;
export function lireFrise(cle) {
  try { return localStorage.getItem(cleFrise(cle)); } catch { return null; }
}
export function ecrireFrise(cle, valeur) {
  try { localStorage.setItem(cleFrise(cle), valeur); } catch {}
}

const abonnes = new Map();
export function ecouter(evenement, fn) {
  if (!abonnes.has(evenement)) abonnes.set(evenement, []);
  abonnes.get(evenement).push(fn);
}
export function emettre(evenement, detail) {
  (abonnes.get(evenement) || []).forEach((fn) => fn(detail));
}

// ─── Serveur ───

// Page exportée (voir export.js) : les données sont incluses dans la page, qui est en lecture seule
const EXPORT = document.getElementById("cinabre-donnees");
export const LECTURE_SEULE = !!EXPORT;
export const EXPORTE_LE = EXPORT?.dataset.exporteLe || null;

export async function charger() {
  if (EXPORT) {
    etat.donnees = JSON.parse(EXPORT.textContent);
    etat.fichier = `export:${etat.donnees.titre || ""}`;
    indexer();
    figer(etat.donnees);    // lecture seule : plus rien ne peut changer les données, pas même la console du navigateur
    Object.defineProperty(etat, "donnees", { value: etat.donnees, writable: false, configurable: false });
    emettre("donnees");
    emettre("enregistrement");
    return;
  }
  const rep = await fetch("/api/donnees");
  if (!rep.ok) {
    const corps = await rep.json().catch(() => ({}));
    throw new Error(t(corps.erreur || "Le serveur a répondu {n}.", { n: rep.status }));
  }
  etat.version = rep.headers.get("X-Version");
  try { etat.fichier = decodeURIComponent(rep.headers.get("X-Fichier") || ""); } catch { etat.fichier = ""; }
  etat.donnees = await rep.json();
  etat.modifie = false;
  reprendre();
  historique.length = 0;
  indexer();
  emettre("donnees");
  emettre("enregistrement");
}

export async function enregistrer() {
  if (!etat.donnees || LECTURE_SEULE) return;
  emettre("enregistrement", { enCours: true });
  try {
    const rep = await fetch("/api/donnees", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Version": etat.version || "" },
      body: JSON.stringify(etat.donnees),
    });
    const corps = await rep.json().catch(() => ({}));
    if (!rep.ok) throw new Error(t(corps.erreur || "Le serveur a répondu {n}.", { n: rep.status }));
    etat.version = corps.version;
    etat.modifie = false;
    emettre("enregistrement", { ok: true });
  } catch (e) {
    emettre("enregistrement", { erreur: e.message });
  }
}

// Changer de langue recharge la page : les modifications non enregistrées sont mises de côté le temps du rechargement
// (sessionStorage), puis reprises si le fichier n'a pas changé entre-temps. L'historique d'annulation, lui, est perdu.
const REPRISE = "cinabre.reprise";
export function mettreDeCote() {
  if (!etat.modifie) return true;
  try { sessionStorage.setItem(REPRISE, JSON.stringify({ version: etat.version, donnees: etat.donnees })); return true; }
  catch { return false; }
}
function reprendre() {
  let r = null;
  try { r = JSON.parse(sessionStorage.getItem(REPRISE)); sessionStorage.removeItem(REPRISE); } catch {}
  if (r && r.version === etat.version) { etat.donnees = r.donnees; etat.modifie = true; }
}

// Gèle les données en profondeur (Object.freeze sur chaque objet et tableau) : toute écriture est refusée
function figer(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(figer);
  }
  return o;
}

export function marquerModifie() {
  if (LECTURE_SEULE) return;
  etat.modifie = true;
  indexer();
  emettre("donnees");
  emettre("enregistrement");
}

// ─── Modifications avec historique : chaque modification peut être annulée (Ctrl+Z) ───

const historique = [];
const MAX_HISTORIQUE = 60;

// regroupement : { objet, champ } ; des modifications successives du même champ du même élément, à moins de
// REGROUPEMENT ms d'écart (saisie au clavier appliquée au fil de l'eau), ne font qu'une étape d'annulation
const REGROUPEMENT = 4000;
let derniere = null;
export function modifier(fn, regroupement = null) {
  if (LECTURE_SEULE) return;
  const maintenant = Date.now();
  const suite = regroupement && derniere && derniere.objet === regroupement.objet && derniere.champ === regroupement.champ
    && maintenant - derniere.instant < REGROUPEMENT && historique.length;
  if (!suite) {
    historique.push(JSON.stringify(etat.donnees));
    if (historique.length > MAX_HISTORIQUE) historique.shift();
  }
  derniere = regroupement ? { ...regroupement, instant: maintenant } : null;
  const resultat = fn(etat.donnees);
  marquerModifie();
  return resultat;
}

export function annuler() {
  if (LECTURE_SEULE) return false;
  derniere = null;
  if (!historique.length) return false;
  etat.donnees = JSON.parse(historique.pop());
  marquerModifie();
  return true;
}

export const peutAnnuler = () => historique.length > 0;

// dates triées par année, mois et jour (tri stable), les dates non comprises à la fin
export function trierDates(d) {
  d.dates.sort((a, b) => (a.annee == null) - (b.annee == null) || (instantDe(a) ?? 0) - (instantDe(b) ?? 0));
}

// Réglage de la frise : les dates précises ont chacune leur ligne (« jour », par défaut),
// ou partagent la ligne de leur mois (« mois ») ou de leur année (« annee »), la précision manquante étant écrite devant le nom
export const REGROUPEMENTS = ["annee", "mois", "jour"];
export const regroupement = () => (REGROUPEMENTS.includes(etat.donnees?.reglages?.regroupement) ? etat.donnees.reglages.regroupement : "jour");
// Détail de date écrit devant le nom des évènements (ce que la ligne ne montre pas) : rien, le mois, ou le jour (et le mois).
// Par défaut, une précision de plus que la ligne : le mois sur une ligne d'année, le jour sur une ligne de mois.
export const DETAILS = ["aucun", "mois", "jour"];
export const DETAIL_DEFAUT = { annee: "mois", mois: "jour", jour: "aucun" };
export const detail = () => (DETAILS.includes(etat.donnees?.reglages?.detail) ? etat.donnees.reglages.detail : DETAIL_DEFAUT[regroupement()]);
// Les évènements trop nombreux pour une ligne passent à la ligne suivante, sauf si la frise demande une seule ligne
export const uneSeuleLigne = () => etat.donnees?.reglages?.une_seule_ligne === true;
// Rappel des lignes spéciales en haut de la frise : brièvement (défaut), ou « continu » : chacune reste jusqu'à la suivante de même niveau
export const rappelContinu = () => etat.donnees?.reglages?.rappel === "continu";
// Onglet Jeu : affiché seulement si la frise le demande (Données, Réglages)
export const jeuActif = () => etat.donnees?.reglages?.jeu === true;
// Sous-lieux : dépliés sous leur lieu dans le panneau (défaut), ou repliés (une flèche les montre)
export const sousLieuxReplies = () => etat.donnees?.reglages?.sous_lieux === "replies";
// Statistiques : un sous-lieu compte dans son lieu de premier niveau (défaut), ou a son propre segment
export const empilerParSousLieu = () => etat.donnees?.reglages?.empilement === "sous_lieux";

// Statistiques : des plages d'années, chacune découpée en tranches de « pas » ans (bornes incluses).
// reglages.stats.plages = [{ debut, fin, pas }] ; par défaut, une seule plage par siècles, de - 5 000
// (ou du début de la frise s'il est plus tardif) jusqu'à la fin de la frise.
export const MAX_TRANCHES = 400;
export function plagesStats() {
  const p = etat.donnees?.reglages?.stats?.plages;
  return Array.isArray(p) && p.length ? { plages: p, defaut: false } : { plages: plagesParDefaut(), defaut: true };
}
export function plagesParDefaut() {
  let min = Infinity, max = -Infinity;
  const vu = (a) => { if (a != null) { min = Math.min(min, a); max = Math.max(max, a); } };
  etat.donnees?.dates.forEach((x) => vu(x.annee));
  etat.donnees?.periodes.forEach((p) => { if (p.type === "epoque") vu(p.debut_annee); });
  if (min === Infinity) return [];
  // de la première date (au plus tôt - 5 000) à la dernière, avec la plus fine durée de tranche qui ne donne pas trop de barres ;
  // les bornes sont arrondies à cette durée (tranches « rondes » : 1400-1499, et non 1453-1552)
  min = Math.max(-5000, min);
  max = Math.max(min, max);
  for (const pas of PAS_DEFAUT) {
    const debut = Math.max(-5000, Math.floor(min / pas) * pas), fin = Math.ceil((max + 1) / pas) * pas - 1;
    if ((fin - debut + 1) / pas <= MAX_BARRES_DEFAUT || pas === PAS_DEFAUT[PAS_DEFAUT.length - 1]) return [{ debut, fin, pas }];
  }
}
const PAS_DEFAUT = [1, 5, 10, 25, 100, 500, 1000];
const MAX_BARRES_DEFAUT = 80;
export function tranchesStats(plages) {
  const r = [];
  plages.forEach((p, k) => {
    for (let a = p.debut; a <= p.fin && r.length <= MAX_TRANCHES; a += p.pas) r.push({ debut: a, fin: Math.min(a + p.pas - 1, p.fin), pas: p.pas, plage: k });
  });
  return r;
}

// ─── Index : identifiants d'exécution pour retrouver chaque élément ───

export const index = { evenements: new Map(), periodes: new Map(), groupes: [], themes: [], parents: new Map() };

// ─── Deux niveaux de lieux : un lieu peut être rangé dans un autre (« parent »), sur un seul niveau ───
// Le parent doit être un lieu de premier niveau ; sinon le champ est ignoré (le lieu reste au premier niveau).
function parentValide(groupes, nom) {
  const g = groupes[nom], p = g?.parent;
  if (g?.type !== "lieu" || !p || p === nom || groupes[p]?.type !== "lieu" || groupes[p].parent) return null;
  return p;
}
export const parentDe = (nom) => index.parents.get(nom) ?? null;
export const sousLieux = (nom) => index.groupes.filter((g) => g.parent === nom).map((g) => g.nom);
// Noms des groupes dans l'ordre d'affichage : chaque lieu de premier niveau suivi de ses sous-lieux
export function ordreGroupes(groupes = etat.donnees.groupes) {
  const noms = Object.keys(groupes), r = [];
  for (const n of noms) {
    if (parentValide(groupes, n)) continue;
    r.push(n);
    for (const s of noms) if (parentValide(groupes, s) === n) r.push(s);
  }
  return r;
}

export function indexer() {
  const d = etat.donnees;
  index.evenements.clear();
  index.periodes.clear();
  let n = 0;
  d.dates.forEach((date) =>
    date.evenements.forEach((ev) => index.evenements.set(`e${n++}`, { ev, date }))
  );
  d.periodes.forEach((p, i) => index.periodes.set(`p${i}`, p));
  // dans l'ordre d'affichage : chaque lieu de premier niveau suivi de ses sous-lieux
  index.groupes = ordreGroupes(d.groupes).map((nom) => ({ nom, ...d.groupes[nom] })).map((g) => ({
    nom: g.nom, couleur: g.couleur, type: g.type, affichage: couleurAffichage(g.couleur), description: g.description ?? null,
    parent: parentValide(d.groupes, g.nom),
  }));
  index.parents = new Map(index.groupes.filter((g) => g.parent).map((g) => [g.nom, g.parent]));
  index.groupes.push({ nom: SANS_GROUPE, couleur: "#8a8680", type: "aucun", affichage: couleurAffichage(null),
    description: t("Évènements qui ne sont rattachés à aucun lieu.") });
  // thèmes : même forme que les groupes, { nom: { description } } ; une ancienne liste de noms est convertie
  if (Array.isArray(d.themes)) d.themes = Object.fromEntries(d.themes.map((t) => [t, {}]));
  if (!d.themes || typeof d.themes !== "object") d.themes = {};
  index.themes = Object.keys(d.themes);
}

export function descriptionTheme(nom) {
  if (nom === SANS_THEME) return t("Évènements et époques qui n'ont encore aucun thème.");
  return etat.donnees.themes[nom]?.description ?? null;
}

export function groupe(nom) {
  return index.groupes.find((g) => g.nom === nom) || index.groupes[index.groupes.length - 1];
}

export function couleurDe(groupes) {
  return groupe(groupes && groupes.length ? groupes[0] : SANS_GROUPE).affichage;
}

// Fond en bandes diagonales, une bande par groupe ; null s'il y a moins de deux groupes.
// Même intensité que le fond d'un évènement à un seul groupe (12 %, et 24 % au survol).
export function rayures(groupes, opacite = 12, pas = 6) {
  if (!groupes || groupes.length < 2) return null;
  const bandes = groupes.map((g, i) =>
    `color-mix(in srgb, ${groupe(g).affichage} ${opacite}%, transparent) ${i * pas}px ${(i + 1) * pas}px`);
  return `repeating-linear-gradient(135deg, ${bandes.join(", ")})`;
}

// Filtre commun : les lieux (ou échelles) cochés ET les thèmes cochés ; dans chaque partie, un seul suffit
export function passeFiltre(groupes, themes) {
  return passe(etat.filtre, groupes, SANS_GROUPE, true) && passe(etat.filtreThemes, themes, SANS_THEME);
}
// un lieu de premier niveau coché fait passer aussi ses sous-lieux
function passe(filtre, noms, sans, lieux = false) {
  if (!filtre.size) return true;
  if (!noms || !noms.length) return filtre.has(sans);
  return noms.some((n) => filtre.has(n) || (lieux && filtre.has(parentDe(n))));
}
export const filtreActif = () => etat.filtre.size > 0 || etat.filtreThemes.size > 0;

// ─── Dates ───

const UNITES = { Ga: 1e9, Ma: 1e6, ka: 1e3, k: 1e3 };

// ─── Dates précises : une date peut être précise à l'année, au mois ou au jour ───
// Stockées à côté de l'année : mois (1 à 12) et jour, écrits seulement s'ils sont connus
// (dates : annee, mois, jour ; périodes : debut_annee, debut_mois, debut_jour, fin_…).

const MOIS = {
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const MOIS_COURTS = {
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
// noms de mois reconnus à la saisie, en français ou en anglais, entiers ou abrégés (sans accents ni majuscules)
const NOMS_MOIS = new Map();
[["janvier", "janv", "jan", "january"], ["fevrier", "fevr", "fev", "feb", "february"], ["mars", "mar", "march"],
  ["avril", "avr", "apr", "april"], ["mai", "may"], ["juin", "jun", "june"], ["juillet", "juil", "jul", "july"],
  ["aout", "aug", "august"], ["septembre", "sept", "sep", "september"], ["octobre", "oct", "october"],
  ["novembre", "nov", "november"], ["decembre", "dec", "december"]]
  .forEach((noms, i) => noms.forEach((n) => NOMS_MOIS.set(n, i + 1)));
const moisDe = (mot) => NOMS_MOIS.get(normaliser(mot).replace(/\.$/, "")) ?? null;
// mots de mois propres à chaque langue : une date déjà écrite dans la langue de l'interface s'affiche telle quelle
const MOTS_LANGUE = {
  fr: new Set(["janvier", "janv", "fevrier", "fevr", "fev", "mars", "avril", "avr", "mai", "juin", "juillet", "juil", "aout",
    "septembre", "sept", "octobre", "oct", "novembre", "nov", "decembre", "dec"]),
  en: new Set(["january", "jan", "february", "feb", "march", "mar", "april", "apr", "may", "june", "jun", "july", "jul",
    "august", "aug", "september", "sep", "october", "oct", "november", "nov", "december", "dec"]),
};
const joursDansMois = (mois) => new Date(Date.UTC(2000, mois, 0)).getUTCDate();   // 2000 : février à 29 jours

// « 14 juillet 1789 », « 1er juillet 1789 », « juillet 1789 », « July 14, 1789 », « 14 July 1789 », « 14/07/1789 »
// → { annee, mois, jour } (mois et jour absents s'ils ne sont pas donnés) ; null si non compris
export function parserDate(texte) {
  if (texte == null) return null;
  const s = String(texte).replace(/[\u00a0\u202f\u2009]/g, " ").trim()
    .replace(/^(?:~|≈|vers\b|environ\b|env\.|ca\.|c\.|circa\b|about\b|around\b|approx\.)\s*/i, "");
  const precise = (jour, mois, reste) => {
    const annee = parserAnnee(reste);
    if (annee == null || !mois || (jour != null && !(jour >= 1 && jour <= joursDansMois(mois)))) return null;
    return jour != null ? { annee, mois, jour } : { annee, mois };
  };
  const MOT = "([A-Za-zÀ-ÿ]+\\.?)";
  let m;
  if ((m = s.match(new RegExp(`^(\\d{1,2})(?:er|st|nd|rd|th)?\\s+${MOT}\\s+(.+)$`, "i"))) && moisDe(m[2]))
    return precise(Number(m[1]), moisDe(m[2]), m[3]);
  if ((m = s.match(new RegExp(`^${MOT}\\s+(\\d{1,2})(?:st|nd|rd|th)?,\\s*(.+)$`, "i"))) && moisDe(m[1]))
    return precise(Number(m[2]), moisDe(m[1]), m[3]);
  if ((m = s.match(new RegExp(`^${MOT}\\s+(.+)$`, "i"))) && moisDe(m[1]))
    return precise(null, moisDe(m[1]), m[2]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(-?\d+)$/))) return precise(Number(m[1]), Number(m[2]) <= 12 ? Number(m[2]) : 0, m[3]);
  const annee = anneeSeule(s);
  return annee == null ? null : { annee };
}

export function parserAnnee(texte) {
  return parserDate(texte)?.annee ?? null;
}

// Position dans le temps, pour trier et placer : année, puis mois, puis jour (une date sans mois vient avant janvier)
export const instant = (annee, mois, jour) => (annee == null ? null : annee * 10000 + (mois || 0) * 100 + (jour || 0));
export const instantDe = (x) => instant(x.annee, x.mois, x.jour);
export const instantDebut = (p) => instant(p.debut_annee, p.debut_mois, p.debut_jour);
// fin incluse : une fin « 1804 » va jusqu'au bout de 1804, « mai 1804 » jusqu'au bout du mois
export const instantFin = (p) => (p.fin_annee == null ? null
  : p.fin_annee * 10000 + (p.fin_mois ? p.fin_mois * 100 + (p.fin_jour || 99) : 9999));

// Date mise en forme dans la langue de l'interface : « 14 juillet 1789 », « juil. 1789 » (court), « 14 July 1789 »
// sansAnnee : « 14 juil. » (devant un nom, sur la ligne d'une année)
export function formatDate({ annee, mois, jour }, court = false, sansAnnee = false) {
  if (!mois) return sansAnnee ? "" : formatAnnee(annee);
  const nom = (court ? MOIS_COURTS : MOIS)[anglais ? "en" : "fr"][mois - 1];
  const j = jour ? (!anglais && jour === 1 ? "1er" : String(jour)) : "";
  const a = sansAnnee ? "" : " " + (annee < 0 && !anglais ? `${-annee} av. J.-C.` : formatAnnee(annee));
  return `${j ? j + " " : ""}${nom}${a}`;
}

// Écrit les champs de date d'un objet dans l'ordre du fichier : prefixe « » (dates) ou « debut_ » / « fin_ » (périodes)
export function ecrireDate(o, v, prefixe = "") {
  const cles = prefixe ? [prefixe.slice(0, -1), prefixe + "annee", prefixe + "mois", prefixe + "jour"] : ["date", "annee", "mois", "jour"];
  const avant = Object.keys(o), apres = [];
  let vu = false;
  for (const k of avant) { if (cles.includes(k)) vu = true; else if (vu) apres.push(k); }
  const reste = apres.map((k) => [k, o[k]]);
  for (const k of [...cles, ...apres]) delete o[k];
  o[cles[0]] = v.texte;
  o[cles[1]] = v.annee;
  if (v.mois) o[cles[2]] = v.mois;
  if (v.mois && v.jour) o[cles[3]] = v.jour;
  for (const [k, val] of reste) o[k] = val;
}

// Durée d'une période : en jours ou en mois si ses deux bornes sont précises et proches, sinon en années
export function dureePeriode(p, finAnnee) {
  if (p.debut_annee == null || finAnnee == null || finAnnee < p.debut_annee) return null;
  if (p.debut_mois && p.fin_mois && p.fin_annee != null) {
    const jour = (a, m, j) => { const d = new Date(Date.UTC(2000, m - 1, j || 1)); d.setUTCFullYear(a); return d.getTime() / 864e5; };
    const n = Math.round(jour(p.fin_annee, p.fin_mois, p.fin_jour) - jour(p.debut_annee, p.debut_mois, p.debut_jour));
    if (n >= 0 && n < 62) return tn(n, "{n} jour", "{n} jours");
    if (n >= 0 && n < 730) { const m = Math.round(n / 30.44); return tn(m, "{n} mois", "{n} mois"); }
  }
  return formatDuree(finAnnee - p.debut_annee);
}

function anneeSeule(texte) {
  if (texte == null) return null;
  let s = String(texte).replace(/[\u00a0\u202f\u2009]/g, " ").replace(/[\u2212\u2013]/g, "-").trim();
  let avant;
  do { avant = s; s = s.replace(/^(?:~|≈|±|:|vers\b|env\.?|environ\b|ca\.?|c\.|en\b|circa\b|about\b|around\b|approx\.?|in\b)\s*/i, ""); } while (s !== avant);
  let m = s.match(/^(\d+(?:[.,]\d+)?)\s*(Ga|Ma|ka|k)$/);
  if (m) return -Math.round(parseFloat(m[1].replace(",", ".")) * UNITES[m[2]]);
  let ere = null;
  // ère : « av. J.-C. », « ap. J.-C. », ou à l'anglaise « BC », « BCE », « AD », « CE »
  m = s.match(/\s*((?:av|ap)\.?\s*J\.?\s*-?\s*C\.?|B\.?\s?C\.?(?:\s?E\.?)?|A\.?\s?D\.?|C\.?\s?E\.?)\s*$/i);
  if (m) { ere = /^(av|b)/i.test(m[1]) ? "av" : "ap"; s = s.slice(0, m.index); }
  else if ((m = s.match(/^A\.?\s?D\.?\s+/i))) { ere = "ap"; s = s.slice(m[0].length); }   // « AD 30 »
  const compact = s.replace(/\s+/g, "");
  if (!/^[-+]?\d+$/.test(compact)) return null;
  const n = parseInt(compact, 10);
  return ere === "av" ? -Math.abs(n) : ere === "ap" ? Math.abs(n) : n;
}

// ─── Dates approximatives ───
// Stockées à part (ev.approx, p.debut_approx, p.fin_approx, écrits seulement s'ils sont vrais) ;
// affichées avec « ~ » devant le texte. Taper « ~ 1453 » ou « vers 1453 » coche la case et retire le préfixe.
const PREFIXE_APPROX = /^\s*(?:~|≈|vers\b|environ\b|env\.|ca\.|c\.|circa\b|about\b|around\b|approx\.)\s*/i;

export function lireApprox(texte) {
  const m = String(texte ?? "").match(PREFIXE_APPROX);
  return m ? { texte: String(texte).slice(m[0].length), approx: true } : { texte, approx: false };
}

export function dateAffichee(texte, approx) {
  return texte == null || texte === "" ? "" : approx ? `~ ${texteDate(texte)}` : texteDate(texte);
}

// Texte d'une date adapté à la langue de l'interface, sans toucher aux données :
// en anglais, « - 2 334 » ou « 2334 av. J.-C. » s'affichent « 2334 BC » et « aujourd'hui » « today » ;
// en français, une date écrite à l'anglaise (« 2334 BC ») s'affiche « - 2 334 ». Ga, Ma et k ne changent pas.
export function texteDate(texte) {
  if (texte == null || texte === "") return texte ?? "";
  const s = String(texte).trim();
  if (/^(aujourd'?hui|today)$/i.test(s)) return t("aujourd'hui");
  if (/\d\s?(Ga|Ma|ka|k)$/.test(s)) return s;
  const d = parserDate(s);
  if (d?.mois) {                                     // « 14 juillet 1789 » ⇄ « 14 July 1789 »
    const mots = normaliser(s).split(/[^a-z]+/);
    return mots.some((m) => MOTS_LANGUE[anglais ? "en" : "fr"].has(m)) || /^\d/.test(s) && !/[a-z]/i.test(s) ? s : formatDate(d);
  }
  const aLAnglaise = /(^|\s|\d)(B\.?\s?C\.?(\s?E\.?)?|A\.?\s?D\.?|C\.?\s?E\.?)$/i.test(s) || /^A\.?\s?D\.?\s/i.test(s);
  if (anglais === aLAnglaise) return s;              // déjà écrite comme l'interface
  const n = parserAnnee(s);
  return n == null ? s : formatAnnee(n);
}

// Année calculée : français « - 2 334 », anglais « 2334 BC » (séparateur de milliers au-delà de 9 999)
export function formatAnnee(n) {
  if (n == null) return "";
  if (anglais) {
    const a = Math.abs(n), texte = a >= 10000 ? a.toLocaleString("en-US") : String(a);
    return n < 0 ? `${texte} BC` : texte;
  }
  return n < 0 ? "- " + Math.abs(n).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") : String(n);
}

export function formatDuree(n) {
  if (n == null || !isFinite(n)) return "";
  const loc = anglais ? "en-US" : "fr-FR";
  const nombre = (x) => x.toLocaleString(loc, { maximumFractionDigits: 1 }).replace(/\u202f|\u00a0/g, " ");
  if (anglais) {
    if (n >= 1e9) return `${nombre(n / 1e9)} billion years`;
    if (n >= 1e6) return `${nombre(n / 1e6)} million years`;
    return `${nombre(Math.round(n))} year${Math.round(n) === 1 ? "" : "s"}`;
  }
  if (n >= 1e9) return `${nombre(n / 1e9)} milliard${n >= 2e9 ? "s" : ""} d'années`;
  if (n >= 1e6) return `${nombre(n / 1e6)} million${n >= 2e6 ? "s" : ""} d'années`;
  return `${nombre(Math.round(n))} an${n >= 2 ? "s" : ""}`;
}

// ─── Texte ───

export function echapper(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function normaliser(s) {
  return String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// ─── Couleurs : les couleurs Excel sont pensées pour un fond blanc ; on les éclaircit si besoin ───

function hexVersHsl(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslVersHex(h, s, l) {
  const f = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3);
  }
  return "#" + [r, g, b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

// Thème de l'interface : celui du système, sauf choix avec le bouton de la barre du haut (data-theme sur <html>)
export function themeClair() {
  const choix = document.documentElement.dataset.theme;
  return choix ? choix === "clair" : matchMedia("(prefers-color-scheme: light)").matches;
}

// Couleur d'un groupe à l'affichage. Les couleurs sont choisies comme pour un fond blanc ; en thème sombre, les gris
// sont inversés (le noir devient le plus clair) et les couleurs sombres éclaircies ; en thème clair, les couleurs
// claires sont foncées pour rester lisibles sur le parchemin.
export function couleurAffichage(hex) {
  const clair = themeClair();
  if (!hex) return clair ? "#7a7163" : "#a9a49a";
  let [h, s, l] = hexVersHsl(hex);
  if (clair) {
    if (s < 0.12) l = 0.2 + 0.4 * l;                // gris : le noir reste le plus foncé
    else l = Math.min(l, 0.42);
    if (s > 0.75) s = 0.75;
    return hslVersHex(h, s, l);
  }
  if (s < 0.12) l = 0.9 - 0.35 * l;               // gris : échelle inversée, le noir devient le plus clair
  else if (l < 0.66) l = 0.66 + (l / 0.66) * 0.1; // couleurs sombres éclaircies pour le fond nuit
  if (s > 0.85) s = 0.85;
  return hslVersHex(h, s, l);
}
