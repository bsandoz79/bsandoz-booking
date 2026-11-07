<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

/** Données validées d'une demande de réservation (rempli depuis le DTO HTTP). */
final class ReserverCreneauCommand
{
    /**
     * @param list<string> $optionIds
     * @param array<string, mixed> $metierData
     */
    public function __construct(
        public readonly string $prestationId,
        public readonly array $optionIds,
        public readonly array $metierData,
        public readonly \DateTimeImmutable $start,
        public readonly string $address,
        public readonly float $lat,
        public readonly float $lng,
        public readonly string $email,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly string $phone,
        public readonly string $notes,
        public readonly bool $acceptedTerms,
    ) {
    }
}
