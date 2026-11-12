<?php

declare(strict_types=1);

namespace App\Metier\Detailing\Infrastructure\Cli;

use App\Metier\Detailing\Application\ChargerDonneesDemo;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/** `php bin/console detailing:demo:charger` : catalogue et horaires de démonstration (base vide uniquement). */
#[AsCommand(name: 'detailing:demo:charger', description: 'Charge le catalogue et les horaires de démonstration (si le catalogue est vide).')]
final class ChargerDemoCommand extends Command
{
    public function __construct(private ChargerDonneesDemo $charger)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $resultat = ($this->charger)();

        if (!$resultat['charge']) {
            $io->warning('Le catalogue contient déjà des prestations : rien n\'a été chargé.');

            return Command::SUCCESS;
        }

        $io->success(sprintf('%d prestations, %d options et %d plages horaires de démonstration chargées.', $resultat['prestations'], $resultat['options'], $resultat['plages']));

        return Command::SUCCESS;
    }
}
