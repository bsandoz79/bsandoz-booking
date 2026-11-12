<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Console;

use Minishlink\WebPush\VAPID;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/** php bin/console bsandoz:push:cles : génère la paire de clés VAPID des notifications push (à mettre dans .env.local). */
#[AsCommand(name: 'bsandoz:push:cles', description: 'Génère les clés VAPID des notifications push.')]
final class ClesPushCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        try {
            $cles = VAPID::createVapidKeys();
        } catch (\Throwable $e) {
            $io->error('Génération impossible : ' . $e->getMessage() . ' (sous Windows, définir OPENSSL_CONF vers le fichier openssl.cnf de PHP).');

            return Command::FAILURE;
        }
        $io->writeln([
            'À copier dans .env.local (jamais dans le dépôt). Changer ces clés désabonne tous les appareils.',
            '',
            'BSANDOZ_VAPID_PUBLIC_KEY=' . $cles['publicKey'],
            'BSANDOZ_VAPID_PRIVATE_KEY=' . $cles['privateKey'],
        ]);

        return Command::SUCCESS;
    }
}
