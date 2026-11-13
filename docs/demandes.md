# Suivi des demandes

Toutes les demandes faites pendant le développement, avec leur état. Mis à jour au fil de l'eau.
Légende : ✅ fait et en ligne après déploiement · 🔧 en cours · ⏳ à faire · ❓ décision à prendre.

## 13 novembre 2026

### Réglages et règles
- ✅ Phares : 45 € le premier véhicule, 40 € chacun des suivants (remise par véhicule réglable dans le catalogue) ; option « Deuxième véhicule » retirée.
- ✅ Annulation tardive d'un rendez-vous payé en ligne : pas de remboursement, la somme devient un avoir déduit du prochain rendez-vous.
- ✅ « Désodorisant Perfect Clean » partout.

### Espace pro
- ✅ Tableau de bord : Ma journée (tournée, GPS, appel, produits à charger, à encaisser), Choses à faire, Chiffres, Clients.
- ✅ Tableau de bord : « Mon prochain rendez-vous » à côté de « Ma journée » (quand, qui, quoi, où, itinéraire, appel).
- ✅ Itinéraire : fenêtre au choix Google Maps ou Waze (Ma journée, prochain rendez-vous, planning).
- ✅ Planning : la journée entière visible sans faire défiler (hauteur de l'écran).
- ✅ Agenda du pro : Réglages > « Mon agenda », abonnement une fois pour toutes dans Google Agenda, Apple ou Outlook (flux mis à jour tout seul). Sur le serveur : `BSANDOZ_ICAL_SECRET` à définir dans `.env.local` s'il ne l'est pas.
- ✅ Onglet Clients (fiche, historique, avoir, à relancer).
- ✅ Onglet Comptabilité (dépenses ponctuelles ou mensuelles, chiffre d'affaires, résultat par mois).
- ✅ Créneaux groupés (« Conseillé » à côté d'un rendez-vous déjà prévu, écart réglable).
- ✅ Avis Google : bouton dans le mail de facture (lien à coller dans Réglages quand la fiche Google existera).
- ✅ Catalogue : aperçu en direct de la carte à droite pendant la modification.

- ✅ Planning en semaine : texte des cases resserré (2 lignes, coupé proprement, texte complet au survol) ; un clic amène au détail du rendez-vous.
- ✅ Rubriques de l'espace pro (Tableau de bord, Planning, Clients…) dans une colonne fixe à gauche sur ordinateur ; sur téléphone, toutes visibles sur quelques lignes (plus de menu à faire défiler).

### Site public
- ✅ Formules, options et prix modifiables depuis le site.
- ✅ Bug : le crayon « Modifier » d'une carte de prestation ouvrait la réservation au lieu de la modification.
- ✅ Tout le site modifiable sur place : titre et présentation, coordonnées, étapes, réalisations (photos), zone et frais de déplacement, communes, horaires et congés, carte de fidélité, avis, FAQ, pages légales.
- ✅ Crayons de modification : icône seule, ronde et transparente (sans le mot « Modifier »), placée en haut à droite des cartes, à côté des titres de section, en haut à droite du bandeau d'accueil.
- ✅ Plus de bouton « Modifier le site » : connecté avec le compte pro, les crayons sont affichés directement partout.
- ✅ Réservation : chaque choix amène à l'endroit logique suivant (formules, options, étape suivante, calendrier, heures, coordonnées).
- ✅ Adresse : bouton « Utiliser ma position » (GPS du téléphone, avec accord).
- ✅ Après la réservation (page de confirmation) et dans « Mon espace » : « Ajouter à mon agenda » (Google Agenda, Apple / Outlook).
- ✅ « Mon espace » façon page de réglages (inspiré de Proton) : rubriques avec titre et explication, panneaux de lignes (icône, intitulé, valeur, « Modifier » à droite), coordonnées modifiables ligne par ligne, « Supprimer le compte » tout en bas avec un bouton rouge bordé.
- ✅ Plus d'emojis en couleur : icônes au trait simples partout (Mon espace, menu de l'espace pro, agenda, durée, position).
- 🔧 Zones modifiables : contour en pointillés autour de chaque zone, crayon dans le coin en haut à droite ; photo de l'accueil modifiable.
- ✅ « Mon espace » plus structuré : nom, puis e-mail et téléphone modifiables, déconnexion bien visible, zone de danger (suppression du compte) en pointillés rouges tout en bas.

### Bugs et mise en ligne
- ✅ « « lastname » est obligatoire » au paiement (champ « Nom et prénom » unique).
- ✅ Minutes GitHub Actions épuisées : dépôt rendu public (minutes illimitées).
- ✅ Déploiement : certificat FTPS (intermédiaires Let's Encrypt), TLS 1.2, dossiers « "demo.bsandoz.fr » créés par erreur (à supprimer dans cPanel), CSS/JS envoyés avant les pages.

### Décisions en attente
- ❓ Lien de la fiche Google (à créer), informations de facturation du vendeur (`[à compléter]`).
