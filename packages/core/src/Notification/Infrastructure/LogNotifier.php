<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure;

use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Psr\Log\LoggerInterface;

/**
 * Notifier provisoire : écrit les mails dans le journal de l'application (var/log) au lieu de les envoyer.
 * Utile en développement (les liens d'activation y apparaissent) ; remplacé par l'envoi réel dans feature/core-notification.
 * À ne pas utiliser en production : le journal contiendrait des liens personnels.
 */
final class LogNotifier implements Notifier
{
    public function __construct(private LoggerInterface $logger)
    {
    }

    public function send(string $to, string $template, array $context, array $attachments = []): void
    {
        $this->logger->info(sprintf('[mail non envoyé] « %s » pour %s', $template, $to), [
            'context' => $context,
            'attachments' => array_column($attachments, 'name'),
        ]);
    }
}
