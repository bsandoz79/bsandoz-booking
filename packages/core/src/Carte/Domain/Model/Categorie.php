<?php

declare(strict_types=1);

namespace Bsandoz\Core\Carte\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;

/** Une rubrique de la carte (ex. « Sandwichs », « Boissons »), dans l'ordre choisi par le pro. */
final class Categorie
{
    public const NOM_MAX = 60;

    public function __construct(
        private string $id,
        private string $nom,
        private int $position = 0,
    ) {
        $this->renommer($nom);
    }

    public function id(): string { return $this->id; }
    public function nom(): string { return $this->nom; }
    public function position(): int { return $this->position; }

    public function renommer(string $nom): void
    {
        $nom = trim($nom);
        if ($nom === '') {
            throw new DomainError('Le nom de la rubrique est obligatoire.');
        }
        if (mb_strlen($nom) > self::NOM_MAX) {
            throw new DomainError(sprintf('Le nom de la rubrique est limité à %d caractères.', self::NOM_MAX));
        }
        $this->nom = $nom;
    }

    public function changerPosition(int $position): void
    {
        $this->position = max(0, $position);
    }
}
