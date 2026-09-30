// Texte du Guide en anglais : même forme que guide-fr.js (mêmes identifiants de sections).

export const touche = (t) => `<kbd>${t}</kbd>`;

export const GUIDE = [
  ["but", "What is Cinabre", `
    <p><b>Cinabre</b> is for building your own timeline and keeping it alive: you record the dates
    and events that matter to you, sort them by place or by theme, and read them along a time axis
    that can reach as far back as you like, from the Big Bang to today.</p>
    <p>You read it like a timeline and fill it in like a notebook: add an event, attach it to one or more groups,
    link the start of an era to its end, mark what is important. The statistics then show
    where events cluster, century after century.</p>
    <p>It is a local tool: a small Python server on your computer, a page in your browser,
    and a single data file, <code>dates.json</code>. Nothing is sent over the Internet (apart from the fonts).</p>
    <h4>Why “Cinabre”</h4>
    <p>Cinabre is French for cinnabar, a bright red mineral from which vermilion is made, one of humanity's oldest pigments.
    It appears all along the timeline: on Roman frescoes, in Chinese lacquers and seals,
    in the red headings of medieval manuscripts and on old maps, where it marked what deserved attention.
    It is also the accent colour of the interface: the active tab, the Save button, whatever needs your attention.</p>
    <h4>The tabs</h4>
    <p>Four tabs:</p>
    <ul>
      <li><b>Timeline</b>: read the chronology, one line per date.</li>
      <li><b>Statistics</b>: see how many events each period holds, by place.</li>
      <li><b>Data</b>: add, correct, delete; link the start of an era to its end.</li>
      <li><b>Guide</b>: this page.</li>
    </ul>
    <p>The <b>Filter</b> panel on the left is shared by the first three tabs: it filters what is shown.</p>`],

  ["demarrer", "Starting and saving", `
    <p>Start the server from the <code>frise</code> folder:</p>
    <pre>python serveur.py</pre>
    <p>The browser opens at <code>http://127.0.0.1:8765</code>. Options: <code>--port 9000</code>,
    <code>--fichier other.json</code>, <code>--sans-navigateur</code> (no browser). If the port is taken, the next 9 are tried.
    Stop it with ${touche("Ctrl")} + ${touche("C")} in the terminal.</p>
    <p>All the data is in <code>dates.json</code>, the single source of truth. This is the file to keep safe (and back up).</p>
    <h4>Several timelines</h4>
    <p>The name of the open timeline is shown next to “Cinabre”, top left. A click opens the timelines menu:</p>
    <ul>
      <li>the timelines in the folder, with their number of events: click one to open it;</li>
      <li><b>New timeline</b>: a name, then <b>Create</b>; it opens empty, with the starting themes;</li>
      <li><b>Rename this timeline</b>: changes the displayed name (save afterwards);</li>
      <li><b>Export as an HTML page</b>: see below.</li>
    </ul>
    <p>Each timeline is a <code>.json</code> file in the <code>frise</code> folder, with its own backups.
    If the open timeline has unsaved changes, Cinabre offers to save them before switching.
    At startup, <code>dates.json</code> opens (or the file given with <code>--fichier</code>).</p>
    <h4>Sharing a timeline</h4>
    <p>In the timelines menu, <b>Export as an HTML page</b> downloads a single file (for example <code>history.html</code>)
    to send to anyone: it opens with a double-click in any browser, without Python or a server, even offline.
    The page is <b>read-only</b>: timeline, statistics, filter, search and popups (with sources), without the Data tab.
    It contains the timeline as displayed, unsaved changes included; to update it, export it again.
    It is in the interface language at the time of the export, with no language choice.</p>
    <h4>Language</h4>
    <p><b>FR · EN</b>, top right, switches the interface between French and English: menus, buttons, messages, Guide. At first, it follows the browser's language.
    The data is never translated (names, descriptions, groups, themes); only dates are written differently on screen
    (“- 2 334” becomes “2334 BC” in English), without changing the file. Unsaved changes are kept
    when switching language, but the undo history starts afresh. A new timeline created in English gets English starting themes.</p>
    <h4>Light or dark theme</h4>
    <p>The button next to <b>FR · EN</b> (a sun or a moon) switches the interface to a light, parchment-coloured theme, or to a dark one.
    At first it follows the computer's theme; the choice is then remembered. Group colours adapt to the theme.</p>
    <h4>Saving</h4>
    <ul>
      <li>A change is only written to the file with ${touche("Ctrl")} + ${touche("S")} or the <b>Save</b> button.</li>
      <li>Top right: <b>Unsaved changes</b> while changes remain, <b>Saved</b> when everything is written.</li>
      <li>Leaving the page with unsaved changes asks for confirmation.</li>
      <li>If the file was changed elsewhere in the meantime, saving is refused: reload the page.</li>
    </ul>
    <h4>Backups</h4>
    <p>Before overwriting the file, the server copies the previous version into <code>sauvegardes/</code>:
    always on the first save of a session, then at most one copy every 30 minutes.
    Only the last 40 copies are kept. To go back, replace <code>dates.json</code>
    with one of these copies while the server is stopped.</p>`],

  ["commencer", "Starting your timeline", `
    <p>On first launch, if there is no <code>dates.json</code> file next to <code>serveur.py</code> yet,
    Cinabre creates an empty one: the timeline is yours. To keep several timelines, use the timelines menu,
    next to “Cinabre” (see “Starting and saving”).</p>
    <h4>1. Create your groups</h4>
    <p><b>Data</b> tab, <b>Groups</b> sub-tab, <b>Add a group</b>. A group gives its colour to events.</p>
    <ul>
      <li><b>Place</b>: a country or a civilisation (Rome, China…). These are the colours of the timeline.</li>
      <li><b>Scale</b>: a level for dividing time (eon, era, period…), for special lines.
      The first scale in the list is the broadest level.</li>
    </ul>
    <p>The order of groups (arrows ↑ ↓) is the order of the left panel and of the era columns.</p>
    <p>A new timeline starts with general <b>themes</b> (Civilisations, Power and politics, Wars and conflicts, Religion and beliefs…),
    which you can rename, complete or delete in the <b>Themes</b> sub-tab.</p>
    <h4>2. Add events</h4>
    <p><b>Events</b> sub-tab, <b>Add an event</b>: a date (see “Writing a date”), a name,
    one or more places and themes, a description if you like. <b>Apply</b>, then ${touche("Ctrl")} + ${touche("S")} to save.</p>
    <h4>3. Add eras</h4>
    <p>For a known span (a reign, an empire…): <b>Periods</b> sub-tab, <b>Add a period</b>, type <b>Era</b>,
    with a start and an end. Or, from a starting event, <b>Link to an end…</b>.</p>
    <h4>4. Divide time</h4>
    <p><b>Special lines</b> (Palaeolithic, Middle Ages, Renaissance…) are periods of type <b>Special line</b>,
    attached to a group of type scale. They are shown as a band across the whole width of the timeline.</p>
    <h4>Sharing Cinabre</h4>
    <p>To give the tool to someone, just copy <code>serveur.py</code> and the <code>web/</code> folder.
    Leave out your <code>dates.json</code> and the <code>sauvegardes/</code> folder (unless you want to share your timeline):
    the person will start from an empty timeline. All they need is Python 3, nothing else to install.</p>`],

  ["frise", "The timeline", `
    <p>The timeline is vertical: <b>one line per date</b>, with all the events of that date side by side.
    When there are too many for the screen width, the line continues below (<b>Dates with many events</b> setting,
    in Data, Settings: you can also keep everything on a single line). Names that are too long are shortened;
    the full name and the description appear on hover.</p>
    <h4>Reading an event</h4>
    <table class="aide-table">
      <tr><td><span class="ev" style="--ct:#9fd3e6">Name</span></td><td>Text and background colour: the group (place).</td></tr>
      <tr><td><span class="ev limite" style="--ct:#9fd3e6">Name</span></td><td>Bold: start or end of an era of which only one bound is known.</td></tr>
      <tr><td><span class="ev regne" style="--ct:#9fd3e6">Name</span></td><td>Gold underline: start of a reign.</td></tr>
      <tr><td><span class="ev" style="--ct:#9fd3e6"><span class="etoile">★</span>Name</span></td><td>Star: an event you marked as important.</td></tr>
      <tr><td><span class="ev note" style="--ct:#9fd3e6">Name</span></td><td>Folded top corner: there is a description, visible on hover.</td></tr>
      <tr><td><span class="ev" style="--ct:#9fd3e6">Name<span class="coin-sources"></span></span></td><td>Folded bottom corner: there are sources (see “Pinned popup”).</td></tr>
      <tr><td><span class="ev limite epoque" style="--ct:#9fd3e6">Name</span></td><td>Small bar on the left: an era, with its duration bar on the right of the timeline.</td></tr>
      <tr><td><span class="ev multi" style="--ct:#f4b183;--rayures:repeating-linear-gradient(135deg, rgba(244,177,131,.12) 0 6px, rgba(159,211,230,.12) 6px 12px)">Name</span></td>
        <td>Diagonal stripes: several groups. The text takes the colour of the first; in the popup, each group is written in its colour and the left border alternates their colours.</td></tr>
    </table>
    <h4>Around the events</h4>
    <ul>
      <li><b>Special lines</b> (eons, eras, geological periods, historical periods): bands across the whole width,
      lighter for broader levels (the eon is the lightest). A diamond marks them on the axis.</li>
      <li><b>Columns on the left</b>: the span of each special line, one column per level, with its name written vertically.</li>
      <li><b>Bars on the right</b>: the span of eras. Each place has its column, but two places that do not coexist in time share the same one (ancient Egypt, which ended in 30 BC, and the Arab-Muslim world, born in 622), leaving more room for events. Hovering over a bar highlights its event, and vice versa.</li>
      <li>Each bar carries its <b>start date</b> at the top and its <b>end date</b> at the bottom (if known and if there is room).</li>
      <li>The <b>name</b> of special lines and eras is written in their bar, top to bottom. It stays in the middle
      of the visible part while you scroll the timeline: you always know which period you are in.
      If space is short, it is shortened (…); the full name is on hover.</li>
      <li><b>Reminder at the top</b>: a special line you scroll past rises to the top of the timeline and stops there, stacked under
      those of broader levels (eon, then era, then period…). The next one of the same level pushes it up as it arrives;
      a line of a broader level slides over the finer ones to its place. Everything follows the scroll, without jumps.
      By default, each line stays for about ten lines after it is passed; in Data, Settings, you can keep it
      <b>until the next one of the same level</b>: you then always see the current eon, era, period…</li>
      <li><b>Separators</b>: every 1,000 years from 5000 BC to 1000 BC, then every 100 years. They are computed, not entered.</li>
    </ul>
    <h4>Moving around</h4>
    <ul>
      <li><b>Mini-map</b> on the right (it replaces the scroll bar): click or drag to move; hovering shows the date.</li>
      <li><b>Go to</b>: year landmarks and the list of special lines.</li>
      <li><b>Search</b> (${touche("/")}): names and descriptions. Events that do not match fade out, results
      appear in white on the mini-map. ${touche("Enter")} goes to the next one, ${touche("Shift")} + ${touche("Enter")} to the previous one.
      If you type a year with no result, ${touche("Enter")} goes there.</li>
      <li>The position is remembered from one visit to the next.</li>
      <li><b>Pinned popup</b>: stay 3 seconds on an event, or double-click it. The popup no longer disappears when
      you move the mouse onto it: you can scroll a long description and click links. It grows downwards
      with the <b>sources</b> (title, link, quote). It closes when the mouse leaves it, with ${touche("Esc")} or a click elsewhere.</li>
      <li class="edition">${touche("Alt")} + click on an event, an era or a special line: open it in the <b>Data</b> tab to edit it.</li>
    </ul>`],

  ["filtre", "Filtering by place and theme", `
    <p>The left panel has three parts, each item with its number of events:</p>
    <ul>
      <li><b>Places</b> (coloured squares): they give their colour to events.</li>
      <li><b>Themes</b> (circles): the subject of the event (wars, religion, science…). Neutral, they do not change the colours of the timeline;
      you see them in the popup and in the tables. An event can have several.</li>
      <li><b>Scales</b>: the levels of special lines (eon, era…).</li>
    </ul>
    <p>The filter applies to the timeline, the statistics and the data tables at once.</p>
    <ul>
      <li>A click shows only this item; further clicks add or remove others.</li>
      <li>Places and themes combine: <b>Rome</b> + <b>Wars and conflicts</b> shows the wars of Rome.
      Within one part, choices add up: Rome + Greece shows both.</li>
      <li>${touche("Alt")} + click isolates a group (or shows everything again if it was alone).</li>
      <li><b>Show all</b> removes the filter.</li>
      <li>“No group” and “No theme” gather what has no place or theme yet.</li>
      <li>Hovering over a place, a theme or a scale shows its <b>description</b> (what it covers), its number of items
      and a few <b>examples</b> picked at random, different on each hover.</li>
      <li>The filter is remembered from one visit to the next.</li>
      <li><b>‹</b>, to the right of the “Filter” title, collapses the panel into a thin strip (handy on a small screen); a click on the strip reopens it.
      A red dot on the strip reminds you that a filter is active. On a narrow screen, the panel starts collapsed.</li>
    </ul>`],

  ["stats", "Statistics", `
    <p>A stacked bar chart: for each range of years, the number of events of each group.</p>
    <ul>
      <li>By default, from the first date of the timeline (5000 BC at the earliest) to the last, in ranges of 1, 5, 10, 25, 100, 500 or 1,000 years:
      the finest that gives no more than 80 bars (centuries for a world history, years for a revolution).</li>
      <li class="edition">You can choose your own <b>spans</b> in Data, Settings (“Change the ranges” link at the top right):
      each span goes from one year to another, in ranges of a chosen length (500 years, 100 years, 10 years, 1 year…). For example
      from 5000 BC to 1001 BC by 500 years, then from 1000 BC to 1999 by 100 years. Spans follow each other without overlapping;
      “Back to the default setting” clears them.</li>
      <li>When the ranges do not all have the same length, heights only compare at equal length: a bracket under the axis
      gives the length of the ranges of each span.</li>
      <li>An era counts at its start year. An event with several groups counts once, in its first displayed group.</li>
      <li>Events outside the spans are not counted; their number is shown at the top.</li>
      <li>Hovering over a segment gives the group, the range and the number. Clicking a bar opens the timeline at the start of the range.</li>
      <li>The filter in the left panel removes groups from the stack.</li>
    </ul>`],

  ["jeu", "Game", `
    <p>The <b>Game</b> tab offers “the timeline that builds itself”: put events of the timeline back in order, one by one.</p>
    <ul>
      <li>Before starting, choose the <b>places</b> and <b>themes</b> in play with the filter in the left panel
      (everything by default), a <b>range of years</b> (the whole timeline by default) and whether to <b>show the descriptions</b>.
      The number of events in play is shown.</li>
      <li>A first event is laid down, with its date. The next ones arrive one by one, without a date: click the slot
      where it belongs, before, between or after those already laid down (or with the keyboard: ${touche("↑")} ${touche("↓")} choose the slot, ${touche("Enter")} lays the event there).</li>
      <li>Well placed, it takes its place; misplaced, it is laid at its true place and you lose a life (3 in all).
      The game ends with no lives left, or when everything is placed.</li>
      <li>Two events with the same date can be placed in either order. Until an event is placed,
      the dates and numbers in its name and description are hidden under a block.</li>
      <li>Hovering over a laid event shows its usual popup.</li>
    </ul>`],

  ["donnees", "Editing the data", `
    <p>The <b>Data</b> tab has six sub-tabs: <b>Events</b>, <b>Periods</b>, <b>Groups</b>, <b>Themes</b>, <b>To check</b>
    and <b>Settings</b> (settings of the open timeline: display of dates, see “Writing a date”, and ranges of the statistics<span class="si-jeu">, game</span>).</p>
    <ul>
      <li>Click a column heading to sort. Sorting on the ★ column puts important items first.</li>
      <li>Clicking the star ☆ at the start of a row marks the event or period as <b>important</b> (★);
      a second click removes it. It is a change like any other: to be saved, and undoable.</li>
      <li>${touche("Alt")} + click on an event or a period: go back to the timeline, on that item (outlined in red for a moment).</li>
      <li>The search at the top filters the tables as you type, on titles and descriptions, and highlights matches
      (ignoring accents and case).</li>
      <li>Clicking a row opens its detail on the right; ${touche("↑")} ${touche("↓")} move to the previous or next row.
      Changes apply <b>as you type</b> (text after a short pause, a box or a group immediately);
      then save the timeline (${touche("Ctrl")} + ${touche("S")}). <b>Undo</b> reverts a whole entry in a field.
      An invalid entry (date not understood, empty name…) is flagged and not applied: you cannot change row
      until it is fixed, so as not to lose it (${touche("Esc")} discards it). For a new item, the <b>Add</b> button creates it.</li>
      <li>${touche("Esc")} (or ×) closes the detail but keeps the row selected: ${touche("↑")} ${touche("↓")} then move the selection,
      and ${touche("Enter")} reopens the detail.</li>
      <li><b>Delete</b> asks for a second click to confirm; the next row then opens.</li>
      <li><b>Undo</b> (or ${touche("Ctrl")} + ${touche("Z")} outside a field) goes back, one change at a time.</li>
      <li>The buttons at the top right add an event, a period or a group; <b>Add several</b> adds a whole series at once (see below).</li>
    </ul>
    <h4>Editing several rows at once</h4>
    <ul>
      <li>In the Events and Periods tables, tick the box at the start of the rows to change. ${touche("Shift")} + click ticks a whole range;
      the box in the heading ticks all displayed rows (handy after a search or with the filter).</li>
      <li>While rows are ticked, clicking a row ticks or unticks it, and the right panel becomes <b>Bulk edit</b>:
        <ul>
          <li>clicking a <b>group</b> or a <b>theme</b> adds it to all ticked rows; if it is already on all of them, the click removes it
          (“3/12”: it is only on 3 of the 12 rows); an added group comes last, so the colour does not change;</li>
          <li><b>★ Important</b> and <b>Approximate date</b> are set or removed everywhere (half-filled box: only on some rows);</li>
          <li><b>Delete</b> removes all ticked rows, after a second click to confirm.</li>
        </ul></li>
      <li>Each change applies immediately, and <b>Undo</b> reverts it in one go. <b>Untick all</b> (or ${touche("Esc")}) closes the panel.</li>
      <li>With the keyboard, while rows are ticked: ${touche("↑")} ${touche("↓")} move from row to row (a mark on the left shows the current row),
      ${touche("Space")} ticks or unticks it, ${touche("Shift")} + ${touche("↑")} ${touche("↓")} tick as you go.</li>
      <li>Ticked rows stay ticked if a search hides them: the panel says how many are hidden.</li>
    </ul>
    <h4>Event</h4>
    <ul>
      <li><b>Date</b>: the text shown in the timeline (see “Writing a date”). The understood year is shown below.
      Changing the date moves the event to the right line.</li>
      <li><b>Groups</b>: click a group below to add it, on × to remove it. The first gives the text colour;
      clicking another chosen group puts it first.</li>
      <li><b>Themes</b>: click a theme to add or remove it; you can choose several.</li>
      <li><b>Start or end of an era</b> and <b>Start of reign</b>: the bold and gold codes of the timeline.</li>
      <li><b>★ Important</b>: adds a small star before the name in the timeline (same as the star in the table).</li>
      <li><b>Show in timeline</b> opens the timeline on this event (like ${touche("Alt")} + click on its row).</li>
    </ul>
    <h4>Sources</h4>
    <p>In the form, <b>+ Add a source</b>: a title, a link and a quote, all optional. You can add as many as you like.
    A link without “https://” is completed. Sources appear in the pinned popup and are signalled by a corner at the bottom right of the event.</p>
    <h4>Adding several items at once</h4>
    <p><b>Add several</b>, then one line per event: <b>date | name | groups and themes | description</b>.</p>
    <pre>1453 | Fall of Constantinople | Rome, Arab-Muslim World | The city is taken by Mehmed II.
~ 2350 BC | Sargon of Akkad | Mesopotamia
2685 BC → 2180 BC | Old Kingdom | Ancient Egypt | The age of the pyramids.</pre>
    <ul>
      <li>Only the date and the name are required. In the 3rd column, places and themes are mixed, separated by commas:
      “Rome, Wars and conflicts”. Accents and case do not matter.</li>
      <li>“~”, “circa” or “about”: approximate date. Two dates “start → end”: an era.</li>
      <li>A preview shows what was understood; rows in red (date not understood, unknown group…) must be fixed before adding.
      A “!” flags an item that may already exist.</li>
      <li>You can also paste JSON (<b>JSON template</b> button), which also allows the star, the reign, sources…
      French or English keys are accepted (<code>nom</code> or <code>name</code>, <code>groupes</code> or <code>groups</code>…).</li>
      <li>The whole addition is undone in one go with <b>Undo</b>.</li>
    </ul>
    <h4>Turning an event into the start of an era</h4>
    <p>Two ways:</p>
    <ul>
      <li>Choose <b>Start of era</b> in the “Start or end of an era” field, then <b>Apply</b>. The event turns bold
      and joins the “Era starts without an end” list in the <b>To check</b> tab.</li>
      <li>Better, if you know the end: <b>Link to an end…</b>. Choose the end event, or enter a date.
      An <b>era</b> is created, with its duration bar in the timeline; the start event is removed from the dates.
      The end event is only removed if the box is ticked (it is by default for an “end of era”).
      When an end has the same name (“End of Empire X” for “Start of Empire X”), it is offered first.</li>
    </ul>
    <h4>Period</h4>
    <ul>
      <li><b>Era</b>: two known bounds, duration bar in the column of its place.</li>
      <li><b>Special line</b>: eon, era, geological or historical period; band across the whole width.
      Empty end = unknown (the line lasts until the next one of the same group); “today” is accepted.</li>
      <li><b>Inferred start</b>: a provisional start, to be confirmed; the date appears in italics in the timeline, and the box is unticked as soon as you correct the start.</li>
    </ul>
    <h4>Groups</h4>
    <ul>
      <li><b>Rename</b>: the new name replaces the old one everywhere.</li>
      <li><b>Description</b>: what the group covers; it is shown on hover in the left panel.</li>
      <li><b>Colour</b>: choose it as for a white background; it is adapted to the theme, light or dark, on screen, and the preview shows how it looks on the timeline.
      Two places can have similar colours if they are not from the same period.</li>
      <li><b>Order</b>: arrows ↑ ↓; this is the order of the left panel and of the era columns.
      For scales, it is also the <b>hierarchy of special lines</b>: the first scale is the broadest level (level 1),
      the next ones finer and finer; the table shows it (“Scale · level 2”). A special line's level is that of its group.</li>
      <li><b>Delete</b>: its events move to the chosen group, or end up with no group.</li>
    </ul>
    <h4>Themes</h4>
    <ul>
      <li>Each theme has a <b>description</b>, shown on hover in the left panel.</li>
      <li><b>Add a theme</b>, <b>rename</b> it (the new name replaces the old one everywhere), <b>delete</b> it
      (it is removed from events, which remain), and <b>reorder</b> them with ↑ ↓: this is the order of the left panel.</li>
    </ul>
    <h4>To check</h4>
    <p>Lists what deserves a correction: era starts without an end (with a <b>Link to an end</b> button), isolated ends,
    special lines with an inferred start, events without a group, events and eras without a theme, dates not understood, eras whose end precedes their start,
    names that are too long (over 50 characters, cut short in the timeline) and duplicate names.</p>`],

  ["dates", "Writing a date", `
    <p>Write the date as it should be displayed; the application works out the year to place and sort it.</p>
    <table class="aide-table">
      <tr><th>Input</th><th>Meaning</th></tr>
      <tr><td>1453</td><td>the year 1453</td></tr>
      <tr><td>July 1789</td><td>July 1789 (date precise to the month)</td></tr>
      <tr><td>14 July 1789, July 14, 1789 &nbsp;or&nbsp; 14/07/1789</td><td>14 July 1789 (date precise to the day)</td></tr>
      <tr><td>2334 BC &nbsp;or&nbsp; -2334</td><td>2334 BC</td></tr>
      <tr><td>2334 BCE, - 2 334, 2334 av. J.-C.</td><td>same</td></tr>
      <tr><td>45k</td><td>45,000 years ago</td></tr>
      <tr><td>540 Ma</td><td>540 million years ago</td></tr>
      <tr><td>2.9 Ga</td><td>2.9 billion years ago</td></tr>
      <tr><td>~ 1200, circa 1200</td><td>1200, approximate date (see below)</td></tr>
      <tr><td>today</td><td>for the end of a period only</td></tr>
    </table>
    <p>Dates are stored as written. On screen, they follow the interface language: “- 2 334” is shown “2334 BC” in English,
    and “2334 BC” is shown “- 2 334” in French. Ga, Ma and k stay as they are.</p>
    <h4>Dates precise to the month or the day</h4>
    <p>A date can be precise to the year, the month or the day. Months are written in full, abbreviated (“Sep 1792”) or in French.
    Precise dates are sorted in order, and a special line starting on 21 September is placed between the 20th and the 22nd.
    In the date column they are abbreviated (“14 Jul 1789”). An impossible day (31 February) is not understood.</p>
    <p>In the <b>Data</b> tab, <b>Settings</b> sub-tab, choose how the timeline shows precise dates:</p>
    <ul>
      <li><b>One line per year</b>: the events of the year sit side by side on the “1789” line, with the day and month in small type before the name (“14 Jul”);</li>
      <li><b>One line per month</b>: the events of the month sit side by side on the “Jul 1789” line, with the day in small type before the name;</li>
      <li><b>One line per day</b> (default): each date has its own line.</li>
    </ul>
    <p>A special line that starts during the year or the month splits the line in two, to stay in its place.</p>
    <p>Also in <b>Settings</b>, <b>Date detail in events</b> chooses what is written in small type before the name:
    on a year line, nothing, the month (default) or the day and month; on a month line, nothing or the day (default).</p>
    <p>This setting is saved in the timeline's file; it does not change the dates themselves.
    The duration of a period with precise dates is shown in days or months when it is short (Hundred Days: 4 months).</p>
    <h4>Approximate date</h4>
    <p>Tick <b>Approximate</b> next to the date of an event, or under the start or end of a period.
    Typing “~”, “circa” or “about” before the date ticks the box by itself. The date stays at its year, and is shown
    preceded by “~”: in the timeline (if everything on the line is approximate), on era bars, in popups and in tables.</p>
    <p>“45k” is placed at 45,000 BC, without a “before present” correction: this is deliberate, to keep the order.
    Two events of the same year share the same line.</p>`],

  ["raccourcis", "Keyboard shortcuts", `
    <table class="aide-table">
      <tr><td>${touche("1")} ${touche("2")} ${touche("3")} ${touche("4")}</td><td>Timeline, Statistics, Data, Guide</td></tr>
      <tr class="si-jeu"><td>${touche("5")}</td><td>Game</td></tr>
      <tr><td>${touche("/")}</td><td>Search</td></tr>
      <tr><td>${touche("Enter")} / ${touche("Shift")} + ${touche("Enter")}</td><td>Timeline: next or previous result, or go to the typed year</td></tr>
      <tr><td>${touche("Esc")}</td><td>Close the popup, the menu or the form; in a search field, clear it</td></tr>
      <tr><td>${touche("Ctrl")} + ${touche("S")}</td><td>Save to <code>dates.json</code></td></tr>
      <tr><td>${touche("Ctrl")} + ${touche("Z")}</td><td>Undo the last change (outside an input field)</td></tr>
      <tr><td>${touche("Enter")} in a form</td><td>Apply at once; for a new item, add it</td></tr>
      <tr><td>${touche("↑")} ${touche("↓")} in Data</td><td>Previous or next row (its detail opens)</td></tr>
      <tr><td>${touche("↑")} ${touche("↓")}, ${touche("Space")} in Data, with rows ticked</td><td>Move from row to row, tick or untick (${touche("Shift")} + arrow: tick as you go)</td></tr>
      <tr><td>${touche("Alt")} + click on the timeline</td><td>Open the item in the Data tab</td></tr>
      <tr><td>${touche("Alt")} + click in Data</td><td>Go back to the timeline, on that item</td></tr>
      <tr><td>${touche("Alt")} + click on a place or a theme</td><td>Isolate it in the filter</td></tr>
      <tr><td>Double-click on an event, or 3 s of hovering</td><td>Pin the popup (sources, clickable links)</td></tr>
    </table>`],

  ["vocabulaire", "Vocabulary", `
    <dl>
      <dt>Event</dt><dd>A dated fact, on a line of the timeline.</dd>
      <dt>Era</dt><dd>A span whose start and end are known (dynasty, empire…): vertical bar on the right of the timeline.</dd>
      <dt>Start or end of an era</dt><dd>A bold event that marks a single bound; to be linked to the other once known.</dd>
      <dt>Important</dt><dd>An event or period marked with a star ★, to spot it at a glance. An era created by “Link to an end” keeps the star of its start.</dd>
      <dt>Special line</dt><dd>An eon, an era, a geological or historical period: a band across the whole width.</dd>
      <dt>Group</dt><dd>A <b>place</b> (Rome, China…) or a <b>scale</b> (eon, era…). It gives the colour.</dd>
      <dt>Theme</dt><dd>The subject of an event (Wars and conflicts, Religion and beliefs…), independent of the place. No colour; used for filtering.</dd>
      <dt>Inferred start</dt><dd>A provisional start of a special line, for lack of anything better: to be checked.</dd>
    </dl>`],
];

export const LECTURE = [
  ["lecture", "This page", `
    <p>This page is a timeline exported from <b>Cinabre</b>: the complete application, <b>read-only</b>. It opens in any
    browser, with nothing to install, and works offline, with its fonts.</p>
    <ul>
      <li><b>Timeline</b>: one line per date, from the oldest to the most recent; eras are the vertical bars on the right.</li>
      <li><b>Statistics</b>: the number of events per range of years and per place.</li>
      <li><b>Data</b>: the tables of events, periods, groups and themes, to sort and browse; clicking a row opens its record.</li>
      <li>Hovering over an item shows its description; after 3 seconds, or with a double-click, the popup stays open and shows the sources.</li>
      <li>The left panel filters by place and theme; the search (${touche("/")}) covers names and descriptions.</li>
    </ul>
    <p>Nothing can be changed here: the data is as of the day of the export. The following sections describe the whole
    application, including how to edit a timeline, which is only possible in Cinabre installed on one's computer.</p>`],
];
