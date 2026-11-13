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
- ✅ Clients : tri (nom A→Z / Z→A, plus et moins dépensé, plus de visites, dernière visite, prochain rendez-vous), filtres rapides (à relancer, rendez-vous à venir, fidèles, nouveaux) avec compteurs, recherche, résumé (nombre, dépensé, panier moyen), une ligne par client avec initiales et étiquettes.
- ✅ Onglet Comptabilité (dépenses ponctuelles ou mensuelles, chiffre d'affaires, résultat par mois).
- ✅ Créneaux groupés (« Conseillé » à côté d'un rendez-vous déjà prévu, écart réglable).
- ✅ Avis Google : bouton dans le mail de facture (lien à coller dans Réglages quand la fiche Google existera).
- ✅ Produits en grille de cartes façon boutique (photo carrée, catégorie, nom, prix, stock − / +), ajout, modification, retrait de la vente, suppression définitive ; filtres par catégorie et par nom (aussi dans le Catalogue).
- ✅ Côté client : « Il en reste 2 », « Épuisé » (produit grisé, non commandable) dans la fenêtre des produits.
- ✅ Détail du rendez-vous compact (fiche d'une ligne par information, sans défilement), Appeler / Écrire / Itinéraire tout en bas.
- ✅ Mon espace encore moins large (580 px) ; barre de navigation allégée (téléphone et espace pro en petits ronds, « Mon espace » sans contour).
- ✅ Réservation : coordonnées pré-remplies pour un client connecté, modifiables pour réserver pour quelqu'un d'autre.
- ✅ Historique des rendez-vous dans l'espace pro : une ligne par réservation dès qu'elle est prise (« réservé le… »), tri par date du rendez-vous (récent / ancien) ou par dernières réservations, filtres par période, statut et nom ; un clic ouvre la fiche.
- ✅ Formule : options cochées en haut de sa fiche, réordonnables par glisser-déposer (poignée) ; cet ordre est celui de la réservation pour cette formule.
- ✅ Options : chaque option indique les formules qui la proposent (ou « aucune formule ») ; le filtre de catégorie s'applique aussi aux options (réordonnées entre elles sans déranger les autres) ; dans le formulaire d'une formule, cases d'options avec prix et description.
- ✅ Ordre des formules, des options et des produits réglable par glisser-déposer (appui long au doigt, souris, ou flèches au clavier) ; c'est l'ordre du site et de la réservation.
- ✅ Barre du haut sur téléphone sur une seule ligne : « Mon espace » et « Espace pro » passent dans le menu.
- ✅ Avis : pas d'avis fictifs (interdits) ; la section « Avis clients » est masquée pour les visiteurs tant qu'aucun avis réel n'est publié (le pro la voit, avec son crayon, pour en ajouter).
- ✅ Catalogue repensé : formules rangées par catégorie (comme sur l'accueil), une ligne par formule (prix, durée, options, étiquettes « Le plus choisi », « Retirée du site »…), « Modifier » et « Retirer » à droite ; options à part.
- ✅ Détail d'un rendez-vous structuré : en-tête (quand, durée, statut), blocs Client (appel, e-mail, itinéraire, fidélité), Prestation (véhicules, options, produits à apporter, précisions), Paiement (total, payé en ligne, à encaisser sur place, facture), puis les actions.
- ✅ Catalogue : aperçu en direct de la carte à droite pendant la modification.

- ✅ Planning en semaine : texte des cases resserré (2 lignes, coupé proprement, texte complet au survol) ; un clic amène au détail du rendez-vous.
- ✅ Rubriques de l'espace pro (Tableau de bord, Planning, Clients…) dans une colonne fixe à gauche sur ordinateur ; sur téléphone, toutes visibles sur quelques lignes (plus de menu à faire défiler).

### Navigation
- ✅ « Accéder à l'espace pro » retiré de Mon espace : lien « Espace pro » dans la barre de navigation pour un compte pro, en pastille ambre bien distincte (aussi dans le menu sur téléphone).
- ✅ Mon espace moins large (680 px), valeur alignée juste après l'intitulé : moins de vide au milieu.

- ✅ Chaque clic dans la barre de navigation (Pro, Mon espace…) ramène tout en haut de la page, même sur la page déjà ouverte ; le bouton « Retour » garde la position.

- ✅ Barre de navigation dans l'ordre logique : logo, liens (Prestations, Fidélité, Pro), bouton principal « Réserver », puis téléphone, « Espace pro » (compte pro), « Mon espace » en pastille avec icône, et thème clair / nuit tout à droite ; icônes seules sur écran moyen et téléphone.

- ✅ Barre du haut minimale à toutes les tailles d'écran : logo, Réserver, téléphone, thème et menu ☰ ; le menu (Prestations, Fidélité, Pro, Mon espace, Espace pro) se déroule sous la barre et se referme en cliquant ailleurs.
- ✅ Mouvement dès l'arrivée sur l'accueil, sobre : titre révélé mot par mot, photo en lent zoom arrière puis respiration très lente, points forts un à un, une seule impulsion sur « Réserver un créneau » ; tout reste immobile si « moins d'animations » est demandé.
- ✅ Site installable sur le téléphone comme une application : « Installer l'application » dans le menu ☰. Sur Android, la fenêtre d'installation du navigateur s'ouvre ; sur iPhone, une fenêtre explique les deux gestes (Partager, puis « Sur l'écran d'accueil »). Le bouton disparaît une fois le site installé. Raccourcis sur l'icône (appui long) : Réserver, Mon espace, Espace pro.

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
- ✅ Zones modifiables : contour en pointillés autour de chaque zone (haut de page, photo, prestations, étapes, réalisations, zone, horaires, fidélité, avis, FAQ, pied de page, pages légales), crayon dans le coin en haut à droite ; photo de l'accueil modifiable (envoi d'une photo).
- ✅ « Mon espace » plus structuré : nom, puis e-mail et téléphone modifiables, déconnexion bien visible, zone de danger (suppression du compte) en pointillés rouges tout en bas.

### Suppression du compte client
- ✅ Avant de confirmer, le client est prévenu de ce qu'il perd (avoir, tampons de fidélité, remise prête).
- ✅ La suppression efface aussi l'adresse, la position, les précisions et les données métier de ses anciens rendez-vous ; montants et dates restent pour la comptabilité, les factures gardent leurs mentions légales.

### Dynamisme du site
- ✅ Plus vivant mais sobre (pas d'effets « gadget » : ni dégradés, ni halos, ni reflets) : apparitions discrètes au défilement, entrée en douceur du haut de page, points forts en pastilles, étapes numérotées reliées par un trait, titres soulignés, comparateur avant / après à faire glisser pour les réalisations, léger relief au survol. Tout est coupé si « moins d'animations » est demandé.

### Démonstration
- ✅ Mentions légales de démonstration : responsable Baptiste Sandoz ; SIRET, adresse, médiateur et conservation fictifs, signalés comme tels. Vendeur des factures rempli par `detailing:demo:charger` (sans écraser ce qui est saisi). À remplacer par les vraies informations.
- ✅ Boutons d'appel : le numéro seul avec l'icône (« Appeler le … » lu par les lecteurs d'écran).

### E-mails
- ✅ E-mails professionnels : en-tête avec logo et liseré, grand titre, phrase d'aperçu, encadré récapitulatif (date en toutes lettres, prestation, adresse, paiement), boutons soignés, pied de page avec le site ; le client peut répondre directement (réponse chez le pro).

### Relance automatique
- ✅ Relance par e-mail des clients absents (dernière prestation il y a plus de N jours, 90 par défaut, rien de prévu) : un seul e-mail par période d'absence, bouton « Reprendre rendez-vous », lien de désinscription (page `/desinscription`), envoi en journée, désactivée par défaut ; réglage dans Réglages → « Relance des clients ». Partie avec la tâche cron existante (`bsandoz:notifications:send`).

### Bugs et mise en ligne
- ✅ Heures de rendez-vous rondes (8 h 00, 8 h 30…) au lieu de 8 h 05, 8 h 35 : le trajet vers le premier rendez-vous se fait avant l'ouverture ; entre deux rendez-vous, le trajet est toujours compté.
- ✅ « « lastname » est obligatoire » au paiement (champ « Nom et prénom » unique).
- ✅ Minutes GitHub Actions épuisées : dépôt rendu public (minutes illimitées).
- ✅ Déploiement : certificat FTPS (intermédiaires Let's Encrypt), TLS 1.2, dossiers « "demo.bsandoz.fr » créés par erreur (à supprimer dans cPanel), CSS/JS envoyés avant les pages.

### Décisions en attente
- ❓ Lien de la fiche Google (à créer), informations de facturation du vendeur (`[à compléter]`).

## À faire

### Facturation électronique (réforme)
- ⏳ **Choisir une plateforme agréée gratuite** et s'y inscrire pour la **réception** des factures (obligatoire depuis le 1er septembre 2026). Pistes gratuites citées par les comparatifs (novembre 2026) : Tiime, Indy, Abby, Shine Facture ; Solo (réception seule) ; Pennylane (offre gratuite incertaine). Vérifier qu'elle figure sur la liste officielle des plateformes immatriculées (impots.gouv.fr).
- ⏳ **Faire confirmer le calendrier d'émission** par le comptable ou l'administration : en principe 1er septembre 2027 pour les micro-entreprises (facture électronique aux clients pro, e-reporting des ventes aux particuliers) ; une source parle d'une obligation déjà en vigueur.
- ⏳ **Brancher le site sur la plateforme choisie** (développement) : à « Terminé », envoi automatique de la facture (clients pro) et des données de vente (particuliers), si la plateforme propose une API.

### Informations à fournir
- ⏳ Mentions légales et CGV : remplacer les données de démonstration (SIRET, adresse, médiateur… fictifs) par les vraies ; texte de rétractation à faire valider.
- ⏳ Informations de facturation du vendeur (onglet Factures).
- ⏳ Fiche Google à créer, puis lien d'avis à coller dans Réglages → Avis Google.
- ⏳ Photos des réalisations (avant / après), vrais produits (photos, prix, stock).

### Serveur
- ⏳ Lancer `sh deploy/apres-envoi.sh` après chaque déploiement de l'API (migrations en attente : catégorie des produits, date de réservation, ordre des options).
- ⏳ `.env.local` de l'API : clés Stripe (paiement en ligne réel), `PRO_EMAIL`, `BSANDOZ_ICAL_SECRET` (agenda du pro, 32 caractères au moins).
- ⏳ Supprimer les dossiers « "demo.bsandoz.fr » et « "api.demo.bsandoz.fr » (créés par erreur).

### Idées pour la suite
- SMS de confirmation et de rappel (prêts, à activer).
- Export comptable (CSV des factures et des dépenses).
- Catégories de prestations modifiables depuis l'espace pro.

