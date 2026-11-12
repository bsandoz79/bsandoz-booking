<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Infrastructure\Console;

use Bsandoz\Core\Auth\Application\CreerComptePro;
use Bsandoz\Core\Shared\Domain\DomainError;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\QuestionHelper;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;

/** php bin/console bsandoz:pro:creer contact@domaine.fr Prénom Nom  (le mot de passe est demandé sans être affiché). */
#[AsCommand(name: 'bsandoz:pro:creer', description: 'Crée le compte du pro (accès à l\'espace pro).')]
final class CreerCompteProCommand extends Command
{
    public function __construct(private CreerComptePro $creer)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Adresse e-mail de connexion')
            ->addArgument('prenom', InputArgument::REQUIRED)
            ->addArgument('nom', InputArgument::REQUIRED)
            ->addOption('mot-de-passe', null, InputOption::VALUE_REQUIRED, 'Mot de passe (sinon demandé de façon masquée)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $password = $input->getOption('mot-de-passe');
        if (!is_string($password) || $password === '') {
            $question = (new Question('Mot de passe (10 caractères minimum, une lettre et un chiffre) : '))->setHidden(true)->setHiddenFallback(false);
            $password = (new QuestionHelper())->ask($input, $output, $question);
        }

        try {
            ($this->creer)((string) $input->getArgument('email'), (string) $input->getArgument('prenom'), (string) $input->getArgument('nom'), (string) $password);
        } catch (DomainError $e) {
            $output->writeln('<error>' . $e->getMessage() . '</error>');

            return Command::FAILURE;
        }

        $output->writeln('Compte pro créé : connexion sur /api/v1/auth/login, accès à /api/v1/admin.');

        return Command::SUCCESS;
    }
}
