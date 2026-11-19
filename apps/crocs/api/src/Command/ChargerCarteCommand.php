<?php

declare(strict_types=1);

namespace App\Command;

use Bsandoz\Core\Carte\Application\GererCarte;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Charge la carte relevée (data/carte-initiale.json) dans une base vide, à l'installation.
 * Ne fait rien si la carte contient déjà des rubriques : le patron la modifie ensuite dans son espace.
 */
#[AsCommand(name: 'crocs:carte:charger', description: 'Charge la carte de départ dans une base vide.')]
final class ChargerCarteCommand extends Command
{
    public function __construct(
        private readonly GererCarte $carte,
        #[Autowire('%kernel.project_dir%/data/carte-initiale.json')]
        private readonly string $fichier,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        if ($this->carte->pro() !== []) {
            $output->writeln('La carte contient déjà des rubriques : rien n’est chargé.');

            return Command::SUCCESS;
        }

        /** @var list<array{nom: string, note: string, icone: string|null, articles: list<array{nom: string, description: string, prixCents: int}>}> $rubriques */
        $rubriques = json_decode((string) file_get_contents($this->fichier), true, 512, JSON_THROW_ON_ERROR);
        $nombre = 0;
        foreach ($rubriques as $r) {
            $rubrique = $this->carte->ajouterRubrique($r['nom'], $r['note'], $r['icone']);
            foreach ($r['articles'] as $a) {
                // Carte déjà en vigueur : pas de mention « Nouveau ».
                $this->carte->ajouterArticle($rubrique->id(), $a['nom'], $a['description'], $a['prixCents'], nouveau: false);
                ++$nombre;
            }
        }
        $output->writeln(sprintf('Carte chargée : %d rubriques, %d articles.', count($rubriques), $nombre));

        return Command::SUCCESS;
    }
}
