# Site fictif d'avocat (démonstration)

Site vitrine d'un cabinet d'avocat **fictif**, « Maître Baptiste Sandoz », pour montrer ce que Baptiste Sandoz peut réaliser pour un cabinet. Baptiste Sandoz n'est pas avocat : le site le dit dans le bandeau du haut, le pied de page, les mentions légales et le titre de la page.

- Une page : le cabinet (haut de page avec illustration), mon parcours, trois domaines d'intervention numérotés, contact (téléphone, e-mail, adresse, horaires).
- Pages `/mentions-legales` et `/confidentialite`.
- Coordonnées fictives : téléphone dans une tranche réservée à la fiction par l'Arcep, e-mail en `example.com` (domaine réservé), adresse marquée « fictive ».
- Jamais indexé : balise `robots`, en-tête `X-Robots-Tag` et `robots.txt`.
- Aucune image externe, aucune police chargée, aucun cookie.

Contenu : `src/data/cabinet.ts` (textes) et `src/data/legal.ts` (pages légales).

## Commandes
```
npm install
npm run lint
npm run test
npm run build
```

## Mise en ligne (o2switch)
1. cPanel → Domaines : créer un sous-domaine (par exemple `avocat.demo.bsandoz.fr`) ; noter son dossier.
2. GitHub → Settings → Environments → `demo` : ajouter le secret `FTP_SERVER_DIR_AVOCAT_FRONT` (dossier du sous-domaine, vu depuis le compte FTP, avec `/` final).
3. Le site part ensuite à chaque push sur `main` (job `avocat-front` de `.github/workflows/deploy.yml`), ou à la demande (cible `avocat`). Sans le secret, l'envoi est ignoré avec un avertissement.
