#!/bin/sh
# Chaîne de certificats du serveur FTPS, pour lftp (déploiement).
# o2switch n'envoie que son certificat (Let's Encrypt), sans les intermédiaires : on les télécharge en suivant
# « CA Issuers » (AIA) et on les ajoute aux autorités du système. La vérification reste complète : la chaîne doit
# remonter à une racine déjà reconnue par le système (ex. ISRG Root X1), et le nom du serveur doit correspondre.
# Usage : sh .github/chaine-ftps.sh <serveur> <fichier de sortie>
set -eu
serveur="$1"
sortie="$2"
dossier=$(mktemp -d)
openssl s_client -connect "$serveur:21" -starttls ftp -servername "$serveur" </dev/null 2>/dev/null | openssl x509 > "$dossier/0.pem"
cp /etc/ssl/certs/ca-certificates.crt "$sortie"
certificat="$dossier/0.pem"
for i in 1 2 3 4; do
  url=$(openssl x509 -in "$certificat" -noout -ext authorityInfoAccess 2>/dev/null | grep -o 'http://[^ ]*' | head -1 || true)
  [ -n "$url" ] || break
  curl -fsS --max-time 20 "$url" -o "$dossier/$i.der" || break
  openssl x509 -inform DER -in "$dossier/$i.der" -out "$dossier/$i.pem" 2>/dev/null || openssl x509 -in "$dossier/$i.der" -out "$dossier/$i.pem"
  cat "$dossier/$i.pem" >> "$sortie"
  # Racine (émetteur = sujet) : fin de la chaîne.
  [ "$(openssl x509 -in "$dossier/$i.pem" -noout -subject | cut -d= -f2-)" != "$(openssl x509 -in "$dossier/$i.pem" -noout -issuer | cut -d= -f2-)" ] || break
  certificat="$dossier/$i.pem"
done
# Contrôle avant l'envoi : échoue si la chaîne ne remonte pas à une autorité reconnue.
openssl verify -CAfile "$sortie" -untrusted "$sortie" "$dossier/0.pem"
