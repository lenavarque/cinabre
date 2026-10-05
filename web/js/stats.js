// Onglet Statistiques : nombre d'évènements par tranche d'années, en barres empilées par groupe.

import { etat, index, formatAnnee, passeFiltre, filtreActif, nomAffiche, SANS_GROUPE, LECTURE_SEULE, plagesStats, tranchesStats,
  parentDe, sousLieux, empilerParSousLieu } from "./donnees.js";
import { gabarit, fermer as fermerPopup } from "./popup.js";
import { t, tn } from "./langue.js";

// ─── Tranches (bornes incluses) : les plages du réglage « Statistiques » (Données, Réglages), réglées d'après la frise par défaut ───
let TRANCHES = [];
const MARGE = { haut: 24, droite: 24, bas: 78, gauche: 46 };

let app, racine, zone, entete, modele = null, aRefaire = false;
const visible = () => racine && racine.classList.contains("active") && zone.clientWidth > 0;

export function init(el, application) {
  app = application;
  racine = el;
  racine.innerHTML = `
    <div class="stats-outils">
      <h2 class="stats-titre">${t("Évènements par tranche d'années")}</h2>
      <div class="stats-note"></div>
      ${LECTURE_SEULE ? "" : `<a class="stats-reglages" href="#donnees" title="${t("Données, Réglages : plages d'années et durée des tranches")}">${t("Changer les tranches")}</a>`}
    </div>
    <div class="stats-zone"></div>`;
  entete = racine.querySelector(".stats-note");
  zone = racine.querySelector(".stats-zone");
  racine.querySelector(".stats-reglages")?.addEventListener("click", (e) => { e.preventDefault(); app.ouvrirReglages(); });
  zone.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tranche]");
    if (b) app.ouvrirFrise(TRANCHES[Number(b.dataset.tranche)].debut);
  });
  new ResizeObserver(() => { if (modele && visible()) dessiner(); }).observe(zone);
}

export function afficher() { if (!modele || aRefaire) { aRefaire = false; rendre(); } else dessiner(); }
export function majDonnees() { if (!racine) return; if (visible()) rendre(); else aRefaire = true; }
export function majFiltre() { majDonnees(); }

function rendre() { modele = compter(); dessiner(); }

// ─── Comptage ───
// Un évènement compte une fois, dans son premier groupe visible ; une époque compte à son année de début.
function compter() {
  const d = etat.donnees;
  TRANCHES = tranchesStats(plagesStats().plages);
  const comptes = TRANCHES.map(() => new Map());
  let avant = 0, apres = 0, entre = 0;
  // un sous-lieu compte dans son lieu de premier niveau, sauf réglage contraire (Données, Réglages)
  const parSousLieu = empilerParSousLieu();
  const niveau = (x) => (parSousLieu ? x : parentDe(x) ?? x);
  const ajouter = (annee, groupes, themes) => {
    if (!passeFiltre(groupes, themes)) return;
    const gs = groupes && groupes.length ? groupes : [SANS_GROUPE];
    const visible = (x) => etat.filtre.has(x) || etat.filtre.has(parentDe(x));
    const g = niveau(etat.filtre.size ? gs.find(visible) : gs[0]);
    if (!g || annee == null) return;
    if (!TRANCHES.length) return;
    if (annee < TRANCHES[0].debut) return avant++;
    if (annee > TRANCHES[TRANCHES.length - 1].fin) return apres++;
    const k = TRANCHES.findIndex((t) => annee >= t.debut && annee <= t.fin);
    if (k < 0) return entre++;                    // entre deux plages
    comptes[k].set(g, (comptes[k].get(g) || 0) + 1);
  };
  d.dates.forEach((date) => date.evenements.forEach((ev) => ajouter(date.annee, ev.groupes, ev.themes)));
  d.periodes.forEach((p) => { if (p.type === "epoque") ajouter(p.debut_annee, p.groupes, p.themes); });

  // ordre d'empilement : lieux en bas, puis les autres, « Sans groupe » en haut
  const rang = (g) => (g.type === "lieu" ? 0 : g.nom === SANS_GROUPE ? 2 : 1);
  const ordre = [...index.groupes].sort((a, b) => rang(a) - rang(b));
  const barres = comptes.map((c, i) => {
    let cumul = 0;
    const segments = ordre.filter((g) => c.get(g.nom)).map((g) => {
      const n = c.get(g.nom);
      const s = { g, n, de: cumul };
      cumul += n;
      return s;
    });
    return { i, t: TRANCHES[i], segments, total: cumul };
  });
  return { barres, avant, apres, entre, total: barres.reduce((s, b) => s + b.total, 0) };
}

// ─── Dessin (SVG) ───

function graduation(max) {
  const brut = max / 5;
  const p = 10 ** Math.floor(Math.log10(brut || 1));
  const pasY = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= brut) || p;
  return { pas: pasY, haut: Math.max(pasY, Math.ceil(max / pasY) * pasY) };
}

function dessiner() {
  if (!modele || !visible()) return;
  fermerPopup();
  const { barres, avant, apres, entre, total } = modele;
  const notes = [`${tn(total, "{n} évènement", "{n} évènements")}${filtreActif() ? " " + t("(filtrés)") : ""}`];
  if (avant) notes.push(tn(avant, "{n} antérieur à {annee}, non compté", "{n} antérieurs à {annee}, non comptés", { annee: formatAnnee(TRANCHES[0].debut) }));
  if (apres) notes.push(tn(apres, "{n} postérieur à {annee}, non compté", "{n} postérieurs à {annee}, non comptés", { annee: formatAnnee(TRANCHES[TRANCHES.length - 1].fin) }));
  if (entre) notes.push(tn(entre, "{n} entre deux plages, non compté", "{n} entre deux plages, non comptés"));
  entete.textContent = notes.join(" · ");
  if (!total) {
    zone.innerHTML = `<p class="stats-vide">${t(filtreActif() ? "Aucun évènement dans ces tranches avec ce filtre."
      : "Aucun évènement dans ces tranches pour l'instant : le graphique se remplira au fil des ajouts.")}</p>`;
    return;
  }

  const L = zone.clientWidth, H = Math.max(260, zone.clientHeight);
  const lp = L - MARGE.gauche - MARGE.droite, hp = H - MARGE.haut - MARGE.bas;
  const bande = lp / barres.length, largeur = Math.max(4, Math.min(34, bande * 0.72));
  const { pas: pasY, haut } = graduation(Math.max(...barres.map((b) => b.total)));
  const y = (v) => MARGE.haut + hp - (v / haut) * hp;
  const bas = y(0);
  const saut = Math.max(1, Math.ceil(26 / bande));

  let svg = "";
  // grille et axe des nombres
  for (let v = 0; v <= haut; v += pasY)
    svg += `<line class="grille${v ? "" : " zero"}" x1="${MARGE.gauche}" x2="${L - MARGE.droite}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="axe" x="${MARGE.gauche - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;

  // barres empilées : un segment par groupe, séparés par un filet de fond
  for (const b of barres) {
    const x = MARGE.gauche + b.i * bande + (bande - largeur) / 2, cx = x + largeur / 2;
    svg += `<g class="barre-stats" data-tranche="${b.i}">
      <rect class="cible" x="${MARGE.gauche + b.i * bande}" y="${MARGE.haut}" width="${bande}" height="${hp}"/>`;
    for (const s of b.segments) {
      const y1 = y(s.de + s.n), y0 = y(s.de);
      const k = index.groupes.indexOf(s.g);
      svg += `<rect class="segment" data-pop="s${b.i}-${k}" x="${x}" y="${y1}" width="${largeur}" height="${Math.max(1, y0 - y1 - 1.5)}" style="fill:${s.g.affichage}"/>`;
    }
    svg += `</g>`;
    // étiquettes de l'axe : une sur « saut » quand les barres sont étroites (et toujours au début d'une plage)
    if (b.i % saut === 0 || (b.i && barres[b.i - 1].t.plage !== b.t.plage))
      svg += `<text class="axe" x="${cx}" y="${bas + 14}" text-anchor="end" transform="rotate(-45 ${cx} ${bas + 14})">${formatAnnee(b.t.debut)}</text>`;
  }

  // sous l'axe, une accolade par plage rappelle la durée de ses tranches (les hauteurs ne se comparent qu'à durée égale)
  const yb = H - 12;
  for (const k of new Set(barres.map((b) => b.t.plage))) {
    const is = barres.filter((b) => b.t.plage === k).map((b) => b.i), n = barres[is[0]].t.pas;
    const x0 = MARGE.gauche + is[0] * bande + 3, x1 = MARGE.gauche + (is[is.length - 1] + 1) * bande - 3;
    svg += `<path class="accolade" d="M${x0} ${yb - 12} v4 H${x1} v-4"/>
      <text class="duree" x="${(x0 + x1) / 2}" y="${yb + 4}" text-anchor="middle">${n === 1 ? t("par année") : t("tranches de {n} ans", { n })}</text>`;
  }

  zone.innerHTML = `<svg width="${L}" height="${H}" viewBox="0 0 ${L} ${H}" role="img"
    aria-label="${t("Nombre d'évènements par tranche d'années, empilés par groupe")}">${svg}</svg>`;
}

// ─── Popup d'un segment (appelée par app.js pour les identifiants « s… ») ───

export function contenuPopup(id) {
  const [i, k] = id.slice(1).split("-").map(Number);
  const b = modele?.barres[i], g = index.groupes[k];
  const s = b?.segments.find((x) => x.g === g);
  if (!s) return null;
  const tranche = t("{debut} à {fin}", { debut: formatAnnee(b.t.debut), fin: formatAnnee(b.t.fin) });
  return {
    couleur: g.affichage,
    ancrage: "souris",
    html: gabarit({
      groupe: nomAffiche(g.nom) + (!empilerParSousLieu() && sousLieux(g.nom).length ? " " + t("et ses sous-lieux") : ""), date: tranche,
      titre: tn(s.n, "{n} évènement", "{n} évènements"),
      pied: t("{n} dans la tranche, tous groupes affichés confondus. Clic : voir dans la frise.", { n: b.total }),
    }),
  };
}

