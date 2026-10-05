// Onglet Frise : une ligne par date, les évènements côte à côte sur une seule ligne.

import {
  themeClair,
  etat, index, passeFiltre, filtreActif, couleurDe, groupe, echapper, formatAnnee,
  normaliser, parserDate, rayures, dateAffichee, texteDate, SANS_GROUPE,
  instant, instantDe, instantDebut, instantFin, formatDate, regroupement, detail, uneSeuleLigne, rappelContinu,
  lireFrise, ecrireFrise,
} from "./donnees.js";
import { fermer as fermerPopup } from "./popup.js";
import { t, tn } from "./langue.js";

// ─── Réglages ───
const H = { date: 24, section: 32, sep: 15 };      // hauteur des lignes (px)
const CONTEXTE_DISTANCE = 10;                       // réglage « brièvement » : une ligne spéciale reste rappelée 10 lignes après son passage
const BANDE = { pas: 19, marge: 8 };                // colonnes d'échelle à gauche (rubans de 16 px)
const EPOQUE = { pas: 19, marge: 8 };               // colonnes d'époques à droite (rubans de 16 px)
const PART_EPOQUES = 0.3;                           // les barres d'époques prennent au plus 30 % de la largeur de la frise…
const MIN_COLONNES_EPOQUES = 6;                     // … mais toujours au moins 6 colonnes
const ECART_LIEUX = 14;                             // px d'écart vertical entre deux lieux qui partagent une colonne
const NOM_TRES_PETIT = 18;                          // px en dessous desquels le nom lui-même est masqué
const LARGEUR_EV = 150;                             // px : largeur visée par évènement quand une date passe à la ligne
// repères du menu « Aller à » : un libellé, ou l'année mise en forme selon la langue
const REPERES = [
  [-1e9, "1 milliard d'années"], [-1e6, "1 million d'années"], [-1e5, "100 000 ans"],
  [-10000], [-5000], [-3000], [-2000], [-1000], [-500], [0, "An 0"], [500], [1000], [1500], [1800],
];
const MOUVEMENT = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

let app, racine, defil, contenu, lignesEl, bandesEl, epoquesEl, contexteEl, menuEl, compteEl;
let carte, carteCanvas, carteMarques, carteVue, carteEtiquette;
let m = null;                   // modèle courant
let resultats = [], courant = -1, lie = null, rafScroll = 0, aRefaire = false;
let parRangee = Infinity;       // évènements par rangée dans une ligne de date (Infinity : une seule rangée)
const visible = () => racine && racine.classList.contains("active") && defil.clientHeight > 0;

export function init(el, application) {
  app = application;
  racine = el;
  racine.innerHTML = `
    <div class="frise-outils">
      <button class="bouton" id="aller-a" aria-haspopup="true">${t("Aller à")} <span class="chevron"></span></button>
      <div class="legende-codes">
        <span><span class="ev echantillon limite">${t("Nom")}</span> ${t("début ou fin d'époque")}</span>
        <span><span class="ev echantillon regne">${t("Nom")}</span> ${t("début de règne")}</span>
        <span><span class="ev echantillon"><span class="etoile">★</span>${t("Nom")}</span> ${t("important")}</span>
        <span><span class="ev echantillon note">${t("Nom")}</span> ${t("description au survol")}</span>
        <span><span class="barre-echantillon"></span> ${t("durée d'une époque")}</span>
      </div>
      <div class="frise-compte"></div>
      <div class="menu" id="menu-aller"></div>
    </div>
    <div class="frise-cadre">
      <div class="frise-defil">
        <div class="frise-contexte"><div class="contexte"></div></div>
        <div class="frise-contenu">
          <div class="frise-bandes"></div>
          <div class="frise-lignes"></div>
          <div class="frise-epoques"></div>
        </div>
      </div>
      <div class="carte" title="">
        <canvas class="carte-fond"></canvas><canvas class="carte-marques"></canvas>
        <div class="carte-vue"></div><div class="carte-etiquette"></div>
      </div>
    </div>`;
  defil = racine.querySelector(".frise-defil");
  contenu = racine.querySelector(".frise-contenu");
  lignesEl = racine.querySelector(".frise-lignes");
  bandesEl = racine.querySelector(".frise-bandes");
  epoquesEl = racine.querySelector(".frise-epoques");
  contexteEl = racine.querySelector(".contexte");
  menuEl = racine.querySelector("#menu-aller");
  compteEl = racine.querySelector(".frise-compte");
  carte = racine.querySelector(".carte");
  carteCanvas = carte.querySelector(".carte-fond");
  carteMarques = carte.querySelector(".carte-marques");
  carteVue = carte.querySelector(".carte-vue");
  carteEtiquette = carte.querySelector(".carte-etiquette");

  defil.addEventListener("scroll", () => {
    if (rafScroll) return;
    rafScroll = requestAnimationFrame(() => { rafScroll = 0; surDefilement(); });
  }, { passive: true });
  racine.addEventListener("mouseover", survolLie);
  // Alt + clic sur un évènement, une époque ou une ligne spéciale : l'ouvrir dans l'onglet Données
  racine.addEventListener("click", (e) => {
    const el = e.altKey && e.target.closest(".frise-defil [data-pop]");
    if (el) { e.preventDefault(); app.ouvrirDonnees(el.dataset.pop); }
  });
  racine.querySelector("#aller-a").addEventListener("click", (e) => { e.stopPropagation(); basculerMenu(); });
  menuEl.addEventListener("click", clicMenu);
  document.addEventListener("click", (e) => { if (!menuEl.contains(e.target)) menuEl.classList.remove("ouvert"); });
  initCarte();
  new ResizeObserver(() => {
    if (!m || !visible()) return;
    if (calculerParRangee() !== parRangee) return rendre();   // la largeur change le nombre d'évènements par rangée
    // la largeur permise aux époques change, et elles n'y tenaient pas toutes (ou n'y tiennent plus)
    const maxCol = maxColonnesEpoques();
    if (maxCol !== m.maxColonnes && (m.epoquesSansBarre || m.nColonnesEpoques > maxCol)) return rendre();
    mesurerRubans(); dessinerCarte(); dessinerMarques(); surDefilement();
  }).observe(carte);
}

