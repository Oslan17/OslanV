# Personal Brand — Software & AI Consulting

Simple static site based on Material Design (Materialize CSS) to present software, automation, and AI services.

## Structure

- `index.html`: main page
- `assets/css/styles.css`: custom styles
- `assets/js/main.js`: init and dark mode
- `404.html`: GitHub Pages friendly

## Deploy on GitHub Pages

Option A — User/Org repository (for your primary site):

1. Create a repo named `YOUR-USER.github.io`.
2. Push this project content to the repo root.
3. Enable Pages: Settings → Pages → Source: `Deploy from a branch`, Branch: `main` (or `master`), folder `/`.
4. It will publish at `https://YOUR-USER.github.io`.

Option B — Project repository:

1. Use any repo name (e.g., `personal-brand`).
2. Enable Pages: Settings → Pages → Source: `Deploy from a branch`, Branch: `main`, folder `/`.
3. URL will be `https://YOUR-USER.github.io/REPO-NAME/`.

### Quick commands

```bash
git init
git add .
git commit -m "feat: personal brand site (Material Design)"
git branch -M main
git remote add origin git@github.com:YOUR-USER/YOUR-REPO.git
git push -u origin main
```

## Customize

- Replace social links, email, WhatsApp, and project repos in `index.html`.
- Swap images for yours (you can place them in `assets/img/`).
- Edit colors and styles in `assets/css/styles.css`.
- Dark mode preference is persisted in `localStorage`.

## Credits

- [Materialize CSS](https://materializecss.com/)
- Illustrative photos from Unsplash
