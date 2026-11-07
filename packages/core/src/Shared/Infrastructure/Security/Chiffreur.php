<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure\Security;

/**
 * Chiffrement symétrique des données personnelles en base (adresse, téléphone) avec sodium
 * (XSalsa20-Poly1305, nonce aléatoire par valeur). Clé propre à chaque client : 32 octets, 64 caractères hexadécimaux.
 * Format stocké : « enc:v1:<base64(nonce . texte chiffré)> » ; le préfixe versionné permettra une rotation de clé.
 * Une valeur sans préfixe (donnée enregistrée avant le chiffrement) est rendue telle quelle.
 */
final class Chiffreur
{
    private const PREFIXE = 'enc:v1:';

    private ?string $key = null;

    public function __construct(?string $hexKey)
    {
        if ($hexKey !== null && $hexKey !== '') {
            if (preg_match('/^[0-9a-f]{64}$/i', $hexKey) !== 1) {
                throw new \InvalidArgumentException('La clé de chiffrement doit faire 64 caractères hexadécimaux (32 octets).');
            }
            $this->key = (string) hex2bin($hexKey);
        }
    }

    /** Clé neuve à mettre dans .env.local (BSANDOZ_ENCRYPTION_KEY). */
    public static function nouvelleCle(): string
    {
        return bin2hex(sodium_crypto_secretbox_keygen());
    }

    public function chiffrer(string $clair): string
    {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);

        return self::PREFIXE . base64_encode($nonce . sodium_crypto_secretbox($clair, $nonce, $this->key()));
    }

    public function dechiffrer(string $valeur): string
    {
        if (!str_starts_with($valeur, self::PREFIXE)) {
            return $valeur;
        }

        $brut = base64_decode(substr($valeur, strlen(self::PREFIXE)), true);
        if ($brut === false || strlen($brut) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
            throw new \RuntimeException('Donnée chiffrée illisible.');
        }
        $clair = sodium_crypto_secretbox_open(
            substr($brut, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),
            substr($brut, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),
            $this->key(),
        );
        if ($clair === false) {
            throw new \RuntimeException('Donnée chiffrée illisible : mauvaise clé ou donnée altérée.');
        }

        return $clair;
    }

    private function key(): string
    {
        return $this->key ?? throw new \LogicException('Clé de chiffrement absente : définir BSANDOZ_ENCRYPTION_KEY dans .env.local (php bin/console bsandoz:cle-chiffrement).');
    }
}