export function afficher() {
  if (!m || aRefaire) { aRefaire = false; return rendre(); }
  if (defil.scrollTop === 0 && lireAncre() != null) allerAnnee(lireAncre(), "auto");
  dessinerCarte(); dessinerMarques(); surDefilement();
}

// Si l'onglet est caché, le rendu attend son prochain affichage.
export function majDonnees() { if (!racine) return; if (visible()) rendre(); else aRefaire = true; }
export function majFiltre() { majDonnees(); }
export function fermerMenus() { menuEl.classList.remove("ouvert"); }

// ─── Modèle ───

function borne(a) {   // début du groupe d'années contenant a (siècles dès -1000, millénaires dès -5000)
  if (a >= -1000) return Math.floor(a / 100) * 100;
  if (a >= -5000) return Math.floor(a / 1000) * 1000;
  return null;
}

// Toutes les positions dans le temps sont des « instants » (année, puis mois, puis jour : voir instant() dans donnees.js),
// pour que les dates précises au mois ou au jour se rangent et se placent correctement.
function construireModele() {
  const d = etat.donnees;
  const mode = regroupement(), parMois = mode === "mois", parAnnee = mode === "annee";
  // 1. Ce qu'il faut placer : chaque évènement (sur sa date) et chaque début d'époque
  const items = [];
  let n = 0, ordre = 0, derniere = -Infinity;
  for (const date of d.dates) {
    const inst = instantDe(date);
    if (inst != null) derniere = inst;
    for (const ev of date.evenements) {
      const id = `e${n++}`;
      if (passeFiltre(ev.groupes, ev.themes))
        items.push({ id, ev, date: { texte: date.date, annee: date.annee, mois: date.mois, jour: date.jour }, inst, tri: inst ?? derniere, ordre: ordre++ });
    }
  }
  d.periodes.forEach((p, i) => {
    if (p.type !== "epoque" || !passeFiltre(p.groupes, p.themes)) return;
    const inst = instantDebut(p);
    items.push({ id: `p${i}`, epoque: true, date: { texte: p.debut, annee: p.debut_annee, mois: p.debut_mois, jour: p.debut_jour },
      inst, tri: inst ?? Infinity, ordre: ordre++ });
  });
  items.sort((a, b) => (a.tri - b.tri) || (!!b.epoque - !!a.epoque) || (a.ordre - b.ordre));   // à date égale, les époques d'abord

  // Clé de la ligne : la date elle-même, ou son mois, ou son année, selon le réglage de la frise
  const cleLigne = (it) => (it.inst == null ? `t:${it.date.texte}`
    : parAnnee ? instant(it.date.annee) : parMois && it.date.mois ? instant(it.date.annee, it.date.mois, 0) : it.inst);

  // 2. Lignes spéciales, triées par début puis par niveau d'échelle
  const rang = new Map(index.groupes.filter((g) => g.type === "echelle").map((g, k) => [g.nom, k]));
  const sections = d.periodes
    .map((p, i) => ({ type: "section", id: `p${i}`, p, a: instantDebut(p) }))
    .filter((s) => s.p.type === "section")
    .sort((x, y) => ((x.a ?? Infinity) - (y.a ?? Infinity) || 0)
      || (rang.get(x.p.groupes[0]) ?? 99) - (rang.get(y.p.groupes[0]) ?? 99));
  sections.forEach((s) => (s.fin = finEffective(s, sections)));

  // 3. On déroule le temps : séparateurs et lignes spéciales s'insèrent avant le premier élément qu'ils précèdent ;
  // un élément rejoint la ligne précédente si elle a la même clé et que rien ne s'est inséré entre les deux
  // (une ligne spéciale qui commence au milieu d'un mois coupe donc la ligne du mois en deux, comme dans un tableur)
  const lignes = [];
  let js = 0, precedente = null;
  for (const it of items) {
    if (it.inst != null) {
      const annee = it.date.annee, b = borne(annee);
      const sep = b != null && (precedente == null || (precedente < annee && borne(precedente) !== b))
        ? { type: "sep", annee: b, mil: b % 1000 === 0 || b < -1000 } : null;
      const aPlacer = [];
      while (js < sections.length && sections[js].a != null && sections[js].a <= it.inst) {
        const s = sections[js++];
        if (!filtreActif() || s.fin >= it.inst) aPlacer.push(s);   // filtre actif : on saute les sections vides
      }
      // les lignes spéciales commencées avant le séparateur passent au-dessus de lui
      const avant = sep ? aPlacer.filter((s) => s.p.debut_annee < sep.annee) : aPlacer;
      lignes.push(...avant);
      if (sep) lignes.push(sep);
      lignes.push(...aPlacer.filter((s) => !avant.includes(s)));
      precedente = annee;
    }
    const cle = cleLigne(it);
    let l = lignes[lignes.length - 1];
    if (!l || l.type !== "date" || l.cle !== cle) {
      const { annee, mois, jour } = it.date;
      // date précise : écrite en abrégé dans la colonne (« 14 juil. 1789 », « juil. 1789 » pour une ligne de mois,
      // « 1789 » pour une ligne d'année) ; la précision retirée de la colonne passe devant chaque nom
      const prec = it.inst == null || !mois ? null : parAnnee ? { annee } : { annee, mois, jour: parMois ? null : jour };
      l = { type: "date", cle, texte: it.date.texte, annee, prec, devant: it.inst == null ? null : parAnnee ? "annee" : parMois ? "mois" : null,
        a: it.inst == null ? null : cle, evs: [], epoques: [], tous: [] };
      lignes.push(l);
    }
    if (it.epoque) l.epoques.push(it.id); else l.evs.push({ id: it.id, ev: it.ev });
    l.tous.push(it);
  }
  while (js < sections.length) lignes.push(sections[js++]);

  lignes.forEach((l, i) => { l.i = i; if (l.type === "sep") l.a = instant(l.annee); });
  const modele = { lignes, dates: lignes.filter((l) => l.type === "date") };
  placerVerticalement(modele);
  return modele;
}

