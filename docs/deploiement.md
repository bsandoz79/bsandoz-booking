# Déploiement (o2switch)

- Front : build statique envoyé en FTPS par GitHub Actions dans le dossier du domaine (ex. `demo.bsandoz.fr`), `.htaccess` pour les routes React.
- API : `api.demo.bsandoz.fr` → racine sur `apps/detailing/api/public`. Envoi FTPS du code + `composer install --no-dev` (via SSH depuis ton PC, l'IP de GitHub n'étant pas autorisée en SSH chez o2switch) puis migrations.
- Cron cPanel : `*/15 * * * * php ~/api.demo.bsandoz.fr/bin/console bsandoz:notifications:send`.
- Secrets GitHub : `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR_FRONT`, `FTP_SERVER_DIR_API`.
À finaliser dans la branche `feature/deploiement`.
