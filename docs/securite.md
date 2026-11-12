# Sécurité et RGPD

- Mots de passe : hachage `auto` de Symfony. Jetons (activation, reset, gestion) : 32 octets aléatoires, stockés hachés, usage unique, expiration.
- JWT 15 min + refresh token rotatif en cookie httpOnly, Secure, SameSite=Strict. Rate limit sur connexion, mot de passe oublié, réservation.
- Accès : un client n'accède qu'à ses réservations, vérifié côté serveur dans chaque cas d'usage (réservation d'un autre client → 404) ; `/api/v1/me` exige `ROLE_CLIENT`, `/api/v1/admin` `ROLE_PRO`. Compte supprimé ou désactivé : accès coupé immédiatement, même avec un jeton encore valide.
- Validation par DTO + contraintes ; Doctrine paramétré ; pas de `dangerouslySetInnerHTML`.
- CORS limité au domaine du client ; HSTS, CSP, X-Frame-Options, X-Content-Type-Options.
- Stripe : signature du webhook vérifiée, traitement idempotent ; aucune donnée de carte chez nous.
- Données sensibles (téléphone, adresse) chiffrées en base avec une clé propre au client (`BSANDOZ_ENCRYPTION_KEY`, sodium XSalsa20-Poly1305, nonce aléatoire, format versionné `enc:v1:`). Clé générée par `php bin/console bsandoz:cle-chiffrement`, dans `.env.local` uniquement, sauvegardée à part : la perdre rend ces données illisibles. L'e-mail reste en clair (recherche à la connexion).
- Notifications push : clés VAPID (`BSANDOZ_VAPID_PUBLIC_KEY`, `BSANDOZ_VAPID_PRIVATE_KEY`) générées par `php bin/console bsandoz:push:cles`, dans `.env.local` uniquement ; messages chiffrés de bout en bout (aes128gcm) jusqu'à l'appareil ; seul un compte pro peut abonner un appareil ; aucune donnée sensible (adresse, téléphone) dans le texte de la notification.
- o2switch : racine web sur `public/`, `.env.local` en 600, un utilisateur MySQL par base, sauvegardes séparées.
- RGPD : mention de création de compte, export JSON, suppression du compte, anonymisation après 3 ans.
