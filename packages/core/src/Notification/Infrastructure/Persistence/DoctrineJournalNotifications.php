<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Persistence;

use Bsandoz\Core\Notification\Domain\Model\NotificationEnvoyee;
use Bsandoz\Core\Notification\Domain\Port\JournalNotifications;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineJournalNotifications implements JournalNotifications
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function dejaEnvoyee(string $type, string $reservationId): bool
    {
        return $this->em->getRepository(NotificationEnvoyee::class)->count(['type' => $type, 'reservationId' => $reservationId]) > 0;
    }

    public function enregistrer(NotificationEnvoyee $notification): void
    {
        $this->em->persist($notification);
        $this->em->flush();
    }
}
