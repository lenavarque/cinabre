#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Serveur local de Cinabre, la frise chronologique.

    python serveur.py                    # ouvre http://127.0.0.1:8765 dans le navigateur
    python serveur.py --port 9000 --fichier autre.json --sans-navigateur

Aucune dépendance : bibliothèque standard uniquement.
- sert l'interface (dossier web/)
- GET  /api/donnees : renvoie le JSON
- PUT  /api/donnees : enregistre le JSON, après avoir sauvegardé la version précédente
  dans sauvegardes/ (au plus une copie toutes les 30 min, 40 copies conservées).
- GET  /api/frises : liste les frises du dossier (tout fichier .json avec des dates et des groupes)
- POST /api/frises/ouvrir {"fichier": "…json"} : ouvre une autre frise du dossier
- POST /api/frises/creer {"titre": "…", "langue": "fr" | "en"} : crée une frise vide (thèmes de départ dans cette langue) et l'ouvre
Si le fichier de données n'existe pas, une frise vide est créée : chacun peut commencer la sienne.
"""

import argparse
import hashlib
import json
import os
import re
import sys
import threading
import unicodedata
import time
import webbrowser
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RACINE = Path(__file__).resolve().parent
WEB = RACINE / "web"

INTERVALLE_SAUVEGARDES = 30 * 60   # secondes entre deux copies de sécurité
MAX_SAUVEGARDES = 40               # copies conservées (les plus anciennes sont supprimées)
# Une nouvelle frise démarre sans groupe ni évènement, mais avec des thèmes généraux (modifiables dans l'onglet Données)
THEMES_DEFAUT = {
    "Civilisations": "Naissance, apogée et déclin des civilisations et des grandes périodes culturelles.",
    "Pouvoir et politique": "Règnes, dynasties, empires et changements de régime : qui gouverne, et comment.",
    "Guerres et conflits": "Batailles, conquêtes, invasions, révoltes et guerres civiles.",
    "Droit et diplomatie": "Traités, alliances, lois, codes et constitutions.",
    "Religion et croyances": "Religions et cultes, leurs fondateurs, leurs institutions, leurs missions et leurs persécutions.",
    "Pensée et lettres": "Philosophes, historiens et écrivains, grandes œuvres écrites, invention de l'écriture.",
    "Arts et architecture": "Monuments, œuvres d'art et grands chantiers.",
    "Sciences et techniques": "Inventions, découvertes et savoir-faire.",
    "Explorations": "Voyages, expéditions et découvertes géographiques.",
    "Villes et fondations": "Fondations de villes et de colonies, capitales, vie des grandes cités.",
    "Économie et société": "Commerce, agriculture, esclavage, population et vie quotidienne.",
    "Catastrophes": "Épidémies, incendies, séismes et famines.",
    "Préhistoire et évolution": "L'histoire du vivant et de l'humanité avant l'écriture.",
    "Terre et Univers": "L'histoire du cosmos et de la planète : formation, climats, glaciations et grandes extinctions.",
}
# Les mêmes, pour une frise créée alors que l'interface est en anglais
THEMES_DEFAUT_EN = {
    "Civilisations": "Birth, height and decline of civilisations and of great cultural periods.",
    "Power and politics": "Reigns, dynasties, empires and changes of regime: who governs, and how.",
    "Wars and conflicts": "Battles, conquests, invasions, revolts and civil wars.",
    "Law and diplomacy": "Treaties, alliances, laws, codes and constitutions.",
    "Religion and beliefs": "Religions and cults, their founders, institutions, missions and persecutions.",
    "Thought and letters": "Philosophers, historians and writers, great written works, the invention of writing.",
    "Arts and architecture": "Monuments, works of art and great building projects.",
    "Science and technology": "Inventions, discoveries and know-how.",
    "Explorations": "Journeys, expeditions and geographical discoveries.",
    "Cities and foundations": "Foundations of cities and colonies, capitals, life of great cities.",
    "Economy and society": "Trade, agriculture, slavery, population and daily life.",
    "Disasters": "Epidemics, fires, earthquakes and famines.",
    "Prehistory and evolution": "The history of life and of humankind before writing.",
    "Earth and Universe": "The history of the cosmos and of the planet: formation, climates, ice ages and mass extinctions.",
}
FRISE_VIDE = {"version": 1, "titre": None, "groupes": {},
              "themes": {nom: {"description": texte} for nom, texte in THEMES_DEFAUT.items()},
              "periodes": [], "dates": []}


def creer_frise_vide(fichier: Path, titre=None, langue="fr"):
    fichier.parent.mkdir(parents=True, exist_ok=True)
    themes = THEMES_DEFAUT_EN if langue == "en" else THEMES_DEFAUT
    frise = {**FRISE_VIDE, "titre": titre or fichier.stem,
             "themes": {nom: {"description": texte} for nom, texte in themes.items()}}
    fichier.write_bytes(json.dumps(frise, ensure_ascii=False, indent=2).encode("utf-8"))


def version(contenu: bytes) -> str:
    return hashlib.sha1(contenu).hexdigest()[:16]


class Stockage:
    def __init__(self, fichier: Path):
        self.fichier = fichier
        self.dossier = fichier.parent / "sauvegardes"
        self.verrou = threading.Lock()
        self.derniere_copie = None  # la première écriture de chaque session fait toujours une copie

    def lire(self):
        with self.verrou:
            return self.fichier.read_bytes()

    def ecrire(self, donnees, version_attendue):
        texte = json.dumps(donnees, ensure_ascii=False, indent=2).encode("utf-8")
        with self.verrou:
            actuel = self.fichier.read_bytes() if self.fichier.exists() else b""
            if version_attendue and actuel and version_attendue != version(actuel):
                return None, None
            copie = self._copie_de_securite(actuel) if actuel else None
            temporaire = self.fichier.with_suffix(".tmp")
            temporaire.write_bytes(texte)
            os.replace(temporaire, self.fichier)   # écriture atomique
        return version(texte), copie

    def _copie_de_securite(self, contenu):
        maintenant = time.time()
        if self.derniere_copie and maintenant - self.derniere_copie < INTERVALLE_SAUVEGARDES:
            return None
        self.dossier.mkdir(exist_ok=True)
        cible = self.dossier / f"{self.fichier.stem}-{datetime.now():%Y-%m-%d_%Hh%M}.json"
        cible.write_bytes(contenu)
        self.derniere_copie = maintenant
        copies = sorted(self.dossier.glob(f"{self.fichier.stem}-*.json"))
        for ancienne in copies[:-MAX_SAUVEGARDES]:
            ancienne.unlink(missing_ok=True)
        return cible.name


class Frises:
    """Les frises d'un même dossier ; une seule est ouverte à la fois (self.courant)."""

    def __init__(self, fichier: Path):
        self.dossier = fichier.parent
        self.verrou = threading.Lock()
        self.courant = Stockage(fichier)

    def chemin(self, nom: str) -> Path:
        # un simple nom de fichier .json du dossier, jamais un chemin
        if not isinstance(nom, str) or not nom.endswith(".json") or nom.startswith(".") or re.search(r"[\\/:]", nom):
            raise ValueError("Nom de frise invalide.")
        return self.dossier / nom

    def lister(self):
        frises = []
        for f in sorted(self.dossier.glob("*.json")):
            try:
                d = json.loads(f.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            if not isinstance(d, dict) or "dates" not in d or "groupes" not in d:
                continue
            frises.append({"fichier": f.name, "titre": d.get("titre") or f.stem,
                           "evenements": sum(len(x.get("evenements", [])) for x in d["dates"]),
                           "periodes": len(d.get("periodes", []))})
        return {"actuelle": self.courant.fichier.name, "frises": frises}

    def ouvrir(self, nom: str):
        f = self.chemin(nom)
        if not f.exists():
            raise ValueError("Cette frise n'existe plus.")
        with self.verrou:
            self.courant = Stockage(f)

    def creer(self, titre: str, langue: str = "fr"):
        titre = (titre or "").strip()
        if not titre:
            raise ValueError("Indique un nom pour la nouvelle frise.")
        base = unicodedata.normalize("NFD", titre).encode("ascii", "ignore").decode().lower()
        base = re.sub(r"[^a-z0-9]+", "-", base).strip("-") or "frise"
        f, n = self.dossier / f"{base}.json", 2
        while f.exists():
            f, n = self.dossier / f"{base}-{n}.json", n + 1
        creer_frise_vide(f, titre, langue)
        self.ouvrir(f.name)
        return f.name


class Gestionnaire(SimpleHTTPRequestHandler):
    # Sous Windows, le registre associe parfois .js à text/plain, ce qui casse les modules.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".css": "text/css", ".html": "text/html",
                      ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2"}

    def __init__(self, *args, frises, **kwargs):
        self.frises = frises
        super().__init__(*args, directory=str(WEB), **kwargs)

    @property
    def stockage(self):
        return self.frises.courant

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        if args and str(args[1])[:1] in "45":   # n'affiche que les erreurs
            super().log_message(format, *args)

    def _json(self, code, objet, entetes=None):
        corps = json.dumps(objet, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        for cle, valeur in (entetes or {}).items():
            self.send_header(cle, valeur)
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/frises":
            return self._json(200, self.frises.lister())
        if self.path.split("?")[0] != "/api/donnees":
            return super().do_GET()
        try:
            contenu = self.stockage.lire()
        except FileNotFoundError:
            return self._json(404, {"erreur": f"Fichier introuvable : {self.stockage.fichier.name}"})
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(contenu)))
        self.send_header("X-Version", version(contenu))
        self.end_headers()
        self.wfile.write(contenu)

    def do_POST(self):
        chemin = self.path.split("?")[0]
        if chemin not in ("/api/frises/ouvrir", "/api/frises/creer"):
            return self._json(404, {"erreur": "Adresse inconnue"})
        try:
            corps = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))).decode("utf-8") or "{}")
            if chemin.endswith("ouvrir"):
                self.frises.ouvrir(corps.get("fichier"))
            else:
                self.frises.creer(corps.get("titre"), corps.get("langue") or "fr")
        except ValueError as e:
            return self._json(400, {"erreur": str(e) or "Demande invalide."})
        self._json(200, self.frises.lister())

    def do_PUT(self):
        if self.path.split("?")[0] != "/api/donnees":
            return self._json(404, {"erreur": "Adresse inconnue"})
        try:
            corps = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            donnees = json.loads(corps.decode("utf-8"))
            if not isinstance(donnees, dict) or "dates" not in donnees or "groupes" not in donnees:
                raise ValueError
        except (ValueError, UnicodeDecodeError):
            return self._json(400, {"erreur": "Données invalides, rien n'a été enregistré."})
        nouvelle, copie = self.stockage.ecrire(donnees, self.headers.get("X-Version"))
        if nouvelle is None:
            return self._json(409, {"erreur": "Le fichier a été modifié ailleurs depuis son chargement. "
                                              "Recharge la page avant d'enregistrer."})
        self._json(200, {"version": nouvelle, "copie": copie}, {"X-Version": nouvelle})


def main():
    ap = argparse.ArgumentParser(description="Serveur local de Cinabre, la frise chronologique.")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--fichier", default=str(RACINE / "dates.json"))
    ap.add_argument("--sans-navigateur", action="store_true")
    args = ap.parse_args()

    fichier = Path(args.fichier).resolve()
    if not fichier.exists():
        creer_frise_vide(fichier)
        print(f"Aucune frise trouvée : nouvelle frise vide créée dans {fichier}")

    gestionnaire = partial(Gestionnaire, frises=Frises(fichier))
    for port in range(args.port, args.port + 10):
        try:
            serveur = ThreadingHTTPServer(("127.0.0.1", port), gestionnaire)
            break
        except OSError:
            continue
    else:
        sys.exit(f"Aucun port libre entre {args.port} et {args.port + 9}.")

    url = f"http://127.0.0.1:{port}/"
    print(f"Cinabre : {url}\nDonnées : {fichier}\n(Ctrl+C pour arrêter)")
    if not args.sans_navigateur:
        threading.Timer(0.4, webbrowser.open, [url]).start()
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        print("\nServeur arrêté.")


if __name__ == "__main__":
    main()
