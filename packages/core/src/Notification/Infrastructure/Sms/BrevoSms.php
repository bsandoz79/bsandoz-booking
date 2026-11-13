<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Sms;

use Bsandoz\Core\Notification\Domain\Port\EnvoiSms;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * SMS par Brevo (API « transactionalSMS ») : clé d'API et nom d'expéditeur (11 caractères au plus, lettres et chiffres).
 * Une erreur est journalisée, jamais remontée.
 */
final class BrevoSms implements EnvoiSms
{
    public function __construct(
        private HttpClientInterface $http,
        private string $cleApi,
        private string $expediteur,
        private ?LoggerInterface $logger = null,
    ) {
    }

    public function actif(): bool
    {
        return $this->cleApi !== '';
    }

    public function envoyer(string $numero, string $texte): void
    {
        try {
            $reponse = $this->http->request('POST', 'https://api.brevo.com/v3/transactionalSMS/sms', [
                'headers' => ['api-key' => $this->cleApi, 'accept' => 'application/json'],
                'json' => ['sender' => mb_substr($this->expediteur, 0, 11), 'recipient' => ltrim($numero, '+'), 'content' => $texte, 'type' => 'transactional'],
                'timeout' => 10,
            ]);
            if ($reponse->getStatusCode() >= 300) {
                $this->logger?->error('SMS Brevo refusé ({statut}) : {corps}', ['statut' => $reponse->getStatusCode(), 'corps' => $reponse->getContent(false)]);
            }
        } catch (\Throwable $e) {
            $this->logger?->error('SMS Brevo non envoyé : {erreur}', ['erreur' => $e->getMessage()]);
        }
    }
}
