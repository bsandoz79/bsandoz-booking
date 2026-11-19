<?php

declare(strict_types=1);

namespace Bsandoz\Core\Carte\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;

/** Entité Doctrine : pas « final » (Doctrine crée des objets chargés à la demande à partir d’elle).
 * Une rubrique de la carte (ex. « Sandwichs », « Boissons »), dans l'ordre choisi par le pro,
 * avec une note facultative (ex. « Avec frites : + 1 € ») et un pictogramme facultatif (clé choisie par le site). */
class Categorie
{
    public const NOM_MAX = 60;
    public const NOTE_MAX = 200;

    private string $note = '';
    private ?string $icone = null;

    public function __construct(
        private string $id,
        private string $nom,
        private int $position = 0,
        string $note = '',
        ?string $icone = null,
    ) {
        $this->renommer($nom);
        $this->changerNote($note);
        $this->changerIcone($icone);
    }

    public function id(): string { return $this->id; }
    public function nom(): string { return $this->nom; }
    public function position(): int { return $this->position; }
    public function note(): string { return $this->note; }
    public function icone(): ?string { return $this->icone; }

    public function changerNote(string $note): void
    {
        $note = trim($note);
        if (mb_strlen($note) > self::NOTE_MAX) {
            throw new DomainError(sprintf('La note de la rubrique est limitée à %d caractères.', self::NOTE_MAX));
        }
        $this->note = $note;
    }

    /** Clé du pictogramme (ex. « burger ») : lettres minuscules, chiffres et tirets ; vide ou null : aucun. */
    public function changerIcone(?string $icone): void
    {
        $icone = $icone === null ? '' : trim($icone);
        if ($icone !== '' && preg_match('/^[a-z0-9-]{1,40}$/', $icone) !== 1) {
            throw new DomainError('Pictogramme inconnu.');
        }
        $this->icone = $icone === '' ? null : $icone;
    }

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