// Position verticale de chaque ligne ; une ligne de date a autant de rangées que nécessaire (parRangee évènements chacune)
function placerVerticalement(modele) {
  const { lignes } = modele;
  const y = new Float64Array(lignes.length + 1);
  lignes.forEach((l, i) => {
    if (l.type === "date") l.rangees = Math.max(1, Math.ceil(l.tous.length / parRangee));
    y[i + 1] = y[i] + H[l.type] * (l.rangees || 1);
  });
  modele.y = y;
  modele.total = y[lignes.length];
}

// Nombre d'évènements par rangée : ce qui tient dans la largeur laissée aux évènements, à LARGEUR_EV chacun
function calculerParRangee() {
  if (uneSeuleLigne()) return Infinity;
  const s = getComputedStyle(racine), px = (v) => parseFloat(s.getPropertyValue(v)) || 0;
  const largeur = contenu.clientWidth - px("--l-bandes") - px("--l-epoques") - px("--l-date") - 18;
  return Math.max(2, Math.floor((largeur + 3) / (LARGEUR_EV + 3)));
}

// Fin d'une ligne spéciale (instant) : sa fin, « aujourd'hui », ou le début de la suivante du même groupe
function finEffective(s, sections) {
  const p = s.p;
  if (p.fin_annee != null) return instantFin(p);
  if (p.fin) return Infinity;                          // « aujourd'hui »
  const suivante = sections.find((t) => t !== s && t.p.groupes[0] === p.groupes[0] && t.a != null && t.a > (s.a ?? -Infinity));
  return suivante ? suivante.a : Infinity;
}

// Premier y d'une ligne (après iDepart) dont l'instant est ≥ inst
function yPremiere(inst, iDepart = -1) {
  for (let i = iDepart + 1; i < m.lignes.length; i++) if (m.lignes[i].a != null && m.lignes[i].a >= inst) return m.y[i];
  return m.total;
}
// Bas de la dernière ligne datée (après iDepart) dont l'instant est ≤ inst
function yDerniere(inst, iDepart) {
  let bas = null;
  for (let i = iDepart; i < m.lignes.length; i++) {
    const l = m.lignes[i];
    if (l.type !== "date" || l.a == null) continue;
    if (l.a > inst) break;
    bas = m.y[i + 1];
  }
  return bas;
}

// Texte de la colonne des dates : abrégé pour une date précise, sinon tel qu'il est écrit
const libelleLigne = (l) => (l.prec ? formatDate(l.prec, true) : l.texte);

// ─── Rendu ───

function rendre() {
  fermerPopup();
  const ancre = m && defil.scrollTop > 0 ? anneeEnHaut() : lireAncre();
  m = construireModele();
  dessinerColonnes();
  // la largeur laissée aux évènements n'est connue qu'une fois les colonnes posées : si elle change le nombre
  // d'évènements par rangée, on replace les lignes et on redessine les colonnes (une fois suffit)
  const par = calculerParRangee();
  if (par !== parRangee) { parRangee = par; placerVerticalement(m); dessinerColonnes(); }
  mesurerRubans();
  contenu.style.height = m.lignes.length ? `${m.total}px` : "";
  lignesEl.innerHTML = m.lignes.map(htmlLigne).join("") || htmlVide();

  const nEv = m.dates.reduce((s, l) => s + l.evs.length + l.epoques.length, 0);
  compteEl.textContent = `${tn(m.dates.length, "{n} date", "{n} dates")}, ${tn(nEv, "{n} évènement", "{n} évènements")}${filtreActif() ? " " + t("(filtrés)") : ""}`;
  // époques sans barre faute de place : mention discrète, l'explication en infobulle
  if (m.epoquesSansBarre) {
    const s = document.createElement("span");
    s.className = "sans-barre";
    s.textContent = ` · ${tn(m.epoquesSansBarre, "{n} époque sans barre", "{n} époques sans barre")}`;
    s.title = t("Pas assez de place pour toutes les barres d'époques : les époques marquées ★, puis les plus longues, passent en premier. Les autres gardent leur pastille ; filtrer un lieu les fait apparaître.");
    compteEl.append(s);
  }

  construireMenu();
  preparerRappel();
  if (ancre != null) allerAnnee(ancre, "auto");
  dessinerCarte();
  rechercher(etat.recherche, false);
  surDefilement();
}

