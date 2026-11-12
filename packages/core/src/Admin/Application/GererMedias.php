<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Application;

use Bsandoz\Core\Admin\Domain\Port\StockageMedias;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Photos du site envoyées par le pro. Seules les images JPEG, PNG et WebP sont acceptées, reconnues à leur contenu
 * (pas à leur nom), 5 Mo au plus. Le nom du fichier est choisi par le serveur.
 */
final class GererMedias
{
    public const TAILLE_MAX = 5 * 1024 * 1024;

    public function __construct(private StockageMedias $stockage)
    {
    }

    /** @throws DomainError fichier vide, trop lourd ou qui n'est pas une image acceptée */
    public function envoyer(string $contenu): string
    {
        if ($contenu === '') {
            throw new DomainError('Le fichier est vide.');
        }
        if (strlen($contenu) > self::TAILLE_MAX) {
            throw new DomainError('La photo dépasse 5 Mo : réduisez-la avant de l\'envoyer.');
        }

        return $this->stockage->enregistrer($contenu, self::extension($contenu));
    }

    /** @throws DomainError nom invalide */
    public function supprimer(string $nom): void
    {
        if (preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/', $nom) !== 1) {
            throw new DomainError('Nom de photo invalide.');
        }
        $this->stockage->supprimer($nom);
    }

    /** @return list<string> */
    public function lister(): array
    {
        return $this->stockage->lister();
    }

    private static function extension(string $contenu): string
    {
        return match (true) {
            str_starts_with($contenu, "\xFF\xD8\xFF") => 'jpg',
            str_starts_with($contenu, "\x89PNG\r\n\x1A\n") => 'png',
            strlen($contenu) >= 12 && substr($contenu, 0, 4) === 'RIFF' && substr($contenu, 8, 4) === 'WEBP' => 'webp',
            default => throw new DomainError('Seules les photos JPEG, PNG ou WebP sont acceptées.'),
        };
    }
}
