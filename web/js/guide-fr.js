// Texte du Guide en français (l'anglais est dans guide-en.js, même forme).
// Chaque section : [identifiant, titre, HTML]. LECTURE : présentation de la page exportée en lecture seule.

export const touche = (t) => `<kbd>${t}</kbd>`;

export const GUIDE = [
  ["but", "Qu'est-ce que Cinabre", `
    <p><b>Cinabre</b> sert à construire sa propre frise chronologique et à la faire vivre : on y note les dates
    et les évènements qui comptent pour soi, on les classe par lieu ou par thème, et on les lit sur un axe du temps
    qui peut aller aussi loin qu'on veut, du Big Bang à aujourd'hui.</p>
    <p>On la lit comme une frise, on la complète comme un carnet : ajouter un évènement, le rattacher à un ou plusieurs groupes,
    relier le début d'une époque à sa fin, marquer ce qui est important. Les statistiques montrent ensuite
    où se concentrent les évènements, siècle après siècle.</p>
    <p>C'est un outil local : un petit serveur Python sur votre ordinateur, une page dans le navigateur,
    et un seul fichier de données, <code>dates.json</code>. Rien ne part sur Internet (à part les polices de caractères).</p>
    <h4>Pourquoi « Cinabre »</h4>
    <p>Le cinabre est un minerai rouge vif dont on tire le vermillon, l'un des plus anciens pigments de l'humanité.
    On le retrouve tout au long de la frise : sur les fresques romaines, dans les laques et les sceaux de Chine,
    dans les titres rouges des manuscrits médiévaux et sur les cartes anciennes, où il marquait ce qu'il fallait remarquer.
    C'est aussi la couleur d'accent de l'interface : l'onglet actif, le bouton Enregistrer, ce qui attend votre attention.</p>
    <h4>Les onglets</h4>
    <p>Quatre onglets :</p>
    <ul>
      <li><b>Frise</b> : lire la chronologie, une ligne par date.</li>
      <li><b>Statistiques</b> : voir combien d'évènements compte chaque période, par lieu.</li>
      <li><b>Données</b> : ajouter, corriger, supprimer ; relier un début d'époque à sa fin.</li>
      <li><b>Guide</b> : cette page.</li>
    </ul>
    <p>Le panneau <b>Groupes</b> à gauche est commun aux trois premiers onglets : il filtre ce qui est affiché.</p>`],

  ["demarrer", "Démarrer et enregistrer", `
    <p>Lancer le serveur depuis le dossier <code>frise</code> :</p>
    <pre>python serveur.py</pre>
    <p>Le navigateur s'ouvre sur <code>http://127.0.0.1:8765</code>. Options : <code>--port 9000</code>,
    <code>--fichier autre.json</code>, <code>--sans-navigateur</code>. Si le port est pris, les 9 suivants sont essayés.
    Arrêter avec ${touche("Ctrl")} + ${touche("C")} dans le terminal.</p>
    <p>Toutes les données sont dans <code>dates.json</code>, la seule source de vérité. C'est ce fichier qu'il faut garder précieusement (et sauvegarder).</p>
    <h4>Plusieurs frises</h4>
    <p>Le nom de la frise ouverte est affiché à côté de « Cinabre », en haut à gauche. Un clic ouvre le menu des frises :</p>
    <ul>
      <li>la liste des frises du dossier, avec leur nombre d'évènements : un clic en ouvre une ;</li>
      <li><b>Nouvelle frise</b> : un nom, puis <b>Créer</b> ; elle s'ouvre, vide, avec les thèmes de départ ;</li>
      <li><b>Renommer cette frise</b> : change le nom affiché (à enregistrer ensuite) ;</li>
      <li><b>Exporter en page HTML</b> : voir ci-dessous.</li>
    </ul>
    <p>Chaque frise est un fichier <code>.json</code> du dossier <code>frise</code>, avec ses propres copies de sécurité.
    Si la frise ouverte a des modifications non enregistrées, Cinabre propose de les enregistrer avant de changer.
    Au lancement, c'est <code>dates.json</code> qui s'ouvre (ou le fichier donné avec <code>--fichier</code>).</p>
    <h4>Partager une frise</h4>
    <p>Dans le menu des frises, <b>Exporter en page HTML</b> télécharge un fichier unique (par exemple <code>histoire.html</code>)
    à envoyer à qui vous voulez : il s'ouvre d'un double-clic dans n'importe quel navigateur, sans Python ni serveur, même hors ligne.
    La page est en <b>lecture seule</b> : frise, statistiques, filtre, recherche et popups (avec les sources), sans l'onglet Données.
    Elle contient la frise telle qu'elle est affichée, modifications non enregistrées comprises ; pour la mettre à jour, exportez-la de nouveau.
    Elle est dans la langue de l'interface au moment de l'export, sans choix de langue.</p>
    <h4>Langue</h4>
    <p><b>FR · EN</b>, en haut à droite, passe l'interface en français ou en anglais : menus, boutons, messages, Guide. Au départ, c'est la langue du navigateur.
    Les données ne sont jamais traduites (noms, descriptions, groupes, thèmes) ; seules les dates changent d'écriture à l'affichage
    (« - 2 334 » devient « 2334 BC » en anglais), sans que le fichier change. Les modifications non enregistrées sont conservées
    au changement de langue, mais l'historique d'annulation repart de zéro. Une nouvelle frise créée en anglais reçoit des thèmes de départ en anglais.</p>
    <h4>Thème clair ou sombre</h4>
    <p>Le bouton à côté de <b>FR · EN</b> (un soleil ou une lune) passe l'interface en thème clair, couleur parchemin, ou sombre.
    Au départ, c'est le thème de l'ordinateur ; le choix est ensuite retenu. Les couleurs des groupes s'adaptent au thème.</p>
    <h4>Enregistrer</h4>
    <ul>
      <li>Une modification n'est écrite dans le fichier qu'avec ${touche("Ctrl")} + ${touche("S")} ou le bouton <b>Enregistrer</b>.</li>
      <li>En haut à droite : <b>Modifications non enregistrées</b> tant qu'il reste des changements, <b>Enregistré</b> quand tout est écrit.</li>
      <li>Quitter la page avec des changements non enregistrés demande confirmation.</li>
      <li>Si le fichier a été modifié ailleurs entre-temps, l'enregistrement est refusé : recharger la page.</li>
    </ul>
    <h4>Copies de sécurité</h4>
    <p>Avant d'écraser le fichier, le serveur copie la version précédente dans <code>sauvegardes/</code> :
    toujours au premier enregistrement d'une séance, puis au plus une copie toutes les 30 minutes.
    Seules les 40 dernières copies sont gardées. Pour revenir en arrière, remplacer <code>dates.json</code>
    par une de ces copies, serveur arrêté.</p>`],

  ["commencer", "Commencer sa frise", `
    <p>Au premier lancement, s'il n'y a pas encore de fichier <code>dates.json</code> à côté de <code>serveur.py</code>,
    Cinabre en crée un, vide : la frise est à vous. Pour tenir plusieurs frises, utilisez le menu des frises,
    à côté de « Cinabre » (voir « Démarrer et enregistrer »).</p>
    <h4>1. Créer ses groupes</h4>
    <p>Onglet <b>Données</b>, sous-onglet <b>Groupes</b>, <b>Ajouter un groupe</b>. Un groupe donne sa couleur aux évènements.</p>
    <ul>
      <li><b>Lieu</b> : un pays, une civilisation, ou un thème (Rome, Chine, Sciences, Musique…). Ce sont les couleurs de la frise.</li>
      <li><b>Échelle</b> : un niveau de découpage du temps (éon, ère, période…), pour les lignes spéciales.
      La première échelle de la liste est le niveau le plus large.</li>
    </ul>
    <p>L'ordre des groupes (flèches ↑ ↓) est celui du panneau de gauche et des colonnes d'époques.</p>
    <p>Une nouvelle frise démarre avec des <b>thèmes</b> généraux (Civilisations, Pouvoir et politique, Guerres et conflits, Religion et croyances…),
    que l'on peut renommer, compléter ou supprimer dans le sous-onglet <b>Thèmes</b>.</p>
    <h4>2. Ajouter des évènements</h4>
    <p>Sous-onglet <b>Évènements</b>, <b>Ajouter un évènement</b> : une date (voir « Écrire une date »), un nom,
    un ou plusieurs lieux et thèmes, une description si on veut. <b>Valider</b>, puis ${touche("Ctrl")} + ${touche("S")} pour enregistrer.</p>
    <h4>3. Ajouter des époques</h4>
    <p>Pour une durée connue (un règne, un empire…) : sous-onglet <b>Périodes</b>, <b>Ajouter une période</b>, type <b>Époque</b>,
    avec un début et une fin. Ou, depuis un évènement de début, <b>Relier à une fin…</b>.</p>
    <h4>4. Découper le temps</h4>
    <p>Les <b>lignes spéciales</b> (Paléolithique, Moyen Âge, Renaissance…) sont des périodes de type <b>Ligne spéciale</b>,
    rattachées à un groupe de type échelle. Elles s'affichent en bandeau sur toute la largeur de la frise.</p>
    <h4>Partager Cinabre</h4>
    <p>Pour donner l'outil à quelqu'un, il suffit de copier <code>serveur.py</code> et le dossier <code>web/</code>.
    Ne joignez ni votre <code>dates.json</code> ni le dossier <code>sauvegardes/</code> (sauf si vous voulez partager votre frise) :
    la personne partira d'une frise vide. Il lui faut seulement Python 3, sans rien installer d'autre.</p>`],

  ["frise", "La frise", `
    <p>La frise est verticale : <b>une ligne par date</b>, tous les évènements de la date côte à côte.
    Quand ils sont trop nombreux pour la largeur de l'écran, la ligne continue en dessous (réglage <b>Dates aux nombreux évènements</b>,
    dans Données, Réglages : on peut aussi tout garder sur une seule ligne). Les noms trop longs sont raccourcis ;
    le nom complet et la description apparaissent au survol.</p>
    <h4>Lire un évènement</h4>
    <table class="aide-table">
      <tr><td><span class="ev" style="--ct:#9fd3e6">Nom</span></td><td>Couleur du texte et du fond : le groupe (lieu).</td></tr>
      <tr><td><span class="ev limite" style="--ct:#9fd3e6">Nom</span></td><td>En gras : début ou fin d'époque dont on n'a qu'une borne.</td></tr>
      <tr><td><span class="ev regne" style="--ct:#9fd3e6">Nom</span></td><td>Souligné d'or : début de règne.</td></tr>
      <tr><td><span class="ev" style="--ct:#9fd3e6"><span class="etoile">★</span>Nom</span></td><td>Étoile : évènement que vous avez marqué comme important.</td></tr>
      <tr><td><span class="ev note" style="--ct:#9fd3e6">Nom</span></td><td>Coin replié en haut : il y a une description, visible au survol.</td></tr>
      <tr><td><span class="ev" style="--ct:#9fd3e6">Nom<span class="coin-sources"></span></span></td><td>Coin replié en bas : il y a des sources (voir « Popup épinglée »).</td></tr>
      <tr><td><span class="ev limite epoque" style="--ct:#9fd3e6">Nom</span></td><td>Petite barre à gauche : une époque, avec sa barre de durée à droite de la frise.</td></tr>
      <tr><td><span class="ev multi" style="--ct:#f4b183;--rayures:repeating-linear-gradient(135deg, rgba(244,177,131,.12) 0 6px, rgba(159,211,230,.12) 6px 12px)">Nom</span></td>
        <td>Bandes diagonales : plusieurs groupes. Le texte prend la couleur du premier ; dans la popup, chaque groupe est écrit dans sa couleur et le liseré de gauche alterne leurs couleurs.</td></tr>
    </table>
    <h4>Autour des évènements</h4>
    <ul>
      <li><b>Lignes spéciales</b> (éons, ères, périodes géologiques, périodes historiques) : bandeaux sur toute la largeur,
      d'autant plus clairs que le niveau est grand (éon le plus clair). Un losange les marque sur l'axe.</li>
      <li><b>Colonnes à gauche</b> : la durée de chaque ligne spéciale, une colonne par niveau, avec son nom écrit verticalement.</li>
      <li><b>Barres à droite</b> : la durée des époques. Chaque lieu a sa colonne, mais deux lieux qui ne coexistent pas dans le temps se partagent la même (l'Égypte antique, finie en - 30, et le Monde arabo-musulman, né en 622), pour laisser plus de place aux évènements. Survoler une barre met en évidence son évènement, et inversement.</li>
      <li>Chaque barre porte sa <b>date de début</b> en haut et sa <b>date de fin</b> en bas (si elle est connue et s'il y a la place).</li>
      <li>Le <b>nom</b> des lignes spéciales et des époques est écrit dans leur barre, de haut en bas. Il reste au milieu
      de la partie visible pendant qu'on fait défiler la frise : on sait toujours dans quelle période on se trouve.
      S'il manque de place, il est raccourci (…) ; le nom complet est au survol.</li>
      <li><b>Rappel en haut</b> : une ligne spéciale que l'on dépasse monte jusqu'en haut de la frise et s'y arrête, empilée sous celles
      des niveaux plus larges (éon, puis ère, puis période…). La suivante du même niveau la pousse vers le haut en arrivant ;
      une ligne d'un niveau plus large glisse par-dessus les plus fines jusqu'à sa place. Tout suit le défilement, sans saut.
      Par défaut, chaque ligne reste une dizaine de lignes après son passage ; dans Données, Réglages, on peut la garder
      <b>jusqu'à la suivante de même niveau</b> : on voit alors toujours l'éon, l'ère, la période… en cours.</li>
      <li><b>Séparateurs</b> : tous les 1 000 ans de - 5 000 à - 1 000, puis tous les 100 ans. Ils sont calculés, pas saisis.</li>
    </ul>
    <h4>Se déplacer</h4>
    <ul>
      <li><b>Mini-carte</b> à droite (elle remplace la barre de défilement) : cliquer ou glisser pour se déplacer ; le survol affiche la date.</li>
      <li><b>Aller à</b> : repères d'années et liste des lignes spéciales.</li>
      <li><b>Recherche</b> (${touche("/")}) : noms et descriptions. Les évènements qui ne correspondent pas s'estompent, les résultats
      apparaissent en blanc sur la mini-carte. ${touche("Entrée")} passe au suivant, ${touche("Maj")} + ${touche("Entrée")} au précédent.
      Si l'on tape une année sans résultat, ${touche("Entrée")} y va.</li>
      <li>La position est retenue d'une visite à l'autre.</li>
      <li><b>Popup épinglée</b> : restez 3 secondes sur un évènement, ou double-cliquez dessus. La popup ne disparaît plus quand on
      y amène la souris : on peut faire défiler une longue description et cliquer sur les liens. Elle s'agrandit par le bas
      avec les <b>sources</b> (titre, lien, citation). Elle se ferme quand la souris la quitte, avec ${touche("Échap")} ou d'un clic ailleurs.</li>
      <li class="edition">${touche("Alt")} + clic sur un évènement, une époque ou une ligne spéciale : l'ouvrir dans l'onglet <b>Données</b> pour le modifier.</li>
    </ul>`],

  ["filtre", "Filtrer par lieu et par thème", `
    <p>Le panneau de gauche a trois parties, avec pour chaque élément son nombre d'évènements :</p>
    <ul>
      <li><b>Lieux</b> (carrés de couleur) : ils donnent leur couleur aux évènements.</li>
      <li><b>Thèmes</b> (ronds) : le sujet de l'évènement (guerres, religion, sciences…). Neutres, ils ne changent pas les couleurs de la frise ;
      on les voit dans la popup et dans les tables. Un évènement peut en avoir plusieurs.</li>
      <li><b>Échelles</b> : les niveaux des lignes spéciales (éon, ère…).</li>
    </ul>
    <p>Le filtre agit sur la frise, les statistiques et les tables de données à la fois.</p>
    <ul>
      <li>Un clic affiche uniquement cet élément ; les clics suivants en ajoutent ou en retirent d'autres.</li>
      <li>Lieux et thèmes se combinent : <b>Rome</b> + <b>Guerres et conflits</b> montre les guerres de Rome.
      Dans une même partie, les choix s'additionnent : Rome + Grèce montre les deux.</li>
      <li>${touche("Alt")} + clic isole un groupe (ou revient à tout afficher s'il était seul).</li>
      <li><b>Tout afficher</b> retire le filtre.</li>
      <li>« Sans groupe » et « Sans thème » regroupent ce qui n'a pas encore de lieu ou de thème.</li>
      <li>Survoler un lieu, un thème ou une échelle affiche sa <b>description</b> (ce qu'il couvre), son nombre d'éléments
      et quelques <b>exemples</b> tirés au hasard, différents à chaque survol.</li>
      <li>Le filtre est retenu d'une visite à l'autre.</li>
      <li><b>‹</b>, à droite du titre « Filtre », replie le panneau en une fine bande (pratique sur un petit écran) ; un clic sur la bande le rouvre.
      Un point rouge sur la bande rappelle qu'un filtre est actif. Sur un écran étroit, le panneau est replié d'office.</li>
    </ul>`],

  ["stats", "Statistiques", `
    <p>Un graphique en barres empilées : pour chaque tranche d'années, le nombre d'évènements de chaque groupe.</p>
    <ul>
      <li>Par défaut, de la première date de la frise (au plus tôt - 5 000) à la dernière, en tranches de 1, 5, 10, 25, 100, 500 ou 1 000 ans :
      la plus fine qui ne donne pas plus de 80 barres (des siècles pour une histoire universelle, des années pour une révolution).</li>
      <li class="edition">On peut choisir ses propres <b>plages</b> dans Données, Réglages (lien « Changer les tranches » en haut à droite) :
      chaque plage va d'une année à une autre, par tranches d'une durée choisie (500 ans, 100 ans, 10 ans, 1 an…). Par exemple
      de - 5 000 à - 1 001 par 500 ans, puis de - 1 000 à 1999 par 100 ans. Les plages se suivent sans se chevaucher ;
      « Revenir au réglage par défaut » les efface.</li>
      <li>Quand les tranches n'ont pas toutes la même durée, les hauteurs ne se comparent qu'à durée égale : une accolade sous l'axe
      indique la durée des tranches de chaque plage.</li>
      <li>Une époque compte à son année de début. Un évènement à plusieurs groupes compte une fois, dans son premier groupe affiché.</li>
      <li>Les évènements hors des plages ne sont pas comptés ; leur nombre est indiqué en haut.</li>
      <li>Survoler un segment donne le groupe, la tranche et le nombre. Cliquer sur une barre ouvre la frise au début de la tranche.</li>
      <li>Le filtre du panneau de gauche retire des groupes de la pile.</li>
    </ul>`],

  ["jeu", "Jeu", `
    <p>L'onglet <b>Jeu</b> propose « la frise qui se construit » : remettre dans l'ordre, un par un, des évènements de la frise.</p>
    <ul>
      <li>Avant de commencer, on choisit les <b>lieux</b> et les <b>thèmes</b> en jeu avec le filtre du panneau de gauche
      (par défaut, tout), une <b>plage d'années</b> (par défaut, toute la frise) et si l'on veut <b>voir les descriptions</b>.
      Le nombre d'évènements en jeu s'affiche.</li>
      <li>Un premier évènement est posé, avec sa date. Les suivants arrivent un par un, sans date : cliquer sur l'emplacement
      où il doit aller, avant, entre ou après ceux déjà posés (ou au clavier : ${touche("↑")} ${touche("↓")} choisissent l'emplacement, ${touche("Entrée")} y pose l'évènement).</li>
      <li>Bien placé, il prend sa place ; mal placé, il est posé à sa vraie place et l'on perd une vie (3 en tout).
      La partie s'arrête sans vie, ou quand tout est placé.</li>
      <li>Deux évènements de même date peuvent être placés dans les deux ordres. Tant qu'un évènement n'est pas placé,
      les dates et les nombres de son nom et de sa description sont cachés sous un pavé.</li>
      <li>Survoler un évènement posé affiche sa popup habituelle.</li>
    </ul>`],

  ["donnees", "Modifier les données", `
    <p>L'onglet <b>Données</b> a six sous-onglets : <b>Évènements</b>, <b>Périodes</b>, <b>Groupes</b>, <b>Thèmes</b>, <b>À vérifier</b>
    et <b>Réglages</b> (réglages propres à la frise ouverte : affichage des dates, voir « Écrire une date », et tranches des statistiques<span class="si-jeu">, jeu</span>).</p>
    <ul>
      <li>Cliquer sur un titre de colonne pour trier. Trier sur la colonne ★ met les éléments importants en tête.</li>
      <li>Cliquer l'étoile ☆ au début d'une ligne marque l'évènement ou la période comme <b>important</b> (★) ;
      un second clic la retire. C'est une modification comme une autre : à enregistrer, et annulable.</li>
      <li>${touche("Alt")} + clic sur un évènement ou une période : revenir à la frise, sur cet élément (encadré en rouge un instant).</li>
      <li>La recherche du haut filtre les tables à chaque frappe, sur les titres et les descriptions, et surligne ce qui correspond
      (sans tenir compte des accents ni des majuscules).</li>
      <li>Cliquer sur une ligne ouvre son détail à droite ; ${touche("↑")} ${touche("↓")} passent à la ligne précédente ou suivante.
      Les changements s'appliquent <b>au fil de la saisie</b> (un texte après une courte pause, une case ou un groupe tout de suite) ;
      il reste à enregistrer la frise (${touche("Ctrl")} + ${touche("S")}). <b>Annuler</b> défait une saisie entière dans un champ.
      Une saisie invalide (date non comprise, nom vide…) est signalée et n'est pas appliquée : on ne peut pas changer de ligne
      tant qu'elle n'est pas corrigée, pour ne pas la perdre (${touche("Échap")} l'abandonne). Pour un nouvel élément, le bouton <b>Ajouter</b> le crée.</li>
      <li>${touche("Échap")} (ou ×) ferme le détail mais garde la ligne sélectionnée : ${touche("↑")} ${touche("↓")} déplacent alors la sélection,
      et ${touche("Entrée")} rouvre le détail.</li>
      <li><b>Supprimer</b> demande un second clic pour confirmer ; la ligne suivante s'ouvre ensuite.</li>
      <li><b>Annuler</b> (ou ${touche("Ctrl")} + ${touche("Z")} hors d'un champ) revient en arrière, modification par modification.</li>
      <li>Les boutons en haut à droite ajoutent un évènement, une période ou un groupe ; <b>Ajouter plusieurs</b> en ajoute une série d'un coup (voir plus bas).</li>
    </ul>
    <h4>Modifier plusieurs lignes d'un coup</h4>
    <ul>
      <li>Dans les tables Évènements et Périodes, cocher la case au début des lignes à modifier. ${touche("Maj")} + clic coche toute une plage ;
      la case de l'en-tête coche toutes les lignes affichées (pratique après une recherche ou avec le filtre).</li>
      <li>Tant que des lignes sont cochées, un clic sur une ligne la coche ou la décoche, et le panneau de droite devient <b>Modification en série</b> :
        <ul>
          <li>cliquer un <b>groupe</b> ou un <b>thème</b> l'ajoute à toutes les lignes cochées ; s'il y est déjà partout, le clic le retire
          (« 3/12 » : il n'est que sur 3 des 12 lignes) ; un groupe ajouté vient en dernier, la couleur ne change donc pas ;</li>
          <li><b>★ Important</b> et <b>Date approximative</b> se mettent ou se retirent partout (case à moitié remplie : seulement sur une partie) ;</li>
          <li><b>Supprimer</b> retire toutes les lignes cochées, après un second clic de confirmation.</li>
        </ul></li>
      <li>Chaque changement s'applique tout de suite, et <b>Annuler</b> le défait en une fois. <b>Tout décocher</b> (ou ${touche("Échap")}) ferme le panneau.</li>
      <li>Au clavier, tant que des lignes sont cochées : ${touche("↑")} ${touche("↓")} passent d'une ligne à l'autre (un trait à gauche montre la ligne en cours),
      ${touche("Espace")} la coche ou la décoche, ${touche("Maj")} + ${touche("↑")} ${touche("↓")} cochent au passage.</li>
      <li>Les lignes cochées restent cochées si une recherche les masque : le panneau indique combien sont masquées.</li>
    </ul>
    <h4>Évènement</h4>
    <ul>
      <li><b>Date</b> : le texte affiché dans la frise (voir « Écrire une date »). L'année comprise s'affiche en dessous.
      Changer la date déplace l'évènement sur la bonne ligne.</li>
      <li><b>Groupes</b> : cliquer un groupe en bas pour l'ajouter, sur × pour le retirer. Le premier donne la couleur du texte ;
      cliquer un autre groupe choisi le met en premier.</li>
      <li><b>Thèmes</b> : cliquer un thème pour l'ajouter ou le retirer ; on peut en cocher plusieurs.</li>
      <li><b>Début ou fin d'époque</b> et <b>Début de règne</b> : les codes gras et or de la frise.</li>
      <li><b>★ Important</b> : ajoute une petite étoile devant le nom dans la frise (même effet que l'étoile de la table).</li>
      <li><b>Voir dans la frise</b> ouvre la frise sur cet évènement (comme ${touche("Alt")} + clic sur sa ligne).</li>
    </ul>
    <h4>Sources</h4>
    <p>Dans le formulaire, <b>+ Ajouter une source</b> : un titre, un lien et une citation, tous facultatifs. On peut en mettre autant qu'on veut.
    Un lien sans « https:// » est complété. Les sources apparaissent dans la popup épinglée et sont signalées par un coin en bas à droite de l'évènement.</p>
    <h4>Ajouter plusieurs éléments d'un coup</h4>
    <p><b>Ajouter plusieurs</b>, puis une ligne par évènement : <b>date | nom | groupes et thèmes | description</b>.</p>
    <pre>1453 | Chute de Constantinople | Rome, Monde Arabo-Musulman | Prise de la ville par Mehmed II.
~ - 2 350 | Sargon d'Akkad | Mésopotamie
- 2 685 → - 2 180 | Ancien Empire | Égypte Antique | L'âge des pyramides.</pre>
    <ul>
      <li>Seuls la date et le nom sont obligatoires. Dans la 3e colonne, lieux et thèmes sont mêlés, séparés par des virgules :
      « Rome, Guerres et conflits ». Les accents et les majuscules ne comptent pas.</li>
      <li>« ~ » ou « vers » : date approximative. Deux dates « début → fin » : une époque.</li>
      <li>Un aperçu montre ce qui a été compris ; les lignes en rouge (date non comprise, groupe inconnu…) sont à corriger avant d'ajouter.
      Un « ! » signale un élément qui existe peut-être déjà.</li>
      <li>On peut aussi coller du JSON (bouton <b>Modèle JSON</b>), qui permet en plus l'étoile, le règne, les sources…</li>
      <li>Tout l'ajout s'annule d'un seul coup avec <b>Annuler</b>.</li>
    </ul>
    <h4>Faire d'un évènement un début d'époque</h4>
    <p>Deux façons :</p>
    <ul>
      <li>Choisir <b>Début d'époque</b> dans le champ « Début ou fin d'époque », puis <b>Valider</b>. L'évènement passe en gras
      et rejoint la liste « Débuts d'époque sans fin » de l'onglet <b>À vérifier</b>.</li>
      <li>Mieux, si l'on connaît la fin : <b>Relier à une fin…</b>. On choisit l'évènement de fin, ou on saisit une date.
      Une <b>époque</b> est créée, avec sa barre de durée dans la frise ; l'évènement de début est retiré des dates.
      L'évènement de fin n'est retiré que si la case est cochée (elle l'est d'office pour une « fin d'époque »).
      Quand une fin porte le même nom (« Fin de l'Empire X » pour « Début de l'Empire X »), elle est proposée en premier.</li>
    </ul>
    <h4>Période</h4>
    <ul>
      <li><b>Époque</b> : deux bornes connues, barre de durée dans la colonne de son lieu.</li>
      <li><b>Ligne spéciale</b> : éon, ère, période géologique ou historique ; bandeau sur toute la largeur.
      Fin vide = inconnue (la ligne dure jusqu'à la suivante du même groupe) ; « aujourd'hui » est accepté.</li>
      <li><b>Début déduit</b> : un début provisoire, à confirmer ; la date apparaît en italique dans la frise, et la case se décoche dès qu'on corrige le début.</li>
    </ul>
    <h4>Groupes</h4>
    <ul>
      <li><b>Renommer</b> : le nouveau nom remplace l'ancien partout.</li>
      <li><b>Description</b> : ce que le groupe couvre ; elle s'affiche au survol dans le panneau de gauche.</li>
      <li><b>Couleur</b> : à choisir comme pour un fond blanc ; elle est adaptée au thème, clair ou sombre, à l'affichage, et l'aperçu montre le rendu sur la frise.
      Deux lieux peuvent avoir des couleurs proches s'ils ne sont pas de la même époque.</li>
      <li><b>Ordre</b> : flèches ↑ ↓ ; c'est l'ordre du panneau de gauche et des colonnes d'époques.
      Pour les échelles, c'est aussi la <b>hiérarchie des lignes spéciales</b> : la première échelle est le niveau le plus large (niveau 1),
      les suivantes de plus en plus fines ; la table l'indique (« Échelle · niveau 2 »). Le niveau d'une ligne spéciale est celui de son groupe.</li>
      <li><b>Supprimer</b> : ses évènements passent dans le groupe choisi, ou deviennent sans groupe.</li>
    </ul>
    <h4>Thèmes</h4>
    <ul>
      <li>Chaque thème a une <b>description</b>, affichée au survol dans le panneau de gauche.</li>
      <li><b>Ajouter un thème</b>, le <b>renommer</b> (le nouveau nom remplace l'ancien partout), le <b>supprimer</b>
      (il est retiré des évènements, qui restent), et les <b>réordonner</b> avec ↑ ↓ : c'est l'ordre du panneau de gauche.</li>
    </ul>
    <h4>À vérifier</h4>
    <p>Liste ce qui mérite une correction : débuts d'époque sans fin (avec un bouton <b>Relier à une fin</b>), fins isolées,
    lignes spéciales à début déduit, évènements sans groupe, évènements et époques sans thème, dates non comprises, époques dont la fin précède le début,
    noms trop longs (plus de 50 caractères, tronqués dans la frise) et noms en double.</p>`],

  ["dates", "Écrire une date", `
    <p>On écrit la date telle qu'elle doit s'afficher ; l'application en déduit l'année pour placer et trier.</p>
    <table class="aide-table">
      <tr><th>Saisie</th><th>Sens</th></tr>
      <tr><td>1453</td><td>an 1453</td></tr>
      <tr><td>juillet 1789</td><td>juillet 1789 (date précise au mois)</td></tr>
      <tr><td>14 juillet 1789 &nbsp;ou&nbsp; 14/07/1789</td><td>14 juillet 1789 (date précise au jour)</td></tr>
      <tr><td>- 2 334 &nbsp;ou&nbsp; -2334</td><td>2334 avant J.-C.</td></tr>
      <tr><td>2334 av. J.-C. &nbsp;ou&nbsp; 2334 BC</td><td>idem</td></tr>
      <tr><td>45k</td><td>il y a 45 000 ans</td></tr>
      <tr><td>540 Ma</td><td>il y a 540 millions d'années</td></tr>
      <tr><td>2.9 Ga</td><td>il y a 2,9 milliards d'années</td></tr>
      <tr><td>~ 1200, vers 1200</td><td>1200, date approximative (voir ci-dessous)</td></tr>
      <tr><td>aujourd'hui</td><td>pour une fin de période seulement</td></tr>
    </table>
    <h4>Dates précises au mois ou au jour</h4>
    <p>Une date peut être précise à l'année, au mois ou au jour. Les mois s'écrivent en toutes lettres, abrégés (« sept. 1792 ») ou en anglais.
    Les dates précises sont rangées dans l'ordre, et une ligne spéciale qui commence le 21 septembre se place entre le 20 et le 22.
    Dans la colonne des dates, elles sont abrégées (« 14 juil. 1789 »). Un jour impossible (31 février) n'est pas compris.</p>
    <p>Onglet <b>Données</b>, sous-onglet <b>Réglages</b>, on choisit comment la frise montre les dates précises :</p>
    <ul>
      <li><b>Une ligne par année</b> : les évènements de l'année sont côte à côte sur la ligne « 1789 », le jour et le mois écrits en petit devant le nom (« 14 juil. ») ;</li>
      <li><b>Une ligne par mois</b> : les évènements du mois sont côte à côte sur la ligne « juil. 1789 », le jour écrit en petit devant le nom ;</li>
      <li><b>Une ligne par jour</b> (par défaut) : chaque date a sa ligne.</li>
    </ul>
    <p>Une ligne spéciale qui commence en cours d'année ou de mois coupe la ligne en deux, pour rester à sa place.</p>
    <p>Toujours dans <b>Réglages</b>, <b>Détail des dates dans les évènements</b> choisit ce qui est écrit en petit devant le nom :
    sur une ligne d'année, rien, le mois (par défaut) ou le jour et le mois ; sur une ligne de mois, rien ou le jour (par défaut).</p>
    <p>Ce réglage est enregistré dans le fichier de la frise ; il ne change pas les dates elles-mêmes.
    La durée d'une période aux dates précises s'affiche en jours ou en mois quand elle est courte (Cent-Jours : 4 mois).</p>
    <h4>Date approximative</h4>
    <p>Cochez <b>Approximative</b> à côté de la date d'un évènement, ou <b>Approximatif</b> sous le début ou la fin d'une période.
    Taper « ~ » ou « vers » devant la date coche la case tout seul. La date reste placée à son année, et s'affiche
    précédée de « ~ » : dans la frise (si tout ce qui est sur la ligne est approximatif), sur les barres d'époques, dans les popups et dans les tables.</p>
    <p>« 45k » est rangé à - 45 000, sans correction « avant le présent » : c'est voulu, pour garder l'ordre.
    Deux évènements de la même année partagent la même ligne.</p>`],

  ["raccourcis", "Raccourcis clavier", `
    <table class="aide-table">
      <tr><td>${touche("1")} ${touche("2")} ${touche("3")} ${touche("4")}</td><td>Frise, Statistiques, Données, Guide</td></tr>
      <tr class="si-jeu"><td>${touche("5")}</td><td>Jeu</td></tr>
      <tr><td>${touche("/")}</td><td>Rechercher</td></tr>
      <tr><td>${touche("Entrée")} / ${touche("Maj")} + ${touche("Entrée")}</td><td>Frise : résultat suivant ou précédent, ou aller à l'année tapée</td></tr>
      <tr><td>${touche("Échap")}</td><td>Fermer la popup, le menu ou le formulaire ; dans un champ de recherche, l'effacer</td></tr>
      <tr><td>${touche("Ctrl")} + ${touche("S")}</td><td>Enregistrer dans <code>dates.json</code></td></tr>
      <tr><td>${touche("Ctrl")} + ${touche("Z")}</td><td>Annuler la dernière modification (hors d'un champ de saisie)</td></tr>
      <tr><td>${touche("Entrée")} dans un formulaire</td><td>Appliquer tout de suite ; pour un nouvel élément, l'ajouter</td></tr>
      <tr><td>${touche("↑")} ${touche("↓")} dans Données</td><td>Ligne précédente ou suivante (son détail s'ouvre)</td></tr>
      <tr><td>${touche("↑")} ${touche("↓")}, ${touche("Espace")} dans Données, des lignes étant cochées</td><td>Passer d'une ligne à l'autre, cocher ou décocher (${touche("Maj")} + flèche : cocher au passage)</td></tr>
      <tr><td>${touche("Alt")} + clic sur la frise</td><td>Ouvrir l'élément dans l'onglet Données</td></tr>
      <tr><td>${touche("Alt")} + clic dans Données</td><td>Revenir à la frise, sur cet élément</td></tr>
      <tr><td>${touche("Alt")} + clic sur un lieu ou un thème</td><td>L'isoler dans le filtre</td></tr>
      <tr><td>Double-clic sur un évènement, ou 3 s de survol</td><td>Épingler la popup (sources, liens cliquables)</td></tr>
    </table>`],

  ["vocabulaire", "Vocabulaire", `
    <dl>
      <dt>Évènement</dt><dd>Un fait daté, sur une ligne de la frise.</dd>
      <dt>Époque</dt><dd>Une durée dont on connaît le début et la fin (dynastie, empire…) : barre verticale à droite de la frise.</dd>
      <dt>Début ou fin d'époque</dt><dd>Un évènement en gras qui marque une seule borne ; à relier à l'autre quand on la connaît.</dd>
      <dt>Important</dt><dd>Un évènement ou une période marqué d'une étoile ★, pour le repérer d'un coup d'œil. Une époque créée par « Relier à une fin » garde l'étoile de son début.</dd>
      <dt>Ligne spéciale</dt><dd>Un éon, une ère, une période géologique ou historique : bandeau sur toute la largeur.</dd>
      <dt>Groupe</dt><dd>Un <b>lieu</b> (Rome, Chine…) ou une <b>échelle</b> (éon, ère…). Il donne la couleur.</dd>
      <dt>Thème</dt><dd>Le sujet d'un évènement (Guerres et conflits, Religion et croyances…), indépendant du lieu. Sans couleur ; sert à filtrer.</dd>
      <dt>Début déduit</dt><dd>Début provisoire d'une ligne spéciale, faute de mieux : à vérifier.</dd>
    </dl>`],
];

