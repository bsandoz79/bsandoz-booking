# Vidéo du haut de l'accueil, générée par IA

Le haut de l'accueil fait avancer une vidéo au fil du défilement (comme le reel « POV: your website finally looks as good as your work »). Le mécanisme est en place ; il ne manque que la vidéo. En attendant, un clip libre de droits la remplace.

## 1. Choisir l'outil

Outils de vidéo par IA : Runway, Kling, Google Veo, Luma, Pika. Avant de payer, vérifiez deux points dans leurs conditions :

- **usage commercial autorisé** (un site d'entreprise est un usage commercial) ;
- **pas de filigrane** : les essais gratuits en ajoutent souvent un, ou interdisent l'usage commercial. Il faut parfois l'offre payante la moins chère, pour un mois.

## 2. Garder la même voiture d'un plan à l'autre

Commencez par générer **une image fixe** de la voiture (consigne A), puis animez chaque plan **à partir de cette image** (fonction « image to video ») : la voiture reste la même.

Réglages pour chaque plan : format **16:9** (paysage), **1080p**, durée **5 s**, **aucun texte**, **aucun logo**, aucune personne de face.

## 3. Les consignes, à copier telles quelles

Les outils comprennent le français. Si un résultat déçoit, la même consigne en anglais donne parfois mieux.

**A. Image de départ**
> Studio sombre et mat, photoréaliste, sol noir avec de légers reflets, longues rangées de néons blancs parallèles au plafond. Un SUV moderne de couleur foncée, garé de trois quarts face, entièrement couvert de boue séchée et de poussière. Éclairage de cinéma, très détaillé, aucun logo, aucune plaque lisible, personne dans l'image.

**Plan 1 — le lavage (« Faites défiler pour nettoyer »)**
> Caméra fixe. Un fin faisceau vertical de lumière blanche très vive traverse lentement l'image de gauche à droite. Tout ce qui se trouve derrière le faisceau devient parfaitement propre : le SUV devient noir brillant impeccable, avec le reflet des néons du plafond comme dans un miroir, le sol brille. Mouvement fluide, réaliste, rendu cinéma.

**Plan 2 — « Regardez de plus près »**
> La caméra glisse lentement, au ras du capot du SUV noir brillant désormais impeccable. De longs reflets des néons blancs glissent sur la carrosserie bombée. Faible profondeur de champ, rendu cinéma, mouvement fluide.

**Plan 3 — les micro-rayures disparaissent**
> Très gros plan sur une peinture de voiture noire couverte de micro-rayures circulaires, sous une lumière vive. Un tampon de polissage passe lentement sur la surface ; derrière lui, la peinture devient un miroir profond et parfait. Gros plan cinéma, mouvement fluide.

**Plan 4 — la goutte (protection céramique)**
> Très gros plan d'une goutte d'eau parfaitement ronde qui perle puis roule sur une peinture noire brillante traitée céramique, avec le reflet de lumières blanches douces. Ralenti, rendu cinéma.

**Plan 5 — la sortie (fin : le texte et « Réserver » arrivent)**
> Derrière le SUV noir brillant impeccable, la porte du garage se lève lentement ; une lumière dorée de coucher de soleil envahit le studio sombre et se reflète sur la carrosserie. La caméra avance doucement vers l'avant de la voiture. Rendu cinéma, mouvement fluide.

## 4. Me les envoyer

Déposez les **5 fichiers** (plan-1.mp4 … plan-5.mp4) dans le dossier Téléchargements et dites-le-moi. Je m'occupe de :

- les mettre bout à bout et de les recadrer pour le téléphone ;
- les encoder pour que l'image suive le doigt sans à-coups (images clés très rapprochées) ;
- caler les grands titres sur chaque plan (`apps/detailing/front/src/data/heroVideo.ts`).
