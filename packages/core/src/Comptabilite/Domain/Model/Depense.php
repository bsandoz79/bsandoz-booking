<?php

declare(strict_types=1);

namespace Bsandoz\Core\Comptabilite\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Dépense saisie par le pro (produits, carburant, assurance…). Mensuelle : comptée chaque mois à partir de sa date,
 * jusqu'au mois où elle est arrêtée (inclus).
 * Pas « final » : Doctrine génère un proxy pour chaque entité.
 */
class Depense
{
    public function __construct(
        private string $id,
        private \DateTimeImmutable $le,
        private string $libelle,
        private Money $montant,
        private bool $mensuelle = false,
        private ?\DateTimeImmutable $finLe = null,
    ) {
        $libelle = trim($libelle);
        if ($libelle === '' || mb_strlen($libelle) > 120) {
            throw new DomainError('Libellé de la dépense : 1 à 120 caractères.');
        }
        if ($montant->cents <= 0) {
            throw new DomainError('Le montant de la dépense doit être positif.');
        }
        $this->libelle = $libelle;
        $this->le = $le->setTime(0, 0);
    }

    public function id(): string { return $this->id; }
    public function le(): \DateTimeImmutable { return $this->le; }
    public function libelle(): string { return $this->libelle; }
    public function montant(): Money { return $this->montant; }
    public function mensuelle(): bool { return $this->mensuelle; }
    public function finLe(): ?\DateTimeImmutable { return $this->finLe; }

    /** Dépense mensuelle arrêtée : plus comptée après le mois de $le. @throws DomainError ponctuelle ou avant le début */
    public function arreter(\DateTimeImmutable $le): void
    {
        if (!$this->mensuelle) {
            throw new DomainError('Seule une dépense mensuelle peut être arrêtée.');
        }
        if ($le < $this->le) {
            throw new DomainError('Une dépense mensuelle ne peut pas s\'arrêter avant son début.');
        }
        $this->finLe = $le->setTime(0, 0);
    }

    /** Montant compté pour le mois « AAAA-MM ». */
    public function pourLeMois(string $mois): Money
    {
        $debut = $this->le->format('Y-m');
        if (!$this->mensuelle) {
            return $debut === $mois ? $this->montant : Money::zero();
        }
        $fin = $this->finLe?->format('Y-m');

        return $mois >= $debut && ($fin === null || $mois <= $fin) ? $this->montant : Money::zero();
    }
}
