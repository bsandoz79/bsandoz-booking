# Atelier Brillance – site (front)

Site React (Vite) du premier client, construit avec les blocs du kit `@bsandoz/ui`.

## Commandes
- `npm run lint`, `npm run test`, `npm run build` (ne jamais lancer `npm run dev` dans les scripts automatiques).

## Configuration
- `VITE_API_URL` : adresse de l'API (ex. `https://api.demo.bsandoz.fr/api/v1`). Vide : le parcours utilise les données de démonstration de `src/data/demo.ts`.

## Contenu
- `src/data/site.ts` : marque, ville, zone, acompte, délai d'annulation et identité légale. Tout ce qui n'est pas connu reste `[à compléter]` : ne jamais inventer d'avis, de chiffres ni de coordonnées. Les valeurs de zone, d'acompte et d'annulation doivent rester identiques aux réglages de l'API.
- `src/data/demo.ts` : prestations et options de démonstration (identiques à `php bin/console detailing:demo:charger` côté API).

## Pages
- `/` : accueil (prestations, comment ça marche, réalisations avant / après à fournir, zone d'intervention, avis à compléter, questions fréquentes).
- `/reserver`, `/confirmation` : parcours de réservation.
- `/mon-espace`, `/pro` : espaces client et pro.
- `/mentions-legales`, `/cgv`, `/confidentialite` : pages légales (`src/pages/Legal`) reprenant `site.ts` ; identité de l'entreprise, droit de rétractation, médiateur et durée de conservation `[à compléter]`, textes à faire relire avant la mise en ligne.
- Toute autre adresse : page introuvable.
