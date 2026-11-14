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
     * @param array<string, int> $produits produits ajoutés : identifiant → quantité
     * @param int $quantite nombre d'unités de la prestation (ex. véhicules)
     * @param bool|null $paiementEnLigne true : tout payer en ligne ; false : sur place ; null : acompte (et produits) en ligne
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
        public readonly array $produits = [],
        public readonly int $quantite = 1,
        public readonly ?bool $paiementEnLigne = null,
        /** @var list<string> formule combinée : la prestation choisie dans chaque catégorie */
        public readonly array $composantes = [],
    ) {
    }

    /** Rendez-vous pris par le pro (téléphone) : les conditions sont convenues avec le client. */
    public function avecConditionsAcceptees(): self
    {
        return new self(
            $this->prestationId, $this->optionIds, $this->metierData, $this->start, $this->address, $this->lat, $this->lng,
            $this->email, $this->firstname, $this->lastname, $this->phone, $this->notes, true, $this->variante, $this->produits, $this->quantite, $this->paiementEnLigne, $this->composantes,
        );
    }
}
