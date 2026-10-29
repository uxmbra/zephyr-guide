# Maintaining the Zephyr guide

A static guide site. Everything the public sees is in `dist/`: HTML, CSS and JS for the interface, JSON in `dist/data/` for the content and screenshots in `dist/images/`.

## Updating the live site

1. Edit the JSON in `dist/data/` (or open the guide with `?edit` on the end of the address, use **Manage guide data**, and export the file into `dist/data/`), and add screenshots to `dist/images/`.
2. Preview locally: double-click `Start Guide.cmd` and open http://127.0.0.1:4173.
3. Double-click `Publish Guide.cmd`. It gets the latest version from GitHub, lists your changes, runs the tests, asks for a short description, then commits and pushes.

The live site at https://uxmbra.github.io/zephyr-guide/ updates about a minute after a push. GitHub runs the tests again before publishing; if they fail, the live site stays as it was and the failure shows on the repository's Actions tab.

### Doing it by hand

From this folder in Git Bash:

    git pull --rebase origin main
    git add -A
    git commit -m "What changed"
    git push

### If something goes wrong

- **Tests failed:** read the first failing test's message, fix the JSON it names, and run the publish again. Nothing was published.
- **Push rejected or sign-in prompt:** sign in to GitHub in the browser window that opens, then run the publish again.
- **A conflict while getting the latest version:** this only happens if the same file was changed on GitHub and on your PC. Run `git rebase --abort`, then ask for help before publishing.
- **The site didn't change:** open the Actions tab and check the latest "Publish guide" run, then hard-refresh the site with Ctrl+F5.
- **Changed a CSS or JS file:** raise the `?v=` number on its link in `dist/index.html` (for example `theme.css?v=2` to `theme.css?v=3`) so visitors' browsers fetch the new file instead of a cached copy.

## Running the tests

    node --test tests/*.test.mjs
