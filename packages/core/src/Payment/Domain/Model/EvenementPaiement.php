<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain\Model;

/**
 * Notification du prestataire de paiement (webhook), après vérification de sa signature.
 * Abonnements : la souscription (session en mode « subscription »), chaque prélèvement payé ou refusé, et la fin.
 */
final class EvenementPaiement
{
    public const SESSION_TERMINEE = 'checkout.session.completed';
    public const PRELEVEMENT_PAYE = 'invoice.paid';
    public const PRELEVEMENT_REFUSE = 'invoice.payment_failed';
    public const ABONNEMENT_TERMINE = 'customer.subscription.deleted';

    public function __construct(
        public readonly string $id,
        public readonly string $type,
        public readonly ?string $sessionId,
        public readonly bool $paye,
        /** Session : « payment » (réservation) ou « subscription » (abonnement). */
        public readonly ?string $mode = null,
        /** Notre identifiant d'abonnement (métadonnées envoyées au prestataire), s'il est connu. */
        public readonly ?string $abonnementId = null,
        /** Identifiant de la souscription chez le prestataire. */
        public readonly ?string $souscriptionId = null,
        /** Prélèvement : facture du prestataire, montant et période payée (horodatages Unix). */
        public readonly ?string $factureId = null,
        public readonly ?int $montantCents = null,
        public readonly ?int $debutPeriode = null,
        public readonly ?int $finPeriode = null,
    ) {
    }

    /** Session de paiement réglée : la seule notification qui confirme une réservation. */
    public function confirmeUnPaiement(): bool
    {
        return $this->type === self::SESSION_TERMINEE && $this->paye && $this->sessionId !== null && $this->mode !== 'subscription';
    }

    /** Notification qui concerne un abonnement (souscription, prélèvement, fin). */
    public function concerneUnAbonnement(): bool
    {
        return ($this->type === self::SESSION_TERMINEE && $this->mode === 'subscription')
            || in_array($this->type, [self::PRELEVEMENT_PAYE, self::PRELEVEMENT_REFUSE, self::ABONNEMENT_TERMINE], true);
    }
}
