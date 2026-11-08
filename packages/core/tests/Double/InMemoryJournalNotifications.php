<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Notification\Domain\Model\NotificationEnvoyee;
use Bsandoz\Core\Notification\Domain\Port\JournalNotifications;

final class InMemoryJournalNotifications implements JournalNotifications
{
    /** @var list<NotificationEnvoyee> */
    public array $items = [];

    public function dejaEnvoyee(string $type, string $reservationId): bool
    {
        foreach ($this->items as $item) {
            if ($item->type() === $type && $item->reservationId() === $reservationId) {
                return true;
            }
        }

        return false;
    }

    public function enregistrer(NotificationEnvoyee $notification): void
    {
        $this->items[] = $notification;
    }
}
