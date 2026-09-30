# Contributing

Thank you for your interest! Comments, corrections and ideas are welcome, in English or in French.

## Reporting a problem or suggesting an idea

Open an [issue](https://github.com/lenavarque/cinabre/issues) describing what you did, what happened and what you
expected (browser, system, and a screenshot if the display is involved).

## Proposing a change

1. Create a branch from `main`.
2. Make your change, then try it: `python serveur.py`, in both languages and both themes.
3. Check that an exported page (timeline menu → *Export as an HTML page*) still opens, and that nothing can be changed
   in it.
4. Note the change in an "Unreleased" section of [CHANGELOG.md](CHANGELOG.md).
5. Open a pull request explaining why the change is needed.

## Conventions

- **No dependency**: the server only uses the Python standard library; the interface is plain HTML, CSS and native
  JavaScript modules, with no library and no build step.
- The code, its comments and variable names are **in French**. Every interface text goes through `t()` (written in
  French) and gets its English translation in `web/js/anglais.js`; the guide exists in French (`guide-fr.js`) and in
  English (`guide-en.js`).
- Every change to the data goes through `modifier()` (`web/js/donnees.js`), which makes it undoable.
- Every colour in `web/css/style.css` is a `light-dark(light theme, dark theme)` pair.
- A new JavaScript module must be added to the `MODULES` list in `web/js/export.js`.