// Bandes d'échelle (gauche) et barres d'époques (droite), placées d'après les positions verticales des lignes
function dessinerColonnes() {

  // Colonnes d'échelle (gauche)
  const niveaux = index.groupes.filter((g) => g.type === "echelle"
    && m.lignes.some((l) => l.type === "section" && l.p.groupes[0] === g.nom));
  const autres = m.lignes.some((l) => l.type === "section" && !niveaux.some((g) => g.nom === l.p.groupes[0]));
  const nCol = niveaux.length + (autres ? 1 : 0);
  const lBandes = nCol ? BANDE.marge + nCol * BANDE.pas : 0;
  let html = "";
  for (const l of m.lignes) {
    if (l.type !== "section") continue;
    let col = niveaux.findIndex((g) => g.nom === l.p.groupes[0]);
    if (col < 0) col = niveaux.length;
    const y0 = m.y[l.i], y1 = Math.max(y0 + H.section, l.fin === Infinity ? m.total : yPremiere(l.fin, l.i));
    html += `<div class="bande ruban" data-pop="${l.id}" style="--ct:${couleurDe(l.p.groupes)};top:${y0 + 3}px;height:${y1 - y0 - 6}px;left:${BANDE.marge - 4 + col * BANDE.pas}px">${contenuRuban(l.p)}</div>`;
  }
  bandesEl.innerHTML = html;

  // Époques (droite) : une colonne par lieu, sous-colonnes si chevauchement
  const toutes = [];
  for (const l of m.dates) for (const pid of l.epoques) {
    const p = index.periodes.get(pid);
    const y0 = m.y[l.i] + 4;
    const y1 = Math.max(y0 + 10, (p.fin_annee != null ? yDerniere(instantFin(p), l.i) : null) ?? m.y[l.i + 1]) - 4;
    toutes.push({ pid, p, y0, y1 });
  }
  // Largeur limitée (PART_EPOQUES de la frise) : si toutes les barres ne tiennent pas, on garde les plus prioritaires
  // (★ d'abord, puis les plus longues) ; les autres n'ont que leur pastille.
  const maxColonnes = maxColonnesEpoques();
  let disposition = disposerEpoques(toutes);
  m.epoquesSansBarre = 0;
  if (disposition.nColonnes > maxColonnes) {
    const duree = (p) => (p.fin_annee ?? new Date().getFullYear()) - (p.debut_annee ?? 0);
    const tri = [...toutes].sort((a, b) => !!b.p.important - !!a.p.important || duree(b.p) - duree(a.p) || a.y0 - b.y0);
    // 1. Par ordre de priorité, une époque est retenue si, sur toute sa hauteur, moins de maxColonnes barres déjà
    //    retenues la chevauchent
    const retenues = [];
    for (const b of tri) {
      const chevauchent = retenues.filter((r) => r.y0 < b.y1 + 3 && b.y0 < r.y1 + 3);
      let max = 0;
      for (const r of chevauchent) {
        const y = Math.max(r.y0, b.y0);
        max = Math.max(max, chevauchent.filter((s) => s.y0 <= y && y < s.y1 + 3).length);
      }
      if (max < maxColonnes) retenues.push(b);
    }
    // 2. Rangement par lieu s'il tient ; sinon rangement libre (chaque barre dans la première colonne libre à sa
    //    hauteur, la couleur disant le lieu), qui tient toujours : jamais plus de maxColonnes barres à la fois
    disposition = disposerEpoques(retenues);
    if (disposition.nColonnes > maxColonnes) disposition = disposerLibre(retenues);
    m.epoquesSansBarre = toutes.length - retenues.length;
  }
  const { blocs, nColonnes } = disposition;
  Object.assign(m, { maxColonnes, nColonnesEpoques: nColonnes });
  html = "";
  for (const { g, barres, x } of blocs)
    for (const b of barres)
      html += `<div class="barre-ep ruban${b.p.regne ? " regne" : ""}" data-pop="${b.pid}" data-epoque="${b.pid}" style="--ct:${g.affichage};top:${b.y0}px;height:${Math.max(6, b.y1 - b.y0)}px;left:${EPOQUE.marge - 4 + (x + b.k) * EPOQUE.pas}px">${contenuRuban(b.p)}</div>`;
  epoquesEl.innerHTML = html;
  const lEpoques = nColonnes ? 2 * EPOQUE.marge - 7 + nColonnes * EPOQUE.pas : 0;

  racine.style.setProperty("--l-bandes", `${lBandes}px`);
  // colonne des dates un peu plus large pour les dates au jour (« 14 juil. 1789 »)
  const auJour = m.dates.some((l) => l.prec?.jour) || m.lignes.some((l) => l.type === "section" && l.p.debut_jour);
  racine.style.setProperty("--l-date", auJour ? "112px" : m.dates.some((l) => l.prec) ? "98px" : "");
  racine.style.setProperty("--l-epoques", `${lEpoques}px`);
}

const maxColonnesEpoques = () => Math.max(MIN_COLONNES_EPOQUES, Math.floor(contenu.clientWidth * PART_EPOQUES / EPOQUE.pas));

// Rangement libre : par ordre d'apparition, chaque barre va dans la première colonne libre à sa hauteur
// (autant de colonnes que de barres simultanées, au plus) ; un bloc par lieu pour la couleur
function disposerLibre(toutes) {
  const fins = [], blocs = new Map();
  for (const b of [...toutes].sort((a, c) => a.y0 - c.y0)) {
    let k = fins.findIndex((y1) => y1 <= b.y0 - 3);
    if (k < 0) k = fins.length;
    fins[k] = b.y1;
    const g = groupe(b.p.groupes[0] || SANS_GROUPE);
    if (!blocs.has(g)) blocs.set(g, { g, barres: [], x: 0 });
    blocs.get(g).barres.push({ ...b, k });
  }
  return { blocs: [...blocs.values()], nColonnes: fins.length };
}

// Range des barres d'époques : sous-colonnes dans chaque lieu, puis lieux côte à côte (placerBlocs)
function disposerEpoques(toutes) {
  const parGroupe = new Map();
  for (const b of toutes) {
    const g = b.p.groupes[0] || SANS_GROUPE;
    if (!parGroupe.has(g)) parGroupe.set(g, []);
    parGroupe.get(g).push({ ...b });
  }
  // 1. Dans chaque lieu : sous-colonnes quand ses époques se chevauchent ; chaque sous-colonne retient sa plage [y0, y1]
  const blocs = [];
  for (const g of index.groupes) {
    const barres = parGroupe.get(g.nom);
    if (!barres) continue;
    const colonnes = [];   // dernière barre de chaque sous-colonne
    for (const b of barres.sort((a, c) => a.y0 - c.y0)) {
      // deux époques qui se suivent (fin de l'une = début de l'autre) restent dans la même sous-colonne
      const suit = (c) => c.p.fin_annee != null && b.p.debut_annee != null
        && instant(c.p.fin_annee, c.p.fin_mois, c.p.fin_jour) <= instantDebut(b.p);
      let k = colonnes.findIndex((c) => c.y1 <= b.y0 - 3 || suit(c));
      if (k < 0) k = colonnes.length;
      else if (colonnes[k].y1 > b.y0 - 3) colonnes[k].y1 = b.y0 - 3;   // la précédente s'arrête juste avant
      colonnes[k] = b;
      b.k = k;
    }
    const cols = colonnes.map(() => ({ y0: Infinity, y1: -Infinity }));
    for (const b of barres) { cols[b.k].y0 = Math.min(cols[b.k].y0, b.y0); cols[b.k].y1 = Math.max(cols[b.k].y1, b.y1); }
    blocs.push({ g, barres, cols, rang: blocs.length });
  }
  // 2. Les lieux se partagent les colonnes quand leurs périodes ne se recouvrent pas dans le temps
  return { blocs, nColonnes: placerBlocs(blocs) };
}

