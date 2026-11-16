# Suivi des demandes

Toutes les demandes faites pendant le développement, avec leur état. Mis à jour au fil de l'eau.
Légende : ✅ fait et en ligne après déploiement · 🔧 en cours · ⏳ à faire · ❓ décision à prendre.

## 16 novembre 2026

### Boutons
- ✅ Boutons moins « école », couleurs gardées : bleu plein plus sobre, secondaires transparents à contour fin, téléphone vert transparent (contour et icône verts). Coins peu arrondis partout, boutons du kit compris.

### Accueil
- ✗ (remplacé) Juste après la vidéo « Comment ça marche », une scène du même genre que le haut de l'accueil, avec les images 5 à 8 (intérieur, créées par IA). Elle reste à l'écran pendant qu'on fait défiler, et les images glissent vers la gauche : « Avant. » (portière sale), « Miettes, poussière, déchets. », « Après. », « Comme au premier jour. » (portière propre). Réglages dans `data/sceneInterieur.ts`, images dans `public/scenes/`.
- ✅ Scène de l'intérieur interactive : on entre dans le véhicule sale par la portière, le défilement s'arrête dans l'habitacle, la souris devient un chiffon et nettoie là où elle passe (le reste reste sale). Un coup de molette : le chiffon finit tout seul, en allers-retours comme sur une vitre, puis on ressort par la portière, véhicule propre. En remontant, tout se resalit. Réglages (moments, zoom, textes, taille du chiffon, durées) dans `data/sceneInterieur.ts`. Correction : la scène se joue aussi pour le pro connecté et avec « moins d'animations » (sans zoom) ; avant, ces cas affichaient seulement le comparateur avant / après. Le chiffon finit en commençant de droite à gauche.
- ❓ L'image « habitacle sale » montre des gobelets et emballages McDonald's reconnaissables (logo). Pour un site commercial, il vaut mieux une version sans marque visible.

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
- ✅ Site installable sur le téléphone comme une application : « Installer l'application » dans le menu ☰, visible seulement avec le compte pro. L'application installée s'ouvre directement sur l'Espace pro (connexion si besoin). Sur Android, la fenêtre d'installation du navigateur s'ouvre ; sur iPhone, une fenêtre explique les deux gestes (Partager, puis « Sur l'écran d'accueil »). Le bouton disparaît une fois le site installé. Raccourcis sur l'icône (appui long) : Espace pro, Site public, Réserver.
- ✅ Deux vidéos de présentation pour le site, sans jargon ni son, en 1080p horizontal : clients de Perfect Clean (31 s : formules, réservation, créneaux, fidélité) et artisans (43 s : journée, itinéraire, planning, encaissement et QR code, factures, site modifiable). Fichiers remis à part, non versionnés (14 et 19 Mo).
- ✅ Dernière image (garage) : elle arrive avec le même cadrage que les autres puis recule progressivement jusqu'à son cadrage d'origine (image entière, en haute définition pour rester nette).
- ✅ La voiture ne bouge plus : les 4 images sont recadrées pour qu'elle soit au même endroit et à la même taille, sans rapprochement ; seuls la boue, la mousse, le rinçage et le fond changent. Logo « Qwen » comblé à partir des pixels voisins. Surtitre bleu sur une seule ligne.
- ✅ Panneau « Réserver votre lavage » à droite (grand écran) : catégories, puis formules ; une formule mène directement au planning de la réservation, déjà cochée (formule complète : au choix des formules intérieur et extérieur). Avant, une catégorie à plusieurs formules ouvrait la réservation sans rien cocher.
- ✅ Lecture automatique ramenée à 6 s environ ; titres et texte final serrés dans le coin en haut à gauche, plus petits (points forts retirés de cette zone) : la voiture reste dégagée.
- ✅ Haut de l'accueil épuré : lecture automatique en 4 s environ, d'un seul mouvement fluide ; titres d'étape et texte final en haut à gauche, voile léger pour laisser la voiture visible ; panneau « Réserver votre lavage » retiré (restent les boutons « Réserver un créneau » et téléphone sous le texte, et « Réserver » dans l'en-tête).
- ✅ Le scénario se joue aussi quand le pro est connecté (avant : l'image finale s'affichait directement en mode modification).
- ✅ Le scénario du haut de l'accueil se joue tout seul à l'arrivée (environ 15 s, une pause sur chaque image) ; remonter le rejoue à l'envers au fil du défilement. Le moindre geste du visiteur arrête la lecture automatique ; pas de lecture si on arrive plus bas dans la page. Premier titre : « Avant. ».
- ✅ Haut de l'accueil avec vos images créées par IA (Qwen), au fil du défilement : voiture boueuse (« Faites défiler pour nettoyer. »), la mousse coule dessus (« On applique la mousse. »), une barre de lumière la rince de gauche à droite (« On rince. »), on se rapproche de la voiture propre (« Regardez de plus près. »), porte du garage et lumière dorée, puis le texte et le panneau « Réserver votre lavage ». Réglages dans `data/heroScenes.ts`, images dans `public/scenes/`. Le logo « Qwen » est retiré par recadrage : vérifier que les conditions de Qwen le permettent pour un site professionnel.
- ✅ La scène du haut de l'accueil ne se joue qu'une fois par chargement : une fois terminée, elle se fige sur l'image finale (remonter ne la rejoue plus) ; seul un rechargement la relance.
- ✅ Slogan choisi : « L’éclat du neuf, livré chez vous. » (texte par défaut ; à recopier avec le crayon sur le site en ligne).
- ✅ Texte bleu (surtitre) contenu dans la carte : la carte s'élargit sur grand écran, retour à la ligne sur téléphone.
- ✅ En-tête pleine largeur : logo dans le coin gauche, boutons dans le coin droit. Boutons modernisés (coins arrondis au lieu de pilules, bordure fine, survol par la couleur, léger appui au clic), mêmes couleurs.
- ✅ Réservation depuis le panneau de l'accueil : si la formule propose des options, elles sont affichées (étape 1) avant le créneau ; sinon, directement le créneau.
- ✅ Texte du haut de l'accueil dans une carte sombre et nette (comme le panneau « Réserver »), petit trait bleu sous le titre. Nouveau texte par défaut, centré sur le lavage et Perfect Clean : « Perfect Clean · lavage et detailing à domicile » / « Votre voiture brille, sans bouger de chez vous. » / « Mousse active, rinçage, finitions à la main : Perfect Clean vient à vous, à Abbeville et alentours. »
- ⏳ Le texte enregistré sur le site (crayon) reste l'ancien : le remplacer avec le crayon « Titre, présentation et points forts » (Surtitre : « Perfect Clean · lavage et detailing à domicile » ; Grand titre : « L’éclat du neuf, livré chez vous. » ; Introduction : « Mousse active, rinçage, finitions à la main : Perfect Clean vient à vous, à Abbeville et alentours. »).
- ✅ Téléphone : la voiture entière est montrée dans un cadre paysage sur toute la largeur (avant : seulement une tranche, roue ou capot), sur le noir du studio, textes au-dessus ; surtitre sur deux lignes pour rester à l'écran.
- ✅ Image du garage refaite avec la même voiture grise : elle arrive au même endroit puis recule jusqu'à l'image entière.
- ✅ Image « voiture propre » refaite à partir de l'image boueuse (même voiture, même cadrage) : le rinçage nettoie vraiment la même voiture.
- ✗ (remplacé) Haut de l'accueil, mécanisme du reel : vidéo qui avance et recule avec le défilement (scène épinglée), grands titres par étape en bas à droite, fine barre d'avancement, puis le texte de l'accueil à gauche et le panneau « Réserver votre lavage » (catégories avec prix « dès », bouton créneau, téléphone) qui glisse à droite. Réglages dans `data/heroVideo.ts`. Vidéo provisoire : le clip libre de droits.
- ✗ (remplacé par les images) Générer la vidéo du haut de l'accueil avec une IA vidéo (5 plans : lavage par un faisceau de lumière, capot, micro-rayures polies, goutte, porte du garage) : consignes prêtes dans `docs/video-ia.md`, puis me déposer les 5 fichiers.
- ✗ (remplacé) Haut de l'accueil avant / après : « Faites défiler pour nettoyer » sur l'habitacle sale, une barre de lumière le nettoie au fil du défilement ; « Regardez de plus près » : le phare jauni arrive et se rénove de la même façon ; puis le titre, les boutons et les points forts arrivent, et la suite du site. Avec vos vraies photos avant / après (habitacle cuir, phare). Mode modification et « moins d'animations » : directement le texte sur la photo « après ». Le clip vidéo précédent est retiré.
- ✅ Haut de l'accueil façon « reel » : clip plein écran (vertical sur téléphone, horizontal sur ordinateur) joué seul pendant 3 s, puis l'image s'assombrit et le texte arrive par-dessus (surtitre, titre mot par mot, trait, phrase, boutons, points forts, flèche pour défiler). Défilement libre pendant le clip ; texte tout de suite si la lecture est bloquée, en mode modification ou si « moins d'animations » est demandé.
- ✅ Haut de l'accueil : court clip d'un nettoyage (3 s, sans son) à la place de la photo du camion ; démarre tout seul, ne joue qu'une fois et reste sur sa dernière image, la page défile normalement. Image fixe si « moins d'animations ». Clip libre de droits (Coverr : usage commercial autorisé, sans mention obligatoire), recadré pour ne montrer aucune marque. Le clip passe avant la photo choisie avec le crayon (qui le masquait sur le site) ; cette photo sert d'image fixe si « moins d'animations » est demandé.
- ⏳ Remplacer ce clip par un clip de vos propres lavages (2-3 s filmées au téléphone) : je le recadre et l'allège.
- ✅ Abonnements dans « Mon espace » : chaque semaine, tous les 15 jours, chaque mois ou chaque année ; une prestation comprise par période (perdue si elle n'est pas réservée dans sa période), prélèvement automatique par carte (Stripe), prix fixé par le pro pour chaque offre, sans engagement (résiliation effective en fin de période payée). Réservation avec l'abonnement : formule comprise déduite, options en plus. Espace pro : onglet « Abonnements » (offres et abonnés) ; comptabilité : prélèvements comptés.
- ✅ Formule complète : nouvelle catégorie où le client choisit sa formule intérieur et sa formule extérieur (n'importe lesquelles), 15 € de moins sur le total, la rénovation des phares (et le désodorisant) en option, en plus des options des formules choisies. Durée : les deux formules ; facture et planning détaillent les formules choisies et la remise. Réglable dans l'espace pro (« Formule combinée » : catégories et remise).
- ✅ Vidéo de l'accueil lancée toute seule (sans son, en boucle) quand elle arrive à l'écran, en pause quand on la quitte ; pas de lancement automatique si « moins d'animations » est demandé.
- ✅ Vidéo de l'accueil affichée à 6 min 55 au lieu de 30 s (dernière image répétée par erreur au montage) : corrigée, 30 s et 3 Mo au lieu de 14 Mo (vidéo artisans : 43 s, 4 Mo).
- ✅ Vidéo clients sur l'accueil, sous « Comment ça marche » : image d'aperçu, rien n'est téléchargé avant « lecture ». Envoyée à part au déploiement (seulement si elle change).
- ⏳ Vidéo artisans : page où la mettre à choisir (pas de page « artisans » sur le site de démo).
- ✅ Encaisser sur place : bouton « Encaisser X € » (Ma journée et détail du rendez-vous) à la place de « Terminé » quand il reste à payer. Moyen au choix (carte au terminal, espèces, virement, chèque) ou QR code : le client scanne et paie sur son téléphone (carte, Apple Pay, Google Pay, via Stripe), la fenêtre affiche « Paiement reçu » toute seule. Rendez-vous terminé, facture envoyée avec « réglés sur place par … », recettes par moyen de paiement dans Comptabilité.
- ✅ Cartes des onglets Intérieur / Extérieur parfois vides avec le compte pro : l'activation du mode édition après le chargement effaçait la marque d'apparition et les cartes restaient invisibles. Corrigé (marque posée en attribut, que React ne réécrit pas).
- ✅ Bouton « Itinéraire » avec une icône de trajet ; dans la fenêtre de choix, Google Maps (bouton blanc) et Waze (bouton bleu) avec leur logo.
- ✅ Plus de « jeu » sur téléphone : champs en 16 px minimum sur écran tactile (l'iPhone ne zoome plus en touchant un champ), page qui ne peut plus glisser de côté, liste « Trier par » de l'Historique contenue à l'écran (375 px), en-tête resserré sur les très petits téléphones (320 px). Vérifié sur toutes les pages et tous les onglets de l'Espace pro à 320, 375 et 390 px.

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
- ✅ Scène de l'intérieur : consigne « passez le chiffon » rendue discrète (petite barre sur une ligne, texte court, bouton « Passer » bordé au lieu du gros bouton bleu).
- ✅ Encart « Professionnels » sur l'accueil (après les prestations) : « Une flotte de véhicules à nettoyer ? », boutons « Demander un devis » (formulaire de la page Professionnels) et « En savoir plus » ; lien « Devis sur mesure » dans le panneau « Réserver votre lavage ».

### Décisions en attente
- ❓ Lien de la fiche Google (à créer), informations de facturation du vendeur (`[à compléter]`).

## À faire

### Abonnements
- ⏳ Fixer les vrais prix des abonnements dans l'espace pro (onglet « Abonnements ») : en démonstration, chaque offre est au prix normal de l'Extérieur Éclat.
- ⏳ Tableau de bord Stripe → Développeurs → Webhooks : ajouter à l'adresse existante les évènements `invoice.paid`, `invoice.payment_failed` et `customer.subscription.deleted` (en plus de `checkout.session.completed`).
- ⏳ Factures des prélèvements d'abonnement : pour l'instant, Stripe envoie le reçu au client (à activer dans Stripe → Paramètres → E-mails clients → « Paiements réussis ») ; une facture numérotée du site pour chaque prélèvement reste à faire.

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
- ⏳ Lancer `sh deploy/apres-envoi.sh` après chaque déploiement de l'API (migrations en attente : catégorie des produits, date de réservation, ordre des options, encaissement sur place, formules combinées, abonnements) ; puis `php bin/console detailing:demo:charger --mettre-a-jour` pour créer la formule complète.
- ⏳ `.env.local` de l'API : clés Stripe (paiement en ligne réel et QR code d'encaissement sur place), `PRO_EMAIL`, `BSANDOZ_ICAL_SECRET` (agenda du pro, 32 caractères au moins).
- ⏳ Supprimer les dossiers « "demo.bsandoz.fr » et « "api.demo.bsandoz.fr » (créés par erreur).

### Idées pour la suite
- SMS de confirmation et de rappel (prêts, à activer).
- Export comptable (CSV des factures et des dépenses).
- Catégories de prestations modifiables depuis l'espace pro.

