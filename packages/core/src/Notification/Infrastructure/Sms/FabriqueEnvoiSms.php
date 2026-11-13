<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Sms;

use Bsandoz\Core\Notification\Domain\Port\EnvoiSms;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/** Choisit le fournisseur de SMS d'après la configuration : « aucun » (par défaut), « brevo » ou « android ». */
final class FabriqueEnvoiSms
{
    public static function creer(
        HttpClientInterface $http,
        ?LoggerInterface $logger,
        ?string $fournisseur,
        ?string $expediteur,
        ?string $brevoCle,
        ?string $passerelleUrl,
        ?string $passerelleUtilisateur,
        ?string $passerelleMotDePasse,
    ): EnvoiSms {
        // Variable d'environnement absente : null, traité comme vide.
        return match (strtolower(trim((string) $fournisseur))) {
            'brevo' => new BrevoSms($http, (string) $brevoCle, (string) $expediteur, $logger),
            'android' => new PasserelleAndroidSms($http, (string) $passerelleUrl, (string) $passerelleUtilisateur, (string) $passerelleMotDePasse, $logger),
            default => new AucunSms(),
        };
    }
}
