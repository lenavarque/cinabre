# Cinabre

![Python 3.9+](https://img.shields.io/badge/python-3.9%2B-blue.svg)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Un outil pour construire vos propres frises chronologiques, sur quelques années comme sur des milliards : une
révolution jour après jour, l'histoire d'un pays, d'une famille, ou tout depuis le Big Bang. Vous y notez vos dates et
vos évènements, vous les classez par lieu et par thème, vous reliez le début d'une époque à sa fin, et Cinabre en
fait une frise à lire, à filtrer et à parcourir.

Cinabre tourne sur votre ordinateur : un petit serveur Python, une page dans le navigateur, un fichier JSON par
frise. Pas de compte, pas de connexion, aucune dépendance. Au premier lancement, une frise vide vous attend.

**[Voir un exemple](https://lenavarque.github.io/cinabre/)** : une frise de l'histoire universelle faite avec Cinabre
([et une autre sur la Révolution française](https://lenavarque.github.io/cinabre/revolution/)), dans l'application
complète, en lecture seule.

![Cinabre](docs/apercu.webp)

*[English summary below.](#in-english)*

## Ce qu'il fait

- **Frise** : une ligne par date, les évènements côte à côte, les époques en rubans verticaux, les grandes périodes
  (éons, ères, périodes historiques) en lignes spéciales, une mini-carte pour se déplacer.
- **Filtre** par lieu et par thème, **recherche** dans les noms et les descriptions.
- **Statistiques** : le nombre d'évènements par tranche d'années et par lieu.
- **Données** : des tables pour ajouter, corriger, relier une date de début à une date de fin, modifier plusieurs
  évènements à la fois, ou en coller toute une liste d'un coup ; annulation avec Ctrl+Z.
- Des dates à l'année, au mois ou au jour, approximatives ou non, jusqu'aux milliards d'années (« 2.9 Ga »).
- Plusieurs frises dans le même dossier, une copie de sécurité automatique à chaque enregistrement.
- **Export** d'une frise en une seule page HTML, en lecture seule, à ouvrir dans n'importe quel navigateur.
- Interface en français ou en anglais, thème clair ou sombre, et un guide intégré.

## Installation

Il faut Python 3.9 ou plus récent, et rien d'autre. Téléchargez le dépôt (bouton *Code* → *Download ZIP*, ou
`git clone`), puis, dans son dossier :

```bash
python serveur.py
```

La page s'ouvre dans le navigateur, sur <http://127.0.0.1:8765>. Au premier lancement, une frise vide est créée
(`dates.json`) : c'est la vôtre. Le guide intégré (onglet *Guide*) explique le reste.

Options :

| Option | Rôle |
|---|---|
| `--port 9000` | un autre port (si 8765 est pris, les 9 suivants sont essayés) |
| `--fichier ma-frise.json` | ouvrir un autre fichier de données |
| `--sans-navigateur` | ne pas ouvrir le navigateur |

Le serveur n'écoute que votre ordinateur (127.0.0.1). Vos données restent dans le dossier, avec leurs copies de
sécurité dans `sauvegardes/`.

## Le contenu du dépôt

| Fichier | Rôle |
|---|---|
| [serveur.py](serveur.py) | le serveur local (bibliothèque standard seule) |
| [web/](web/) | l'interface : HTML, CSS et modules JavaScript, sans bibliothèque ni étape de compilation |
| [demo/](demo/) | les deux frises de démonstration, exportées en lecture seule |

## Les données

Une frise est un fichier JSON lisible : des groupes (lieux et échelles, avec leur couleur), des thèmes, des périodes
(époques et lignes spéciales) et des dates, chacune avec ses évènements. Il se modifie dans l'onglet *Données* ; rien
n'empêche de l'ouvrir aussi dans un éditeur de texte.

## La démonstration

Elle est publiée sur GitHub Pages à chaque envoi sur `main` par le workflow [pages.yml](.github/workflows/pages.yml)
(réglage du dépôt : Settings → Pages → Source : GitHub Actions). Ce sont des pages exportées depuis Cinabre :
l'application entière, où tout se consulte, les tables comprises, mais où rien ne se modifie (les données y sont
gelées).

## Licence

[MIT](LICENSE). Les polices Spectral et Source Sans 3 sont sous licence SIL Open Font License.

## Contribuer

Les remarques et les propositions sont bienvenues : voir [CONTRIBUTING.md](CONTRIBUTING.md). Les changements sont
notés dans [CHANGELOG.md](CHANGELOG.md).

## In English

*Cinabre* is a tool to build your own timelines, over a few years or billions: enter your dates and events, sort them
by place and theme, link the start of an era to its end, and read it all on a vertical timeline. It runs locally (`python serveur.py`, standard library only, then <http://127.0.0.1:8765>), stores each
timeline in a readable JSON file, and has statistics, bulk editing, undo, HTML export, a light and a dark theme, and
a French or English interface. See an [example timeline made with it](https://lenavarque.github.io/cinabre/) (read-only). MIT-licensed; code and
documentation are in French.
