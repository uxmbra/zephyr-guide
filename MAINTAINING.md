# Maintaining the Zephyr guide

A static guide site. Everything the public sees is in `dist/`: HTML, CSS and JS for the interface, JSON in `dist/data/` for the content and screenshots in `dist/images/`.

## Updating the live site

1. Change the JSON in `dist/data/`, add screenshots to `dist/images/`, or edit the interface files in `dist/`. (To edit data in the browser, open the guide with `?edit` on the end of the address, use **Manage guide data**, and export the file into `dist/data/`.)
2. Open a pull request against `main`. Merging it publishes the change.

The live site at https://uxmbra.github.io/zephyr-guide/ updates about a minute after a merge to `main`. GitHub runs the tests first; if they fail, the live site stays as it was and the failure shows on the repository's Actions tab.

### If something goes wrong

- **Tests failed:** read the first failing test's message, fix the file it names, and push again. Nothing was published.
- **The site didn't change:** open the Actions tab and check the latest "Publish guide" run, then hard-refresh the site with Ctrl+F5.
- **Changed a CSS or JS file:** raise the `?v=` number on its link in `dist/index.html` (for example `theme.css?v=2` to `theme.css?v=3`) so visitors' browsers fetch the new file instead of a cached copy.

## What's new (the changelog)

The **What's new** button on the site lists changes from `dist/data/changelog.json`, newest first. Visitors see a badge with the number of entries they have not opened yet, so every change to the guide should get an entry:

- From a terminal: `node scripts/add-change.mjs "Add the Cayo 12 Gauge recipe" "Costs 40 casings"` (the title first, then one argument per note).
- Or edit the file by hand. Each entry has a unique `id`, a `date` written `YYYY-MM-DD`, a `title` players will read, and optional `notes`. Keep the list newest first; the tests check all of this.

Write entries for players, not for the code: say what they can now do or find, and where.

## Images

Save screenshots as WebP, around 1600 px wide and under 1.5 MB. The tests refuse anything larger, and flag an image that no location, bench or guide points at. Reference images from the JSON as `images/<name>.webp`.

## Links to pages

Every page has its own address, so links can point straight at a recipe, tier, guide or location:

- `#smelting/smelting-brass` — a recipe (the section, then the recipe ID)
- `#weapons/tier-2` or `#ammo/cayo` — a weapon tier or ammo method
- `#substances/cocaine`, `#gathering/scrap-yard`, `#heist-guides/<guide-id>` — a written guide
- `#locations/smelter-174` — one entry on the Locations page

An unknown ID falls back to the section it names, and an unknown section falls back to the first one.

## Themes

The **Theme** button offers the looks listed in `THEMES` in `dist/core.js`. Each one is a block in `dist/theme.css` such as `[data-theme=nord]{...}` that sets about twenty base colours (`--bg`, `--panel`, `--accent`, `--gold` and so on); every tint, border and shadow is derived from those, so the rest of the stylesheet never names a colour.

- To add a theme, copy a block, give it a new id, and add a line to `THEMES` with the same id and its `--sidebar` colour. The tests check that the two lists match.
- When writing new styles, use `var(--…)` rather than a colour code. The tests refuse a hard-coded colour, because it would look wrong in every other theme.

## Running the tests

    node --test tests/*.test.mjs
