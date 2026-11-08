<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Model;

/** Notification programmée déjà envoyée (ex. rappel de la veille), pour ne jamais l'envoyer deux fois. */
class NotificationEnvoyee
{
    public const RAPPEL = 'reminder';

    public function __construct(
        private string $id,
        private string $type,
        private string $reservationId,
        private \DateTimeImmutable $sentAt,
    ) {
    }

    public function id(): string { return $this->id; }
    public function type(): string { return $this->type; }
    public function reservationId(): string { return $this->reservationId; }
    public function sentAt(): \DateTimeImmutable { return $this->sentAt; }
}
