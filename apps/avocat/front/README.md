# Site fictif d'avocat (démonstration)

Site vitrine d'un cabinet d'avocat pénaliste **fictif**, « Maître Baptiste Sandoz » (barreau d'Abbeville, droit pénal et droit routier), pour montrer ce que Baptiste Sandoz peut réaliser pour un cabinet. Baptiste Sandoz n'est pas avocat : le site le dit dans le bandeau du haut, le pied de page, les mentions légales et le titre de la page.

- Une page : haut de page (photo du palais de justice d'Abbeville), encadré « garde à vue », le cabinet (activité dominante, serment de l'avocat), quatre domaines numérotés (défense pénale, droit des victimes, droit routier, exécution des peines), les étapes d'une procédure pénale, les juridictions de la Somme en photo (tribunal judiciaire d'Abbeville, palais de justice et cour d'appel d'Amiens), honoraires (convention, aide juridictionnelle, protection juridique), contact.
- Vocabulaire et règles du droit français (garde à vue, CRPC, CIVI, délai d'appel de dix jours, convention d'honoraires obligatoire…), présentés de façon générale. « Activité dominante » et non « spécialiste » : ce titre exige un certificat du CNB.
- Pages `/mentions-legales` et `/confidentialite`.
- Coordonnées fictives : téléphone dans une tranche réservée à la fiction par l'Arcep, e-mail en `example.com` (domaine réservé), adresse marquée « fictive ».
- Jamais indexé : balise `robots`, en-tête `X-Robots-Tag` et `robots.txt`.
- Photos de Wikimedia Commons (CC BY-SA 4.0) en WebP 800 et 1600 px dans `src/assets/photos`, auteurs et licences dans `src/data/photos.ts` et la section « Crédits photos » des mentions légales. Bâtiments réels, sans lien avec le cabinet fictif : le site le précise.
- Aucune ressource externe, aucune police chargée, aucun cookie.

Contenu : `src/data/cabinet.ts` (textes), `src/data/photos.ts` (photos et crédits) et `src/data/legal.ts` (pages légales).

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
