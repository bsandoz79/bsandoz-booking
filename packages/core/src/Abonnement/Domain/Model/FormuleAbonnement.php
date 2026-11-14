<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Offre d'abonnement proposée par le pro : une prestation comprise (ex. « Extérieur Éclat »), un rythme (une prestation
 * par période) et un prix prélevé à chaque période. Pas « final » : Doctrine génère un proxy pour chaque entité.
 */
class FormuleAbonnement
{
    public function __construct(
        private string $id,
        private string $nom,
        private string $prestationId,
        private Periodicite $periodicite,
        private Money $prix,
        private string $description = '',
        private bool $active = true,
        private int $position = 0,
    ) {
        $this->verifier();
    }

    public function id(): string { return $this->id; }
    public function nom(): string { return $this->nom; }
    public function prestationId(): string { return $this->prestationId; }
    public function periodicite(): Periodicite { return $this->periodicite; }
    public function prix(): Money { return $this->prix; }
    public function description(): string { return $this->description; }
    public function estActive(): bool { return $this->active; }
    public function position(): int { return $this->position; }

    /** @throws DomainError nom vide, prestation absente ou prix nul */
    public function modifier(string $nom, string $prestationId, Periodicite $periodicite, Money $prix, string $description, bool $active, int $position): void
    {
        [$this->nom, $this->prestationId, $this->periodicite, $this->prix, $this->description, $this->active, $this->position]
            = [$nom, $prestationId, $periodicite, $prix, $description, $active, $position];
        $this->verifier();
    }

    private function verifier(): void
    {
        $this->nom = trim($this->nom);
        if ($this->nom === '') {
            throw new DomainError('Le nom de l\'abonnement est obligatoire.');
        }
        if (trim($this->prestationId) === '') {
            throw new DomainError('Choisissez la prestation comprise dans l\'abonnement.');
        }
        if ($this->prix->cents < 100) {
            throw new DomainError('Le prix de l\'abonnement est d\'au moins 1 €.');
        }
    }
}
