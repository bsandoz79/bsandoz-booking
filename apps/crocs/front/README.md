# Site de Croc's (démo)

Site d'une page pour Croc's (restauration rapide, 220 rue de Rouen, Amiens) : accueil (appeler, itinéraire), carte en code (bloc `Carte` du kit), venir (adresse, Google Maps, Waze, Plans, horaires, temps de trajet), avis, photos.

**Démo privée** tant que le patron n'a pas accepté : bandeau « Maquette proposée par Baptiste Sandoz », `noindex`. Prix et horaires relevés sur des sources publiques (voir `docs/crocs/carte-releve.md`), à faire valider. Photos de Google Maps en miniature : seulement en local (`src/assets/`, ignoré par Git, ce dépôt étant public) ; à remplacer par ses photos, avec son accord.

- Données : `src/data/crocs.ts` (coordonnées, horaires, avis, carte). Le module `Carte` de l'API remplacera la carte écrite ici quand l'espace pro sera branché.
- Temps de trajet : `src/calculs/trajet.ts` (distance à vol d'oiseau × 1,35, vitesses moyennes en ville : voiture 22 km/h + 2 min pour se garer, vélo 14 km/h, pied 4,8 km/h). Calculé dans le navigateur : la position ne quitte pas l'appareil ; une adresse tapée est cherchée dans la Base Adresse Nationale (api-adresse.data.gouv.fr).

```sh
npm install
npm run lint && npm run test && npm run build
```
