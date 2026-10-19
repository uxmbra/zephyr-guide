# Zephyr RP — City Field Guide

A static guide site. Everything the public sees is in `dist/`: HTML, CSS and JS for the interface, JSON in `dist/data/` for the content and screenshots in `dist/images/`.

## Updating the live site

1. Edit the JSON in `dist/data/` (or use **Manage guide data** in the guide and export the file into `dist/data/`), and add screenshots to `dist/images/`.
2. Preview locally: double-click `Start Guide.cmd` and open http://127.0.0.1:4173.
3. Commit and push to `main`.

Each push to `main` runs the tests and, if they pass, publishes `dist/` to GitHub Pages. If the tests fail, the live site stays as it was; the failure shows on the repository's Actions tab.

## Running the tests

    node --test tests/*.test.mjs
