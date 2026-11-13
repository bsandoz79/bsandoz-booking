<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Sms;

use Bsandoz\Core\Notification\Domain\Port\EnvoiSms;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * SMS envoyés depuis un téléphone Android avec l'application libre « SMS Gateway for Android » (forfait du téléphone,
 * gratuit avec les SMS illimités) : adresse de l'API (serveur cloud de l'application, ex.
 * https://api.sms-gate.app/3rdparty/v1, ou adresse locale du téléphone), identifiant et mot de passe affichés par
 * l'application. Une erreur est journalisée, jamais remontée.
 */
final class PasserelleAndroidSms implements EnvoiSms
{
    public function __construct(
        private HttpClientInterface $http,
        private string $url,
        private string $utilisateur,
        private string $motDePasse,
        private ?LoggerInterface $logger = null,
    ) {
    }

    public function actif(): bool
    {
        return $this->url !== '' && $this->utilisateur !== '';
    }

    public function envoyer(string $numero, string $texte): void
    {
        try {
            $reponse = $this->http->request('POST', rtrim($this->url, '/') . '/message', [
                'auth_basic' => [$this->utilisateur, $this->motDePasse],
                'json' => ['message' => $texte, 'phoneNumbers' => [$numero]],
                'timeout' => 10,
            ]);
            if ($reponse->getStatusCode() >= 300) {
                $this->logger?->error('SMS (passerelle Android) refusé ({statut}) : {corps}', ['statut' => $reponse->getStatusCode(), 'corps' => $reponse->getContent(false)]);
            }
        } catch (\Throwable $e) {
            $this->logger?->error('SMS (passerelle Android) non envoyé : {erreur}', ['erreur' => $e->getMessage()]);
        }
    }
}
