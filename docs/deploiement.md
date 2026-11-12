# Déploiement (o2switch)

Démo : site sur `https://demo.bsandoz.fr`, API sur `https://api.demo.bsandoz.fr`.
Chaque push sur `main` lance la CI ; si elle est verte, le workflow **Déploiement** (`.github/workflows/deploy.yml`) envoie le site et l'API en FTPS. Il peut aussi être lancé à la main (onglet Actions → Déploiement → Run workflow : tout, front ou api).

## 1. Préparer o2switch (une seule fois)
1. **Sous-domaines** (cPanel → Domaines) :
   - `demo.bsandoz.fr` → dossier `~/demo.bsandoz.fr` ;
   - `api.demo.bsandoz.fr` → racine web `~/api.demo.bsandoz.fr/public` (le reste du code de l'API n'est pas accessible depuis le web).
2. **HTTPS** : cPanel → SSL/TLS Status → lancer AutoSSL pour les deux sous-domaines. Les `.htaccess` redirigent ensuite tout en HTTPS.
3. **PHP** (cPanel → Sélectionner une version de PHP) pour `api.demo.bsandoz.fr` : PHP 8.3, extensions `pdo_mysql`, `sodium`, `curl`, `mbstring`, `openssl`, `intl` (et `gmp` si disponible, plus rapide pour les notifications push).
4. **Base de données** (cPanel → Bases de données MySQL) : une base et un utilisateur dédiés (tous les droits sur cette base uniquement).
5. **Compte FTP** (cPanel → Comptes FTP) limité au dossier personnel, utilisé seulement par GitHub.

## 2. Fichier `.env.local` de l'API (sur le serveur, jamais dans le dépôt)
Créer `~/api.demo.bsandoz.fr/.env.local` (gestionnaire de fichiers cPanel), droits 600 :
```dotenv
APP_ENV=prod
APP_SECRET=                      # php -r "echo bin2hex(random_bytes(16));"
DATABASE_URL="mysql://UTILISATEUR:MOTDEPASSE@localhost:3306/BASE?serverVersion=10.6.0-MariaDB&charset=utf8mb4"
JWT_SECRET=                      # php -r "echo bin2hex(random_bytes(32));"
BSANDOZ_ENCRYPTION_KEY=          # php bin/console bsandoz:cle-chiffrement — à sauvegarder à part (la perdre rend adresses et téléphones illisibles)
BSANDOZ_ICAL_SECRET=             # php -r "echo bin2hex(random_bytes(24));"
BSANDOZ_VAPID_PUBLIC_KEY=        # php bin/console bsandoz:push:cles (notifications push du pro, facultatif)
BSANDOZ_VAPID_PRIVATE_KEY=
FRONT_URL=https://demo.bsandoz.fr
CORS_ALLOW_ORIGIN='^https://demo\.bsandoz\.fr$'
MAILER_DSN="smtp://no-reply%40bsandoz.fr:MOTDEPASSE@muguet.o2switch.net:465"   # boîte mail cPanel ; hôte = nom du serveur o2switch (certificat valide), pas mail.<domaine>
MAILER_FROM=no-reply@bsandoz.fr
PRO_EMAIL=contact@bsandoz.fr      # adresse du pro (demandes de devis et rendez-vous), prévenu de chaque rendez-vous
STRIPE_SECRET_KEY=               # tableau de bord Stripe → Développeurs → Clés API (sk_test_… pour la démo)
STRIPE_WEBHOOK_SECRET=           # voir § 5
```
Un mail qui ne part pas ne bloque pas la réservation : l'erreur est écrite dans `public/error_log`.
Le mot de passe de la base, s'il contient des caractères spéciaux, doit être encodé (`@` → `%40`, `:` → `%3A`…).

