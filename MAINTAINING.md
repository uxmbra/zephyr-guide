# Maintaining the Zephyr guide

A static guide site. Everything the public sees is in `dist/`: HTML, CSS and JS for the interface, JSON in `dist/data/` for the content and screenshots in `dist/images/`.

## Updating the live site

1. Change the JSON in `dist/data/`, add screenshots to `dist/images/`, or edit the interface files in `dist/`. (To edit data in the browser, open the guide with `?edit` on the end of the address, use **Manage guide data**, and export the file into `dist/data/`.)
2. Open a pull request against `main`. Merging it publishes the change.

The live site at https://uxmbra.github.io/zephyr-guide/ updates about a minute after a merge to `main`. GitHub runs the tests first; if they fail, the live site stays as it was and the failure shows on the repository's Actions tab.

### If something goes wrong

- **Tests failed:** read the first failing test's message, fix the file it names, and push again. Nothing was published.
- **The site didn't change:** open the Actions tab and check the latest "Publish guide" run, then hard-refresh the site with Ctrl+F5.
- **Changed a CSS or JS file:** raise the `?v=` number everywhere that file is named (for example `theme.css?v=2` to `theme.css?v=3`) so visitors' browsers fetch the new file instead of a cached copy. `core.js` and `business.js` are named in `dist/index.html` and in the `import` lines of the scripts that use them; the tests fail if the numbers disagree.
- **Checking new data on the live site:** refresh the page. Data files are re-checked on every visit, so no version number is needed for them. The **Reload data** button only shows in `?edit` mode.

## What's new (the changelog)

The **What's new** button on the site lists changes from `dist/data/changelog.json`, newest first. Visitors see a badge with the number of entries they have not opened yet, so every change to the guide should get an entry:

- From a terminal: `node scripts/add-change.mjs "Add the Cayo 12 Gauge recipe" "Costs 40 casings"` (the title first, then one argument per note).
- Or edit the file by hand. Each entry has a unique `id`, a `date` written `YYYY-MM-DD`, a `title` players will read, and optional `notes`. Keep the list newest first; the tests check all of this.

Write entries for players, not for the code: say what they can now do or find, and where.

## Images

Save screenshots as WebP, around 1600 px wide and under 1.5 MB. The tests refuse anything larger, and flag an image that no location, bench or guide points at. Reference images from the JSON as `images/<name>.webp`.

Every photo also needs a small copy in `dist/images/thumbs/`, which is what pages show until a photo is enlarged. After adding or removing photos, run:

    python3 scripts/make-thumbs.py

It adds the thumbnails that are missing and removes ones whose photo is gone (it needs Pillow: `python3 -m pip install Pillow`). Add `--all` to remake every thumbnail, which is only needed after replacing a photo under the same filename. The tests fail, and name this command, if a thumbnail is missing. The JSON still points at the full photo; the guide works out the thumbnail's address itself.

## Links to pages

Every page has its own address, so links can point straight at a recipe, tier, guide or location:

- `#home`, or no address at all — the home page
- `#smelting/smelting-brass` — a recipe (the section, then the recipe ID)
- `#weapons/tier-2` or `#ammo/cayo` — a weapon tier or ammo method
- `#substances/cocaine`, `#gathering/scrap-yard`, `#heist-guides/<guide-id>` — a written guide
- `#locations/smelter-174` — one entry on the Locations page
- `#materials/steel` — one material on the Materials page (the item ID)
- `#plan` — the visitor's own crafting plan
- `#plan/ammo-9mm.600_weapon-vector.1` — a shared plan: each recipe ID, a dot and the amount, joined by underscores. **Copy plan link** writes these.

An unknown ID falls back to the section it names, and an unknown section falls back to the home page.

An address that is not part of the site at all (say `…/zephyr-guide/smelting`, without the `#`) gets `dist/404.html` from GitHub Pages, which sends the visitor on to the guide with the last word as the section. It holds the guide's full address, so if the site ever moves to another address, change it there and in the `og:url` line of `index.html` together (the tests check they match).

## Home page

The home page is built from the data, so its figures, section cards and latest changes keep themselves current. The one thing it needs from you: when you add a **new category** to `guide.json`, add a line about it to `SECTION_NOTES` in `dist/core.js`, which is the sentence shown on its card. The tests fail, and say so, if a category has no line. To move a card between the Crafting, Guides and Reference groups, edit `HOME_GROUPS` just below it; a category that no group names is shown under Crafting.

## Loading speed