// Frise sans aucune ligne : nouvelle frise, ou filtre qui ne laisse rien
function htmlVide() {
  const d = etat.donnees;
  if (filtreActif() && (d.dates.length || d.periodes.length))
    return `<div class="frise-vide"><h2>${t("Rien à afficher")}</h2><p>${t("Aucun évènement de ces groupes. « Tout afficher », dans le panneau de gauche, retire le filtre.")}</p></div>`;
  return `<div class="frise-vide"><h2>${t("Une frise toute neuve")}</h2>
    <p>${t("Pour commencer, créez vos groupes (lieux ou thèmes) puis vos premiers évènements dans l'onglet <a href=\"#donnees\">Données</a>. Le <a href=\"#aide\">Guide</a> explique pas à pas comment faire.")}</p></div>`;
}

// Range les lieux (blocs de sous-colonnes) côte à côte en réutilisant une colonne quand leurs périodes
// ne se recouvrent pas dans le temps : l'Égypte antique finit en - 30, le Monde arabo-musulman commence en 622,
// ils peuvent partager la même colonne. Chaque bloc va au premier emplacement libre en partant de la gauche ;
// on essaie plusieurs ordres de placement et on garde le rangement le plus étroit (l'ordre des groupes départage).
function placerBlocs(blocs) {
  const debut = (b) => Math.min(...b.cols.map((c) => c.y0));
  const duree = (b) => Math.max(...b.cols.map((c) => c.y1)) - debut(b);
  const ordres = [
    (a, b) => a.rang - b.rang,                                  // ordre des groupes
    (a, b) => debut(a) - debut(b) || a.rang - b.rang,           // chronologique
    (a, b) => duree(b) - duree(a) || a.rang - b.rang,           // les plus longs d'abord
    (a, b) => b.cols.length - a.cols.length || a.rang - b.rang, // les plus larges d'abord
  ];
  // la colonne x est libre pour ce bloc si aucune plage déjà posée ne touche les siennes (à ECART_LIEUX près)
  const libre = (occupe, x, bloc) => bloc.cols.every((c, k) =>
    !(occupe[x + k] || []).some((o) => o.y0 < c.y1 + ECART_LIEUX && c.y0 < o.y1 + ECART_LIEUX));
  let meilleur = null;
  for (const ordre of ordres) {
    const occupe = [], xs = new Map();
    let largeur = 0;
    for (const bloc of [...blocs].sort(ordre)) {
      let x = 0;
      while (!libre(occupe, x, bloc)) x++;
      bloc.cols.forEach((c, k) => (occupe[x + k] ??= []).push(c));
      xs.set(bloc, x);
      largeur = Math.max(largeur, x + bloc.cols.length);
    }
    if (!meilleur || largeur < meilleur.largeur) meilleur = { largeur, xs };
  }
  for (const bloc of blocs) bloc.x = meilleur.xs.get(bloc);
  return meilleur ? meilleur.largeur : 0;
}

function dateHtml(texte, approx = false) {
  if (texte == null) return "";
  texte = texteDate(texte);
  const u = String(texte).match(/^(.*\d)\s?(Ga|Ma|ka|k)$/);
  const tilde = approx ? `<span class="approx" title="${t("Date approximative")}">~</span>` : "";
  return tilde + (u ? `${echapper(u[1])}<small>${u[2]}</small>` : echapper(texte));
}

function htmlLigne(l) {
  if (l.type === "sep")
    return `<div class="ligne sep${l.mil ? " mil" : ""}" style="height:${H.sep}px"><div class="l-date">${formatAnnee(l.annee)}</div><div class="l-trait"></div></div>`;
  if (l.type === "section") return htmlSection(l, H.section);
  // devant chaque nom, la précision que la ligne ne montre pas, selon le réglage « détail » :
  // ligne d'un mois → le jour (« 14 ») ; ligne d'une année → le mois (« juil. ») ou le jour et le mois (« 14 juil. »)
  const det = detail();
  const jour = (it) => {
    if (!l.devant || det === "aucun" || !it.date.mois) return "";
    const texte = l.devant === "mois" ? (det === "jour" ? it.date.jour ?? "" : "")
      : formatDate({ annee: it.date.annee, mois: it.date.mois, jour: det === "jour" ? it.date.jour : null }, true, true);
    return texte ? `<span class="jour">${texte}</span>` : "";
  };
  const puce = (it) => (it.epoque ? pucesEpoque(it.id, jour(it)) : puceEvenement({ id: it.id, ev: it.ev }, jour(it)));
  // plusieurs rangées quand la date a plus d'évènements qu'il n'en tient sur une ligne
  const rangees = [];
  for (let k = 0; k < l.tous.length; k += parRangee) rangees.push(l.tous.slice(k, k + parRangee).map(puce).join(""));
  const evs = rangees.length > 1 ? `<div class="l-evs rangees">${rangees.map((r) => `<div class="l-rangee">${r}</div>`).join("")}</div>`
    : `<div class="l-evs">${rangees.join("")}</div>`;
  // « ~ » devant la date si tout ce qui est affiché sur la ligne est approximatif
  const approx = l.evs.every(({ ev }) => ev.approx) && l.epoques.every((pid) => index.periodes.get(pid).debut_approx);
  return `<div class="ligne date${rangees.length > 1 ? " multi" : ""}" style="height:${H.date * rangees.length}px"><div class="l-date">${dateHtml(libelleLigne(l), approx)}</div>${evs}</div>`;
}

function htmlSection(l, hauteur) {
  const p = l.p;
  const fin = p.fin ? t("jusqu'à {fin}", { fin: echapper(dateAffichee(p.fin, p.fin_approx)) }) : "";
  const niveau = index.groupes.filter((g) => g.type === "echelle").findIndex((g) => g.nom === p.groupes[0]);
  return `<div class="ligne section niv-${niveau < 0 ? 3 : niveau}${p.comment ? " note" : ""}" data-pop="${l.id}" data-section="${l.id}" style="--ct:${couleurDe(p.groupes)};height:${hauteur}px">
    <div class="l-date${p.debut_deduit ? " deduit" : ""}">${dateHtml(p.debut_mois ? formatDate({ annee: p.debut_annee, mois: p.debut_mois, jour: p.debut_jour }, true) : p.debut, p.debut_approx)}</div>
    <div class="s-corps"><span class="s-nom">${etoile(p)}${echapper(p.label)}</span>${p.sous_titre ? `<span class="s-sous">${echapper(p.sous_titre)}</span>` : ""}<span class="s-fin">${fin}</span></div></div>`;
}