## 3. GitHub (une seule fois)
Settings → Environments → créer l'environnement **demo**, puis dedans :
- **Secrets** : `FTP_SERVER` (ex. `ftp.bsandoz.fr`), `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR_FRONT` (`demo.bsandoz.fr/`), `FTP_SERVER_DIR_API` (`api.demo.bsandoz.fr/`) — chemins relatifs au dossier du compte FTP, **terminés par `/`**.
- Tant que ces secrets manquent, le workflow ne fait rien et l'indique par un avertissement (« Déploiement non configuré ») au lieu d'échouer. Attention : des secrets créés au niveau du dépôt ou dans un autre environnement portent le même nom mais doivent être dans l'environnement **demo** (ou au niveau du dépôt) pour être lus.
- **Variable** (facultative) : `VITE_SITE_URL` = adresse publique du site, pour les pages pré-générées et le sitemap (par défaut `https://demo.bsandoz.fr`).
- **Variable** : `VITE_API_URL` = `https://api.demo.bsandoz.fr` (sans `/api/v1`). Vide : le site est construit en mode démonstration.

## 4. Premier déploiement
1. GitHub → Actions → Déploiement → Run workflow (tout). L'API est envoyée en une seule archive `api.zip` (avec `deploy/apres-envoi.sh`) : quelques minutes au plus.
2. cPanel → Terminal :
   ```sh
   cd ~/api.demo.bsandoz.fr
   sh deploy/apres-envoi.sh                          # décompresse api.zip ; s'arrête si .env.local manque (§ 2), le relancer ensuite
   php bin/console bsandoz:pro:creer contact@bsandoz.fr Prénom Nom   # compte pro (mot de passe demandé)
   php bin/console detailing:demo:charger           # catalogue et horaires de démonstration (base vide uniquement)
   ```
3. **Tâche cron** (cPanel → Tâches cron), toutes les 15 minutes :
   ```
   */15 * * * * cd ~/api.demo.bsandoz.fr && php bin/console bsandoz:notifications:send --env=prod > /dev/null 2>&1
   ```
   Elle libère les créneaux dont l'acompte n'a pas été payé à temps et envoie les rappels de la veille.

## 5. Stripe
Tableau de bord Stripe → Développeurs → Webhooks → Ajouter un endpoint :
- URL : `https://api.demo.bsandoz.fr/api/v1/payment/stripe/webhook`
- Évènement : `checkout.session.completed`
Copier le secret de signature (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET`, puis relancer `sh deploy/apres-envoi.sh`.

## 6. Vérifications
- `https://api.demo.bsandoz.fr/api/v1/catalog` renvoie le catalogue en JSON.
- `https://demo.bsandoz.fr` : réserver de bout en bout avec la carte de test Stripe `4242 4242 4242 4242` ; le mail de confirmation arrive.
- `https://demo.bsandoz.fr/pro` : connexion du pro, planning, puis Réglages → « Activer les notifications » sur le téléphone.
- Sur téléphone : « Ajouter à l'écran d'accueil » installe l'application.

## 7. Mises à jour
Push sur `main` → CI → déploiement automatique. Si l'API a changé : `sh deploy/apres-envoi.sh` dans le terminal cPanel (décompresse la nouvelle archive, vide le cache, applique les migrations) (l'adresse IP de GitHub n'est pas autorisée en SSH chez o2switch, d'où cette étape manuelle). Le site, lui, est à jour immédiatement.

## Nouveau client
Copier `apps/detailing` en `apps/<client>`, ajouter ses deux jobs dans `deploy.yml` (avec son propre environnement GitHub et ses secrets), créer ses sous-domaines, sa base et son `.env.local` (nouvelles clés : chaque client a les siennes).

## Mettre à jour le catalogue de démonstration déjà chargé
`php bin/console detailing:demo:charger --mettre-a-jour` aligne les prestations de démonstration (retrouvées par leur nom) sur les données du code : prix, durées, descriptions, options proposées, mise en avant. Les options manquantes sont créées, les anciennes ne sont plus proposées ; catégorie, position, activation et tarifs par variante choisis dans l'espace pro sont conservés, les autres prestations ne sont pas touchées.

## Paiement sans acompte
Par défaut, aucun acompte (`deposit_percent: 0`) : le client choisit de tout payer en ligne ou sur place. Si un pourcentage d'acompte a déjà été enregistré dans l'espace pro (Réglages → Règles de réservation), le remettre à 0.
