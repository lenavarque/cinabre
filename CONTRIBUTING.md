# Contribuer

Merci de votre intérêt ! Les remarques, les corrections et les idées sont bienvenues.

## Signaler un problème ou proposer une idée

Ouvrez une [issue](https://github.com/lenavarque/cinabre/issues) en décrivant ce que vous avez fait, ce qui s'est
passé et ce que vous attendiez (navigateur, système, capture d'écran si l'affichage est en cause).

## Proposer une modification

1. Créez une branche à partir de `main`.
2. Faites votre modification, puis essayez-la : `python serveur.py`, dans les deux langues et les deux thèmes.
3. Vérifiez qu'une page exportée (menu des frises → *Exporter en page HTML*) s'ouvre toujours, et qu'on n'y peut rien
   modifier.
4. Notez le changement dans une section « Non publié » de [CHANGELOG.md](CHANGELOG.md).
5. Ouvrez une *pull request* qui explique le pourquoi du changement.

## Conventions

- **Aucune dépendance** : le serveur n'utilise que la bibliothèque standard de Python ; l'interface est en HTML, CSS
  et modules JavaScript natifs, sans bibliothèque ni étape de compilation.
- Le code, les commentaires et la documentation sont **en français**, noms de variables compris. Tout texte de
  l'interface passe par `t()` et reçoit sa traduction dans `web/js/anglais.js` ; le guide existe en français
  (`guide-fr.js`) et en anglais (`guide-en.js`).
- Toute modification des données passe par `modifier()` (`web/js/donnees.js`), qui la rend annulable.
- Chaque couleur de `web/css/style.css` est une paire `light-dark(thème clair, thème sombre)`.
- Un nouveau module JavaScript doit être ajouté à la liste `MODULES` de `web/js/export.js`.
