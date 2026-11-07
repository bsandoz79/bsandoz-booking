# Sécurité et RGPD

- Mots de passe : hachage `auto` de Symfony. Jetons (activation, reset, gestion) : 32 octets aléatoires, stockés hachés, usage unique, expiration.
- JWT 15 min + refresh token rotatif en cookie httpOnly, Secure, SameSite=Strict. Rate limit sur connexion, mot de passe oublié, réservation.
- Voters : un client n'accède qu'à ses réservations ; vérifié côté serveur.
- Validation par DTO + contraintes ; Doctrine paramétré ; pas de `dangerouslySetInnerHTML`.
- CORS limité au domaine du client ; HSTS, CSP, X-Frame-Options, X-Content-Type-Options.
- Stripe : signature du webhook vérifiée, traitement idempotent ; aucune donnée de carte chez nous.
- Données sensibles (téléphone, adresse) chiffrées avec une clé propre au client.
- o2switch : racine web sur `public/`, `.env.local` en 600, un utilisateur MySQL par base, sauvegardes séparées.
- RGPD : mention de création de compte, export JSON, suppression du compte, anonymisation après 3 ans.
