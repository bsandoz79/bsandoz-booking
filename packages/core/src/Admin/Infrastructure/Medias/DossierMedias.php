<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Infrastructure\Medias;

use Bsandoz\Core\Admin\Domain\Port\StockageMedias;

/**
 * Photos rangées dans un dossier servi par le serveur web (par défaut `public/medias` de l'application),
 * sous un nom aléatoire. Le dossier est créé au premier envoi.
 */
final class DossierMedias implements StockageMedias
{
    public function __construct(private string $dossier)
    {
    }

    public function enregistrer(string $contenu, string $extension): string
    {
        if (!is_dir($this->dossier) && !mkdir($this->dossier, 0755, true) && !is_dir($this->dossier)) {
            throw new \RuntimeException(sprintf('Impossible de créer le dossier des photos « %s ».', $this->dossier));
        }
        $nom = bin2hex(random_bytes(16)) . '.' . $extension;
        if (file_put_contents($this->dossier . '/' . $nom, $contenu) === false) {
            throw new \RuntimeException('Impossible d\'enregistrer la photo.');
        }

        return $nom;
    }

    public function supprimer(string $nom): void
    {
        $chemin = $this->dossier . '/' . basename($nom);
        if (is_file($chemin)) {
            unlink($chemin);
        }
    }

    public function lister(): array
    {
        $fichiers = glob($this->dossier . '/*.{jpg,png,webp}', GLOB_BRACE) ?: [];
        usort($fichiers, static fn (string $a, string $b): int => (filemtime($b) ?: 0) <=> (filemtime($a) ?: 0));

        return array_map(static fn (string $f): string => basename($f), $fichiers);
    }
}
