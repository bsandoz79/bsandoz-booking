<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Console;

use Bsandoz\Core\Booking\Application\ExpirerReservationsNonPayees;
use Bsandoz\Core\Notification\Application\EnvoyerRappels;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/** Cron toutes les 15 min : php bin/console bsandoz:notifications:send (expire les blocages dépassés, envoie les rappels). */
#[AsCommand(name: 'bsandoz:notifications:send', description: 'Expire les réservations non payées et envoie les rappels de la veille.')]
final class SendNotificationsCommand extends Command
{
    public function __construct(
        private ExpirerReservationsNonPayees $expirer,
        private EnvoyerRappels $rappels,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln(sprintf('%d réservation(s) expirée(s), %d rappel(s) envoyé(s).', ($this->expirer)(), ($this->rappels)()));

        return Command::SUCCESS;
    }
}
