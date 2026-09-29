// Onglet Guide : mode d'emploi de l'application (contenu statique).
// La recherche du haut filtre les sections.

import { normaliser, LECTURE_SEULE, jeuActif } from "./donnees.js";
import { t, tn, anglais } from "./langue.js";
import * as FR from "./guide-fr.js";
import * as EN from "./guide-en.js";

let app, racine, article, avecJeu = null;

// Page exportée en lecture seule : sa présentation (LECTURE), puis tout le guide (c'est l'application complète)

export function init(el, application) {
  app = application;
  racine = el;
  construire();
}

// Le jeu n'est décrit que si son onglet est affiché (section « jeu » et éléments .si-jeu)
export function majDonnees() { if (racine && avecJeu !== jeuActif()) construire(); }

function construire() {
  avecJeu = jeuActif();
  const { GUIDE, LECTURE } = anglais ? EN : FR;
  const toutes = GUIDE.filter(([id]) => avecJeu || id !== "jeu");
  const SECTIONS = LECTURE_SEULE ? [...LECTURE, ...toutes] : toutes;
  racine.innerHTML = `
    <div class="aide">
      <nav class="aide-sommaire">${SECTIONS.map(([id, titre]) => `<a href="#aide" data-cible="${id}">${titre}</a>`).join("")}</nav>
      <article class="aide-article">
        <h1>${t("Guide")}</h1>
        ${SECTIONS.map(([id, titre, html]) => `<section id="aide-${id}"><h2>${titre}</h2>${html}</section>`).join("")}
        <p class="aide-vide" hidden>${t("Rien dans le guide pour cette recherche.")}</p>
      </article>
    </div>`;
  article = racine.querySelector(".aide-article");
  if (!avecJeu) racine.querySelectorAll(".si-jeu").forEach((el) => el.remove());
  racine.querySelector(".aide-sommaire").addEventListener("click", (e) => {
    const a = e.target.closest("[data-cible]");
    if (!a) return;
    e.preventDefault();
    racine.querySelector(`#aide-${a.dataset.cible}`).scrollIntoView({ block: "start" });
  });
  let raf = 0;
  article.addEventListener("scroll", () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; marquerSection(); });
  }, { passive: true });
}

export function afficher() { marquerSection(); }

// Met en surbrillance, dans le sommaire, la section en cours de lecture :
// la dernière dont le titre est passé sous le premier tiers de la zone (ou la dernière si on est tout en bas)
function marquerSection() {
  const visibles = [...article.querySelectorAll("section")].filter((s) => !s.hidden);
  if (!visibles.length) return;
  const haut = article.getBoundingClientRect().top + article.clientHeight / 3;
  const enBas = article.scrollTop + article.clientHeight >= article.scrollHeight - 4;
  let courante = visibles[0];
  for (const s of visibles) if (s.getBoundingClientRect().top <= haut) courante = s;
  if (enBas) courante = visibles[visibles.length - 1];
  racine.querySelectorAll(".aide-sommaire a").forEach((a) => a.classList.toggle("actif", `aide-${a.dataset.cible}` === courante.id));
}

// La recherche du haut masque les sections qui ne contiennent pas le texte
export function rechercher(q) {
  if (!article) return;
  const nq = normaliser((q || "").trim());
  let n = 0;
  article.querySelectorAll("section").forEach((s) => {
    const garde = !nq || normaliser(s.textContent).includes(nq);
    s.hidden = !garde;
    if (garde) n++;
    racine.querySelector(`[data-cible="${s.id.slice(5)}"]`).classList.toggle("masque", !garde);
  });
  article.querySelector(".aide-vide").hidden = n > 0;
  marquerSection();
  app.compteur(nq ? tn(n, "{n} section", "{n} sections") : "");
}
