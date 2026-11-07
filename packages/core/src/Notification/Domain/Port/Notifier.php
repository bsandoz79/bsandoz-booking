<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Port;

interface Notifier
{
    /**
     * @param string $template ex. « booking_confirmed », « reminder », « activation », « password_reset »
     * @param array<string, mixed> $context
     * @param list<array{name: string, content: string, mime: string}> $attachments
     */
    public function send(string $to, string $template, array $context, array $attachments = []): void;
}
