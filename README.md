# DaZ-Alex

Interactive German exercises for tutoring 5th graders (Deutsch als Zweitsprache). German only, light yellow and dyslexia-friendly, no accounts, nothing is saved.

Rules and plan: [CLAUDE.md](CLAUDE.md) · Look and feel: [docs/STYLE.md](docs/STYLE.md)

```
npm install            # once
npm run dev            # start the app locally
npm run build          # build the static site into dist/
npm test               # automatic tests
npm run check-content  # check the lesson files in content/
```

Lessons are YAML files in `content/trainings/`. Hosting: Cloudflare Pages project `daz-alex`.
