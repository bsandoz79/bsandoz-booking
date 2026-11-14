<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Domain\Port;

use Bsandoz\Core\Abonnement\Domain\Model\PaiementAbonnement;

interface PaiementsAbonnement
{
    public function existe(string $factureFournisseurId): bool;

    /** @return list<PaiementAbonnement> prélèvements reçus entre ces dates (début inclus, fin exclue) */
    public function entre(\DateTimeImmutable $debut, \DateTimeImmutable $fin): array;

    public function save(PaiementAbonnement $paiement): void;
}
