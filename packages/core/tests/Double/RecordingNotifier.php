<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Notification\Domain\Port\Notifier;

/** Garde les mails demandés pour les vérifier dans les tests. */
final class RecordingNotifier implements Notifier
{
    /** @var list<array{to: string, template: string, context: array<string, mixed>}> */
    public array $sent = [];

    public function send(string $to, string $template, array $context, array $attachments = []): void
    {
        $this->sent[] = ['to' => $to, 'template' => $template, 'context' => $context];
    }

    /** @return list<array{to: string, template: string, context: array<string, mixed>}> */
    public function of(string $template): array
    {
        return array_values(array_filter($this->sent, static fn (array $mail): bool => $mail['template'] === $template));
    }
}