// Page exportée en lecture seule : une présentation, puis les seules sections utiles à la lecture
export const LECTURE = [
  ["lecture", "Cette page", `
    <p>Cette page est une frise exportée de <b>Cinabre</b> : l'application complète, en <b>lecture seule</b>. Elle s'ouvre
    dans n'importe quel navigateur, sans rien installer, et fonctionne hors ligne, avec ses polices.</p>
    <ul>
      <li><b>Frise</b> : une ligne par date, du plus ancien au plus récent ; les époques sont les barres verticales à droite.</li>
      <li><b>Statistiques</b> : le nombre d'évènements par tranche d'années et par lieu.</li>
      <li><b>Données</b> : les tables des évènements, des périodes, des groupes et des thèmes, à trier et à parcourir ; un clic
      sur une ligne ouvre sa fiche.</li>
      <li>Le survol d'un élément affiche sa description ; après 3 secondes, ou d'un double-clic, la popup reste ouverte et montre les sources.</li>
      <li>Le panneau de gauche filtre par lieu et par thème ; la recherche (${touche("/")}) porte sur les noms et les descriptions.</li>
    </ul>
    <p>Rien ne s'y modifie : les données sont celles du jour de l'export. Les sections suivantes décrivent toute
    l'application, y compris ce qui sert à modifier sa frise, possible seulement dans Cinabre installé sur son ordinateur.</p>`],
];