function puceEvenement({ id, ev }, jour = "") {
  const c = ["ev"];
  if (ev.limite) c.push("limite");
  if (ev.regne) c.push("regne");
  if (ev.comment) c.push("note");
  return `<span class="${c.join(" ")}${styleGroupes(ev.groupes)}" data-pop="${id}">${jour}${etoile(ev)}${echapper(ev.label)}${coinSources(ev)}</span>`;
}

function pucesEpoque(pid, jour = "") {
  const p = index.periodes.get(pid);
  const c = ["ev", "limite", "epoque"];
  if (p.regne) c.push("regne");
  if (p.comment) c.push("note");
  return `<span class="${c.join(" ")}${styleGroupes(p.groupes)}" data-pop="${pid}" data-epoque="${pid}">${jour}${etoile(p)}${echapper(p.label)}${coinSources(p)}</span>`;
}

// coin replié en bas à droite : il y a des sources (en haut à droite : une description)
const coinSources = (o) => (o.sources?.length ? `<span class="coin-sources" aria-label="sources"></span>` : "");
const etoile = (o) => (o.important ? `<span class="etoile" aria-label="important">★</span>` : "");

// Texte dans la couleur du premier groupe ; plusieurs groupes : fond en bandes diagonales
function styleGroupes(groupes) {
  const fond = rayures(groupes);
  return `${fond ? " multi" : ""}" style="--ct:${couleurDe(groupes)}${fond ? `;--rayures:${fond};--rayures-survol:${rayures(groupes, 24)}` : ""}`;
}

// ─── Rubans : dates aux extrémités, nom vertical centré (collant sur les rubans plus hauts que l'écran) ───

// Date de début en haut, nom au milieu, date de fin en bas (fin inconnue : rien)
function contenuRuban(p) {
  const date = (t, approx, cl) => (t ? `<span class="ruban-date ${cl}">${echapper(dateAffichee(t, approx))}</span>` : "");
  return `${date(p.debut, p.debut_approx, "debut")}<span class="ruban-nom">${echapper(p.label)}</span>${date(p.fin, p.fin_approx, "fin")}`;
}

// Le placement du nom pendant le défilement est confié au navigateur (position: sticky, voir le CSS) :
// aucun calcul au défilement, donc pas de tremblement. Ici, on ne fait que préparer chaque ruban :
// marges pour les dates, longueur maximale du nom, et « collant » si le ruban dépasse la hauteur de l'écran.
function mesurerRubans() {
  const ecran = defil.clientHeight;
  // toutes les mesures d'abord, puis toutes les modifications : une seule mise en page (et non une par ruban)
  const rubans = [...racine.querySelectorAll(".ruban")].map((el) => ({
    el, nom: el.querySelector(".ruban-nom"), hauteur: parseFloat(el.style.height),
    debut: el.querySelector(".ruban-date.debut"), fin: el.querySelector(".ruban-date.fin"),
  }));
  for (const r of rubans) if (r.debut && r.fin) r.debut.hidden = r.fin.hidden = false;
  for (const r of rubans) {
    r.nom.dataset.longueur ??= r.nom.offsetHeight;    // longueur naturelle, mesurée une fois
    if (r.debut && r.fin) { r.lD = r.debut.offsetHeight + 6; r.lF = r.fin.offsetHeight + 6; }
  }
  for (const { el, nom, hauteur, debut, fin, lD, lF } of rubans) {
    // Les deux dates ou aucune, et seulement si le nom entier tient encore entre elles (priorité au nom).
    const besoinNom = Number(nom.dataset.longueur);
    let lDebut = 0, lFin = 0;
    if (debut && fin && hauteur - lD - lF - 4 >= besoinNom) { lDebut = lD; lFin = lF; }
    if (debut) debut.hidden = !lDebut;
    if (fin) fin.hidden = !lFin;
    el.style.paddingTop = `${lDebut}px`;
    el.style.paddingBottom = `${lFin}px`;
    const place = hauteur - lDebut - lFin - 4;
    nom.hidden = place < NOM_TRES_PETIT;                // seulement si le ruban est vraiment minuscule
    nom.style.maxHeight = `${place}px`;                 // tronqué avec « … » si la place manque
    el.style.setProperty("--demi", `${Math.min(Number(nom.dataset.longueur), place) / 2}px`);
    el.classList.toggle("collant", hauteur > ecran);
  }
}

// ─── Défilement : rappel des lignes spéciales, mini-carte, ancre ───

function ligneA(yPos) {
  let lo = 0, hi = m.lignes.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (m.y[mid] <= yPos) lo = mid; else hi = mid - 1; }
  return lo;
}

function surDefilement() {
  if (!m || !m.lignes.length || !visible()) return;
  dessinerRappel();
  const k = carte.clientHeight / Math.max(m.total, 1);
  carteVue.style.transform = `translateY(${defil.scrollTop * k}px)`;
  carteVue.style.height = `${Math.max(14, defil.clientHeight * k)}px`;
  memoriserAncre();
}

// ─── Rappel des lignes spéciales en haut de la frise ───
// Les lignes spéciales dépassées restent en haut, empilées par niveau (l'ordre des échelles), avec exactement l'aspect
// des lignes de la frise. Tout suit le défilement au pixel près, sans saut :
// - une ligne spéciale monte avec la frise jusqu'au bas de la pile, puis s'y arrête (à la place de son niveau) ;
// - sa fin, ou la suivante du même niveau qui arrive, la pousse vers le haut : elle glisse derrière les niveaux plus larges ;
// - une ligne d'un niveau plus large qui arrive alors qu'un niveau plus fin continue glisse par-dessus lui jusqu'à sa place
//   (« fantôme » : copie de la ligne, à sa position dans la frise, au-dessus des niveaux plus fins).
// Réglage « brièvement » : même mécanique, mais chaque ligne s'en va 10 lignes après son passage (CONTEXTE_DISTANCE).
let rappel = null;       // { niveaux: [[{ l, haut, fin }]], elements: Map }

