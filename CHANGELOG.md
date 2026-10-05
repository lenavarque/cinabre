# Changelog

Notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and version numbers follow [semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- Places on two levels, if you wish: a place can be filed under another one (France within Europe). Choosing the larger
  place in the filter also shows the smaller ones. In the settings, sub-places can be collapsed in the panel, and the
  statistics can stack them in their parent's colour or on their own.
- A JSON block at the bottom of each event or period form, to edit it as JSON or copy it into another timeline
  (paste it in "Add several"). Ticked rows can be copied as JSON in one go. "Add several" now accepts special lines
  (`"type": "section"`).

### Changed

- The filter, the position in the timeline and the expanded places are remembered for each timeline separately.
- Era bars take at most about a third of the width. When there are too many at once, eras marked ★, then the longest
  ones, keep their bar; the others keep their label, and their number is shown at the top.
- "Link to an end" offers every later event that has the start's place among its places, not only as its first place
  (up to 300 suggestions).

- The documentation is in English, and the example pages are published in English (French under `/fr/`).
- The interface follows the browser's language on first visit (French if the browser is in French, English otherwise).

### Fixed

- Much faster drawing of timelines with many eras.
- The number on the "To check" tab now follows the filter and the search, like the list it announces; the list says
  how many items they hide.

## [0.1.0] - 2026-09-29

First published version.

### Added

- Vertical timeline, one line per date: events, eras as ribbons, special lines (eons, eras, periods), minimap,
  "Go to" menu, reminder of the special lines at the top of the screen.
- Filter by place and theme, search in names and descriptions.
- Statistics: events per range of years and per place, with adjustable spans and ranges.
- Data tab: tables, records saved as you type, undo, bulk editing, adding many events at once (text or JSON),
  "Link to an end", a list of points to check, timeline settings.
- Dates to the year, month or day, approximate or not, from billions of years ago to today.
- Several timelines per folder, automatic backup copies.
- Export of a timeline as a standalone HTML page: the complete application, read-only (frozen data).
- French or English interface, light or dark theme, built-in guide.
- Optional game: put events back in order.
