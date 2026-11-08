<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Port;

use Bsandoz\Core\Notification\Domain\Model\NotificationEnvoyee;

interface JournalNotifications
{
    public function dejaEnvoyee(string $type, string $reservationId): bool;

    public function enregistrer(NotificationEnvoyee $notification): void;
}