function preparerRappel() {
  const rang = new Map(index.groupes.filter((g) => g.type === "echelle").map((g, k) => [g.nom, k]));
  const secs = m.lignes.filter((l) => l.type === "section");
  const bref = !rappelContinu();
  const niveaux = [];
  for (const l of secs) {
    const groupeL = l.p.groupes[0] ?? "";
    // fin (en px dans la frise) : sa date de fin, le début de la suivante du même groupe, ou 10 lignes plus bas
    let finPx = l.fin === Infinity ? m.total : yPremiere(l.fin, l.i);
    const suivante = secs.find((x) => x.i > l.i && (x.p.groupes[0] ?? "") === groupeL);
    if (suivante) finPx = Math.min(finPx, m.y[suivante.i]);
    if (bref) finPx = Math.min(finPx, m.y[Math.min(l.i + 1 + CONTEXTE_DISTANCE, m.lignes.length)]);
    (niveaux[rang.get(groupeL) ?? rang.size] ??= []).push({ l, haut: m.y[l.i], fin: Math.max(finPx, m.y[l.i] + H.section) });
  }
  contexteEl.innerHTML = "";
  rappel = { niveaux: niveaux.filter(Boolean), elements: new Map() };
}

// Positions des lignes rappelées. « fantomes » : niveaux dont la ligne suivante, en train d'arriver, passe par-dessus
// les niveaux plus fins (elle est alors dessinée dans le rappel, et la place de son niveau leur reste réservée).
function calculerRappel(S, fantomes) {
  const h = H.section, vus = [], arrivees = [];
  let bas = 0;                                     // bas de la pile, du niveau le plus large au plus fin
  rappel.niveaux.forEach((liste, niv) => {
    const dock = bas;                              // place de ce niveau
    let k = -1;
    while (k + 1 < liste.length && liste[k + 1].haut - S <= dock) k++;
    const A = liste[k], N = liste[k + 1];
    if (A) {
      const t = Math.min(dock, A.fin - S - h);    // poussée vers le haut par sa fin ou par la suivante
      if (t + h > dock) { vus.push({ l: A.l, t, niv }); bas = t + h; }
    }
    if (N && N.haut - S > dock) {
      arrivees.push({ l: N.l, t: N.haut - S, niv });
      if (fantomes.has(niv)) { vus.push({ l: N.l, t: N.haut - S, niv, fantome: true }); bas = Math.max(bas, dock + h); }
    }
  });
  return { vus, arrivees };
}

function dessinerRappel() {
  if (!rappel) return;
  const S = defil.scrollTop, h = H.section, n = rappel.niveaux.length;
  // 1er calcul sans fantôme ; une ligne qui arrive devient fantôme si une ligne d'un niveau plus fin la recouvre
  const premier = calculerRappel(S, new Set());
  const fantomes = new Set(premier.arrivees.filter((a) => premier.vus.some((v) => v.niv > a.niv && v.t < a.t + h && v.t + h > a.t))
    .map((a) => a.niv));
  const { vus } = fantomes.size ? calculerRappel(S, fantomes) : premier;
  // les éléments sont gardés d'une image à l'autre : seule leur position change
  const gardes = new Set();
  let dernier = null;
  for (const v of vus) {
    const cle = v.l.id + (v.fantome ? ":f" : "");
    let el = rappel.elements.get(cle);
    if (!el) {
      el = document.createElement("div");
      el.className = "rappel";
      el.innerHTML = htmlSection(v.l, h);
      contexteEl.append(el);
      rappel.elements.set(cle, el);
    }
    el.style.transform = `translateY(${v.t}px)`;
    el.style.zIndex = 2 * (n - v.niv) + (v.fantome ? 1 : 0);   // les niveaux larges passent devant les plus fins
    gardes.add(cle);
    if (!dernier || v.t + h > dernier.t + h) dernier = { ...v, el };
  }
  for (const [cle, el] of rappel.elements) if (!gardes.has(cle)) { el.remove(); rappel.elements.delete(cle); }
  for (const el of rappel.elements.values()) el.classList.toggle("dernier", el === dernier?.el);   // ombre sous la pile
}

function anneeEnHaut() {
  if (!m) return null;
  for (let i = ligneA(defil.scrollTop + 1); i < m.lignes.length; i++) if (m.lignes[i].type === "date" && m.lignes[i].annee != null) return m.lignes[i].annee;
  return null;
}

let minuterieAncre;
function memoriserAncre() {
  clearTimeout(minuterieAncre);
  minuterieAncre = setTimeout(() => { const a = anneeEnHaut(); if (a != null) ecrireFrise("frise.ancre", a); }, 300);
}
function lireAncre() { const v = lireFrise("frise.ancre"); return v == null ? null : Number(v); }

function allerY(y, comportement = MOUVEMENT) { defil.scrollTo({ top: Math.max(0, y), behavior: comportement }); }
export function allerAnnee(annee, comportement) { if (m) allerY(yPremiere(instant(annee)), comportement); }

// Place l'élément id au tiers de la hauteur et le fait clignoter ; false s'il n'est pas affiché (filtre)
export function montrer(id) {
  const el = m && lignesEl.querySelector(`[data-pop="${id}"]`);
  if (!el) return false;
  const i = Array.prototype.indexOf.call(lignesEl.children, el.closest(".ligne"));
  allerY(m.y[i] - defil.clientHeight / 3, "auto");
  lignesEl.querySelectorAll(".montre").forEach((x) => x.classList.remove("montre"));
  el.classList.add("montre");
  setTimeout(() => el.classList.remove("montre"), 2600);
  return true;
}

// ─── Mini-carte ───

function initCarte() {
  let appuye = false;
  const aller = (e) => {
    const r = carte.getBoundingClientRect();
    const yPos = ((e.clientY - r.top) / r.height) * m.total - defil.clientHeight / 2;
    defil.scrollTop = Math.max(0, yPos);
  };
  carte.addEventListener("pointerdown", (e) => { appuye = true; carte.setPointerCapture(e.pointerId); aller(e); });
  carte.addEventListener("pointermove", (e) => {
    if (!m || !m.lignes.length) return;
    if (appuye) aller(e);
    const r = carte.getBoundingClientRect();
    const l = m.lignes[ligneA(((e.clientY - r.top) / r.height) * m.total)];
    carteEtiquette.textContent = l.type === "date" ? texteDate(libelleLigne(l)) : l.type === "sep" ? formatAnnee(l.annee) : l.p.label;
    carteEtiquette.style.top = `${e.clientY - r.top - 11}px`;
  });
  carte.addEventListener("pointerup", () => (appuye = false));
}

