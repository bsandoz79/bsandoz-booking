# Vidéo du haut de l'accueil, générée par IA

Le haut de l'accueil fait avancer une vidéo au fil du défilement (comme le reel « POV: your website finally looks as good as your work »). Le mécanisme est en place ; il ne manque que la vidéo. En attendant, un clip libre de droits la remplace.

## 1. Choisir l'outil

Outils de vidéo par IA : Runway, Kling, Google Veo, Luma, Pika. Avant de payer, vérifiez deux points dans leurs conditions :

- **usage commercial autorisé** (un site d'entreprise est un usage commercial) ;
- **pas de filigrane** : les essais gratuits en ajoutent souvent un, ou interdisent l'usage commercial. Il faut parfois l'offre payante la moins chère, pour un mois.

## 2. Garder la même voiture d'un plan à l'autre

Commencez par générer **une image fixe** de la voiture (consigne A), puis animez chaque plan **à partir de cette image** (fonction « image to video ») : la voiture reste la même.

Réglages pour chaque plan : format **16:9**, **1080p**, durée **5 s**, **aucun texte**, **aucun logo**, aucune personne de face.

## 3. Les consignes, à copier telles quelles (en anglais, mieux compris par ces outils)

**A. Image de départ**
> Photorealistic dark matte studio, black floor with subtle reflections, long parallel white LED strip lights on the ceiling, a modern dark SUV parked in three-quarter front view, the car is completely covered in dried mud and dust, cinematic lighting, high detail, no logos, no license plate text, no people.

**Plan 1 — le lavage (« Faites défiler pour nettoyer »)**
> Static camera. A thin vertical beam of bright white light sweeps slowly from left to right across the frame. Everything behind the beam is perfectly clean: the SUV becomes spotless glossy black with mirror reflections of the ceiling lights, the floor gleams. Smooth, realistic, cinematic.

**Plan 2 — « Regardez de plus près »**
> Slow camera glide low over the hood of the now spotless glossy black SUV, long reflections of the white LED strips sliding across the curved paint, shallow depth of field, cinematic, smooth.

**Plan 3 — les micro-rayures disparaissent**
> Extreme macro of black car paint covered in circular swirl marks under a bright light. A dual-action polishing pad passes slowly across the surface; behind it the paint becomes a flawless deep mirror finish. Cinematic macro, smooth motion.

**Plan 4 — la goutte (protection céramique)**
> Extreme macro of a perfect round water droplet beading and rolling on glossy black ceramic-coated car paint, reflections of soft white lights, slow motion, cinematic.

**Plan 5 — la sortie (fin, le texte et « Réserver » arrivent)**
> The garage door rises slowly behind the spotless glossy black SUV, warm golden sunset light floods into the dark studio and reflects on the paint, slow push-in towards the front of the car, cinematic, smooth.

## 4. Me les envoyer

Déposez les **5 fichiers** (plan-1.mp4 … plan-5.mp4) dans le dossier Téléchargements et dites-le-moi. Je m'occupe de :

- les mettre bout à bout et de les recadrer pour le téléphone ;
- les encoder pour que l'image suive le doigt sans à-coups (images clés très rapprochées) ;
- caler les grands titres sur chaque plan (`apps/detailing/front/src/data/heroVideo.ts`).
