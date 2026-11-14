<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Domain\Model;

use Bsandoz\Core\Shared\Domain\Money;

/** Prélèvement reçu pour un abonnement (une période), pour la comptabilité. Une seule fois par facture du prestataire. */
class PaiementAbonnement
{
    public function __construct(
        private string $id,
        private string $abonnementId,
        private string $factureFournisseurId,
        private Money $montant,
        private \DateTimeImmutable $payeLe,
    ) {
    }

    public function id(): string { return $this->id; }
    public function abonnementId(): string { return $this->abonnementId; }
    public function factureFournisseurId(): string { return $this->factureFournisseurId; }
    public function montant(): Money { return $this->montant; }
    public function payeLe(): \DateTimeImmutable { return $this->payeLe; }
}