The first lines of `dist/index.html` ask for `guide.json` and each category file while the stylesheets and scripts are still downloading, and `app.js` picks the answers up from `window.guideData`. Nothing needs doing when data changes. If you ever rename the `data/` folder or change how files are fetched in `load()` in `app.js`, change that small script to match.

When rewriting the address in `app.js`, always pass `history.state` to `history.replaceState` rather than `null`: the state names the visitor's stop in the tab's history, which is how Back, Forward and refresh return to the same spot on the page.

## Offline copy

`dist/sw.js` saves the guide on a visitor's device after their first visit, so it opens with no connection. It needs no upkeep: it reads the list of files to save from `index.html` and `guide.json`, always fetches the page and the data fresh when there is a connection, and treats any file named with a `?v=` number as unchanging (one more reason to raise that number when a CSS or JS file changes). If saved copies ever need to be thrown away for everyone, change the `CACHE` name at the top of the file.

## Materials page

The **Materials** page is built from the recipes, so it needs no upkeep: every item in `guide.json` appears with the recipes that use it. A material shows a "how to get it" link when a recipe names it as its `outputItemId` (the smelting recipes do).

The same `outputItemId` is what lets a crafting plan be broken down to raw materials: any material that a recipe produces is replaced by that recipe's ingredients. A new smelting recipe joins in as soon as it has an `outputItemId`.

## Player prices

The **Prices** page lists what players pay each other. It has a **Clean** and a **Dirty** tab (`#prices/clean`, `#prices/dirty`), and each tab groups its prices under Materials, Guns, Ammo, BP's and Drugs (the list is `PRICE_CATEGORIES` in `dist/core.js`). The prices live in the `playerPrices` list in `dist/data/guide.json`. The Clean tab also lists every material with a `sellPrice`, marked "Not known yet" until it has a player price, so the two can be compared.

Each entry names exactly one thing:

- `"itemId": "steel"` for a material in `items`. It goes under Materials, links to its Materials page, and shows its sell price beside the clean price.
- `"recipeId": "weapon-vector"` for anything the guide crafts. It takes the recipe's name. Weapons go under Guns, ammo under Ammo and substances under Drugs; anything else needs a `"category"`.
- `"id": "vector-bp", "name": "Vector BP", "category": "blueprints"` for anything else.

Then a `"clean"` price, a `"dirty"` price, or both: whole dollars, either one number (`200`) or a range (`[40, 60]`). `"category"` is one of `materials`, `guns`, `ammo`, `blueprints` or `drugs`, and can be given on any entry to move it. Optional: `"unit"` (defaults to "each", for example `"per brick"`), `"notes"`, and `"updated"` written `YYYY-MM-DD`, shown as "Checked …". For example:

    "playerPrices": [
      {"itemId": "steel", "clean": [40, 60], "dirty": 35, "updated": "2026-11-23"},
      {"recipeId": "weapon-vector", "dirty": 15000, "notes": "Less with your own attachments"},
      {"id": "vector-bp", "name": "Vector BP", "category": "blueprints", "dirty": [50000, 60000]},
      {"id": "fresh-cocaine-brick", "name": "Fresh Cocaine Brick", "category": "drugs", "dirty": 900, "unit": "per brick"}
    ]

The tests refuse an unknown material or recipe, a missing or unknown category, an entry listed twice, a price that is not whole dollars, and any field not named above. Priced entries also show up in search, and a material's page shows "players pay … clean/dirty" with a link to its row.

## Link previews, icons and the font

- `dist/social-card.jpg` is the picture Discord and other apps show when the guide's link is posted. The address of the live site is written into the `og:` tags in `dist/index.html`; change it there if the site ever moves.
- `dist/manifest.webmanifest` and `dist/icons/` let phones add the guide to the home screen with its own icon.
- The typeface is served from `dist/fonts/` (with its licence beside it), so the guide does not load anything from another site.

## Themes

The **Theme** button offers the looks listed in `THEMES` in `dist/core.js`. Each one is a block in `dist/theme.css` such as `[data-theme=nord]{...}` that sets about twenty base colours (`--bg`, `--panel`, `--accent`, `--gold` and so on); every tint, border and shadow is derived from those, so the rest of the stylesheet never names a colour.

- To add a theme, copy a block, give it a new id, and add a line to `THEMES` with the same id and its `--sidebar` colour. The tests check that the two lists match.
- When writing new styles, use `var(--…)` rather than a colour code. The tests refuse a hard-coded colour, because it would look wrong in every other theme.

## Running the tests

    node --test tests/*.test.mjs
