<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Domain\Port;

use Bsandoz\Core\Abonnement\Domain\Model\Periodicite;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/** Prélèvements récurrents chez le prestataire de paiement (Stripe Billing en V1). */
interface PrestataireAbonnement
{
    /**
     * Session de souscription : le client enregistre sa carte et paie la première période.
     *
     * @return array{sessionId: string, url: string}
     * @throws DomainError paiement non configuré ou indisponible
     */
    public function creerSouscription(string $abonnementId, string $libelle, Money $prix, Periodicite $periodicite, string $email, string $successUrl, string $cancelUrl): array;

    /** Résiliation à la fin de la période payée. @throws DomainError refusée par le prestataire */
    public function resilierEnFinDePeriode(string $fournisseurId): void;
}
