<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure\Console;

use Bsandoz\Core\Shared\Infrastructure\Security\Chiffreur;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/** Génère une clé de chiffrement à mettre dans .env.local. Ne jamais la changer sur une base remplie (données illisibles). */
#[AsCommand(name: 'bsandoz:cle-chiffrement', description: 'Génère une clé de chiffrement (BSANDOZ_ENCRYPTION_KEY) pour .env.local.')]
final class CleChiffrementCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('BSANDOZ_ENCRYPTION_KEY=' . Chiffreur::nouvelleCle());
        $output->writeln('<comment>À copier dans .env.local et à sauvegarder à part : sans elle, adresses et téléphones sont perdus.</comment>');

        return Command::SUCCESS;
    }
}
