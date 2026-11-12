<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Push;

use Bsandoz\Core\Notification\Domain\Model\AbonnementPush;
use Bsandoz\Core\Notification\Domain\Model\MessagePush;
use Bsandoz\Core\Notification\Domain\Model\ResultatPush;
use Bsandoz\Core\Notification\Domain\Port\EnvoiPush;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Web Push signé VAPID (bibliothèque minishlink/web-push). Clés générées par `php bin/console bsandoz:push:cles`,
 * dans `.env.local` (BSANDOZ_VAPID_PUBLIC_KEY, BSANDOZ_VAPID_PRIVATE_KEY). Sans clés : push désactivé.
 */
final class WebPushEnvoi implements EnvoiPush
{
    private ?WebPush $webPush = null;
    private string $publicKey;
    private string $privateKey;
    private LoggerInterface $logger;

    /** Clés nulles ou vides (variables d'environnement non définies) : push désactivé. */
    public function __construct(
        ?string $publicKey,
        ?string $privateKey,
        private string $subject,
        ?LoggerInterface $logger = null,
    ) {
        $this->publicKey = trim($publicKey ?? '');
        $this->privateKey = trim($privateKey ?? '');
        $this->logger = $logger ?? new NullLogger();
    }

    public function actif(): bool
    {
        return $this->publicKey !== '' && $this->privateKey !== '';
    }

    public function clePublique(): ?string
    {
        return $this->actif() ? $this->publicKey : null;
    }

    public function envoyer(AbonnementPush $abonnement, MessagePush $message): ResultatPush
    {
        if (!$this->actif()) {
            return ResultatPush::Echec;
        }
        try {
            $this->webPush ??= new WebPush(['VAPID' => ['subject' => $this->subject, 'publicKey' => $this->publicKey, 'privateKey' => $this->privateKey]], ['TTL' => 86400, 'urgency' => 'high'], 10);
            $rapport = $this->webPush->sendOneNotification(
                Subscription::create(['endpoint' => $abonnement->endpoint, 'publicKey' => $abonnement->publicKey, 'authToken' => $abonnement->authToken, 'contentEncoding' => 'aes128gcm']),
                $message->json(),
            );
            if ($rapport->isSuccess()) {
                return ResultatPush::Envoye;
            }
            if ($rapport->isSubscriptionExpired()) {
                return ResultatPush::Expire;
            }
            $this->logger->warning('Notification push refusée : {raison}', ['raison' => $rapport->getReason()]);
        } catch (\Throwable $e) {
            $this->logger->warning('Notification push impossible : {message}', ['message' => $e->getMessage()]);
        }

        return ResultatPush::Echec;
    }
}