function preparerCanvas(c) {
  const dpr = devicePixelRatio || 1, w = carte.clientWidth, h = carte.clientHeight;
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function dessinerCarte() {
  if (!m || !carte.clientHeight) return;
  const { ctx, w, h } = preparerCanvas(carteCanvas);
  const k = h / Math.max(m.total, 1), g = 5, largeur = w - 2 * g;
  for (const l of m.lignes) {
    const y0 = m.y[l.i] * k, hh = Math.max(1, (m.y[l.i + 1] - m.y[l.i]) * k * 0.9);
    if (l.type === "section") {
      ctx.globalAlpha = 0.9; ctx.fillStyle = couleurDe(l.p.groupes);
      ctx.fillRect(1, y0, w - 2, Math.max(1, hh * 0.5));
    } else if (l.type === "date") {
      const couleurs = l.epoques.map((pid) => couleurDe(index.periodes.get(pid).groupes)).concat(l.evs.map((e) => couleurDe(e.ev.groupes)));
      const pas = largeur / couleurs.length;
      ctx.globalAlpha = 0.75;
      couleurs.forEach((c, j) => { ctx.fillStyle = c; ctx.fillRect(g + j * pas, y0, Math.max(1, pas - 0.5), hh); });
    }
  }
  ctx.globalAlpha = 1;
}

function dessinerMarques() {
  if (!m || !carte.clientHeight) return;
  const { ctx, w, h } = preparerCanvas(carteMarques);
  const k = h / Math.max(m.total, 1);
  ctx.fillStyle = themeClair() ? "#25201a" : "#f4ecd8";
  for (const el of resultats) {
    ctx.fillRect(0, (el._y ?? 0) * k - 1, w, 2);
  }
}

// ─── Survol lié : puce d'époque ↔ barre de durée ───

function survolLie(e) {
  const el = e.target.closest("[data-epoque]");
  const id = el ? el.dataset.epoque : null;
  if (id === lie) return;
  if (lie) racine.querySelectorAll(`[data-epoque="${lie}"]`).forEach((x) => x.classList.remove("lie"));
  lie = id;
  if (lie) racine.querySelectorAll(`[data-epoque="${lie}"]`).forEach((x) => x.classList.add("lie"));
}

// ─── Menu « Aller à » ───

function construireMenu() {
  const annees = m.dates.filter((l) => l.annee != null).map((l) => l.annee);
  const min = Math.min(...annees), max = Math.max(...annees);
  const reperes = REPERES.filter(([a]) => a > min && a <= max);
  const sections = m.lignes.filter((l) => l.type === "section");
  menuEl.innerHTML = `
    <div><h4>${t("Repères")}</h4>
      <button data-y="0">${t("Début de la frise")}</button>
      ${reperes.map(([a, libelle]) => `<button data-annee="${a}">${libelle ? t(libelle) : formatAnnee(a)}</button>`).join("")}
      <button data-y="fin">${t("Aujourd'hui")}</button></div>
    <div><h4>${t("Lignes spéciales")}</h4>
      ${sections.map((s) => `<button data-y="${m.y[s.i]}" style="--ct:${couleurDe(s.p.groupes)}"><i></i>${echapper(s.p.label)}<span>${echapper(texteDate(s.p.debut ?? ""))}</span></button>`).join("")}</div>`;
}

function basculerMenu() { menuEl.classList.toggle("ouvert"); }

function clicMenu(e) {
  const b = e.target.closest("button");
  if (!b) return;
  menuEl.classList.remove("ouvert");
  if (b.dataset.annee) allerAnnee(Number(b.dataset.annee));
  else allerY(b.dataset.y === "fin" ? m.total : Number(b.dataset.y));
}

// ─── Recherche ───

function texteRecherche(id) {
  if (id.startsWith("e")) { const { ev } = index.evenements.get(id); return normaliser(`${ev.label} ${ev.comment ?? ""}`); }
  const p = index.periodes.get(id);
  return normaliser(`${p.label} ${p.sous_titre ?? ""} ${p.comment ?? ""}`);
}

export function rechercher(q, defiler = true) {
  if (!lignesEl) return;
  const nq = normaliser((q || "").trim());
  racine.classList.toggle("en-recherche", !!nq);
  lignesEl.querySelectorAll(".trouve").forEach((el) => el.classList.remove("trouve", "courant"));
  resultats = [];
  if (nq) {
    lignesEl.querySelectorAll(".ev[data-pop], .ligne.section[data-pop]").forEach((el) => {
      if (texteRecherche(el.dataset.pop).includes(nq)) { el.classList.add("trouve"); resultats.push(el); }
    });
    const lignes = lignesEl.children;
    for (const el of resultats) {
      const ligne = el.closest(".ligne");
      el._y = m.y[Array.prototype.indexOf.call(lignes, ligne)];
    }
  }
  courant = -1;
  dessinerMarques();
  majCompteur(nq);
  if (defiler && resultats.length) suivant(1);
}

export function suivant(sens) {
  const q = etat.recherche.trim();
  if (!resultats.length) {
    const d = parserDate(q);                        // une année, ou une date précise (« juillet 1789 »)
    if (d && m) allerY(yPremiere(instant(d.annee, d.mois, d.jour)));
    return;
  }
  resultats[courant]?.classList.remove("courant");
  courant = (courant + sens + resultats.length) % resultats.length;
  const el = resultats[courant];
  el.classList.add("courant");
  allerY(el._y - defil.clientHeight / 3);
  majCompteur(q);
}

function majCompteur(q) {
  if (!q) return app.compteur("");
  if (!resultats.length) return app.compteur(t(parserDate(etat.recherche) ? "Entrée pour y aller" : "aucun résultat"));
  app.compteur(courant < 0 ? `${resultats.length}` : t("{i} sur {n}", { i: courant + 1, n: resultats.length }));
}
