<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Console;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/** Cron toutes les 15 min : expire les réservations non payées, envoie rappels et demandes d'avis. */
#[AsCommand(name: 'bsandoz:notifications:send')]
final class SendNotificationsCommand extends Command
{
    /** @todo Appeler ExpirerReservationsNonPayees puis EnvoyerRappels, afficher les compteurs. */
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        throw new \LogicException('À implémenter');
    }
}
