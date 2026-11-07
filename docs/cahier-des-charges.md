# Cahier des charges – démo detailing « Atelier Brillance »

Artisan de detailing auto **à domicile** (tout se fait chez le client), plus nettoyage de canapés. Objectif : remplacer un abonnement de réservation (~44 €/mois) par un système qui lui appartient.

## Parcours client
1. **Accueil** : accroche, arguments (eau et électricité autonomes, déplacement offert dans le rayon gratuit, intervention rapide), formules, réalisations avant/après, zone, avis `[à compléter]`, contact, horaires.
2. **Réserver** (étapes avec barre de progression) :
   1. Auto ou canapé.
   2. Auto : type de véhicule (citadine, berline/break, SUV/4x4, utilitaire) avec marque et modèle obligatoires ; le modèle propose le type. Canapé : nombre de places, matière.
   3. Formule (ex. intérieur, extérieur, complet, rénovation optique) : prix et durée selon la variante.
   4. Options (ex. poils d'animaux, siège enfant, moteur, traitement céramique) : prix et durée en plus. Mention « prix ajustable sur place si le véhicule ne correspond pas ».
   5. Adresse : contrôle de la zone, frais kilométriques au-delà du rayon gratuit, questions pratiques (parking, accès eau/électricité).
   6. Créneau : calendrier du mois entier, jours disponibles en évidence, créneaux du jour (durée + trajet), réservation au plus tôt le lendemain.
      - Prestation à **durée fiable** : elle n'occupe que sa durée estimée (+ trajet et marge) ; d'autres rendez-vous peuvent suivre dans la même demi-journée.
      - Prestation à **durée incertaine** (réglage par prestation) : proposée seulement en début de demi-journée (matin ou après-midi, d'après les plages d'ouverture), si la demi-journée est entièrement libre ; elle la bloque jusqu'à la fermeture. Le rendez-vous suivant est au plus tôt la demi-journée d'après.
   7. Coordonnées (sans mot de passe), récapitulatif, acceptation des CGV.
   8. Acompte en ligne (Stripe : carte, Apple Pay, Google Pay), confirmation.
3. **Mails** : confirmation + .ics + lien « gérer mon rendez-vous » + bouton « créer mon mot de passe » ; rappel la veille ; annulation.
4. **Espace client** : rendez-vous à venir et passés, déplacer/annuler selon les règles, compte, mot de passe par lien mail, téléchargement des données, suppression du compte (zone danger).

## Espace pro (l'artisan)
- Planning jour/semaine/mois, fiche rendez-vous (adresse → GPS, appel, SMS), statuts, absent.
- Ajout d'un rendez-vous pris par téléphone, avec envoi d'un lien d'acompte.
- Catalogue : prestations, formules, options, prix par type de véhicule, durées.
- Horaires, congés, règles (délai minimum, horizon, tampon, annulation), zone (rayon gratuit, prix/km, distance max), acompte (% ou fixe).
- Clients, tableau de bord, flux iCal pour Google Agenda / iPhone.

## Exigences
- Données de l'artisan dans sa propre base, hébergement o2switch, aucun abonnement tiers hors frais Stripe.
- Mobile d'abord, appli installable (PWA), accessibilité AA, RGPD.
- Design moderne et sobre (bleu clair pour le bouton Réserver, voir maquette historique).
