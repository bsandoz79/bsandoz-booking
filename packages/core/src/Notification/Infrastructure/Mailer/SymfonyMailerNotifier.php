<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Mailer;

use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Symfony\Component\Mailer\MailerInterface;

/** Mails Twig depuis templates/emails/<template>.html.twig, expéditeur et textes issus des paramètres du client. */
final class SymfonyMailerNotifier implements Notifier
{
    public function __construct(private MailerInterface $mailer)
    {
    }

    /** @todo TemplatedEmail, sujet par modèle, pièces jointes (.ics). */
    public function send(string $to, string $template, array $context, array $attachments = []): void { throw new \LogicException('À implémenter'); }
}
