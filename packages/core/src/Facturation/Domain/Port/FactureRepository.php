<?php

declare(strict_types=1);

namespace Bsandoz\Core\Facturation\Domain\Port;

use Bsandoz\Core\Facturation\Domain\Model\Facture;
use Bsandoz\Core\Shared\Domain\NotFound;

interface FactureRepository
{
    /** @throws NotFound */
    public function get(string $id): Facture;

    public function pourReservation(string $reservationId): ?Facture;

    /** @return list<Facture> factures d'un client, de la plus récente à la plus ancienne */
    public function pourClient(string $userId): array;

    /** @return list<Facture> toutes les factures (espace pro), de la plus récente à la plus ancienne */
    public function toutes(): array;

    /** Dernier numéro émis pour l'année (F-AAAA-NNNN), ou null. */
    public function dernierNumero(int $annee): ?string;

    public function save(Facture $facture): void;
}
