<?php

declare(strict_types=1);

namespace Bsandoz\Core\Facturation\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Facture d'une prestation réalisée : numéro unique et chronologique (F-AAAA-NNNN), vendeur, client et lignes figés au
 * moment de l'émission (une facture ne se modifie plus). Facture acquittée : réglée en ligne et / ou sur place.
 * Pas « final » : Doctrine génère un proxy (lazy ghost) pour chaque entité.
 */
class Facture
{
    /**
     * @param array<string, string> $vendeur nom, adresse, siret, mentionTva, email, telephone
     * @param array<string, string> $client nom, email, adresse, entreprise, siret, adresseFacturation
     * @param list<array{libelle: string, montantCents: int}> $lignes
     */
    public function __construct(
        private string $id,
        private string $numero,
        private string $reservationId,
        private string $userId,
        private \DateTimeImmutable $emiseLe,
        private \DateTimeImmutable $prestationLe,
        private array $vendeur,
        private array $client,
        private array $lignes,
        private Money $total,
        private Money $payeEnLigne,
    ) {
        if (!preg_match('/^F-\d{4}-\d{4,}$/', $numero)) {
            throw new DomainError('Numéro de facture invalide.');
        }
        if ($lignes === []) {
            throw new DomainError('Une facture a au moins une ligne.');
        }
    }

    public function id(): string { return $this->id; }
    public function numero(): string { return $this->numero; }
    public function reservationId(): string { return $this->reservationId; }
    public function userId(): string { return $this->userId; }
    public function emiseLe(): \DateTimeImmutable { return $this->emiseLe; }
    public function prestationLe(): \DateTimeImmutable { return $this->prestationLe; }
    /** @return array<string, string> */
    public function vendeur(): array { return $this->vendeur; }
    /** @return array<string, string> */
    public function client(): array { return $this->client; }
    /** @return list<array{libelle: string, montantCents: int}> */
    public function lignes(): array { return $this->lignes; }
    public function total(): Money { return $this->total; }
    public function payeEnLigne(): Money { return $this->payeEnLigne; }
    /** Réglé sur place (le reste du total). */
    public function payeSurPlace(): Money { return $this->total->subtract($this->payeEnLigne->min($this->total)); }

    /** Numéro suivant dans l'année : F-2026-0007 → F-2026-0008 ; aucun numéro cette année → F-2026-0001. */
    public static function numeroSuivant(?string $dernier, int $annee): string
    {
        $suivant = $dernier !== null && str_starts_with($dernier, sprintf('F-%d-', $annee)) ? (int) substr($dernier, 7) + 1 : 1;

        return sprintf('F-%d-%04d', $annee, $suivant);
    }
}
