# Prisme Fusion

Jeu mobile idle / fusion, en un seul fichier HTML. Version jouable : `index.html`
(servie par GitHub Pages).

- `src/` : sources assemblées par `build7.py` → `prisme.html` (artifact) et `wrapped.html` (page autonome = `index.html`).
- `tests/` : tests Playwright (`test7.js`, `t7lang.js`, `t7old.js`, `t7net.js`) et simulateur d'économie (`sim7.js`).
- Serveur : Supabase (RPC `pf_*`). La clé embarquée dans le client est la clé publique ; toutes les règles anti-triche sont côté serveur.
