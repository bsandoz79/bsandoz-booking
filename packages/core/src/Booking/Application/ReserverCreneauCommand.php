<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

/** Données validées d'une demande de réservation (remplies depuis la requête HTTP). */
final class ReserverCreneauCommand
{
    /**
     * @param list<string> $optionIds
     * @param array<string, mixed> $metierData
     * @param \DateTimeImmutable $start début du créneau choisi (tel que renvoyé par /booking/slots)
     * @param float|null $lat null pour une activité sur place
     * @param string|null $variante variante explicite, si le module métier ne la déduit pas
     */
    public function __construct(
        public readonly string $prestationId,
        public readonly array $optionIds,
        public readonly array $metierData,
        public readonly \DateTimeImmutable $start,
        public readonly string $address,
        public readonly ?float $lat,
        public readonly ?float $lng,
        public readonly string $email,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly string $phone,
        public readonly string $notes,
        public readonly bool $acceptedTerms,
        public readonly ?string $variante = null,
    ) {
    }

    /** Rendez-vous pris par le pro (téléphone) : les conditions sont convenues avec le client. */
    public function avecConditionsAcceptees(): self
    {
        return new self(
            $this->prestationId, $this->optionIds, $this->metierData, $this->start, $this->address, $this->lat, $this->lng,
            $this->email, $this->firstname, $this->lastname, $this->phone, $this->notes, true, $this->variante,
        );
    }
}
