<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Console;

use Bsandoz\Core\Booking\Application\ExpirerReservationsNonPayees;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/** Cron : php bin/console bsandoz:reservations:expirer */
#[AsCommand(name: 'bsandoz:reservations:expirer', description: 'Passe en « expirée » les réservations dont le blocage de paiement est dépassé.')]
final class ExpirerReservationsCommand extends Command
{
    public function __construct(private ExpirerReservationsNonPayees $expirer)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln(sprintf('%d réservation(s) expirée(s).', ($this->expirer)()));

        return Command::SUCCESS;
    }
}
