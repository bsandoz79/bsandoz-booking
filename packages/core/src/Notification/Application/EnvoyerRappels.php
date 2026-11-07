<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Application;

/**
 * Envoie les rappels de la veille et les demandes d'avis, une seule fois chacun (table notification).
 *
 * @todo Injecter ReservationRepository, Notifier, Clock et implémenter.
 */
final class EnvoyerRappels
{
    public function __invoke(): int
    {
        throw new \LogicException('À implémenter');
    }
}
