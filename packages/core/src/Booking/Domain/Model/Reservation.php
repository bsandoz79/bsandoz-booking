<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;

/** Réservation d'un client. Les données propres au métier sont dans $metierData (JSON). */
class Reservation
{
    private ReservationStatus $status = ReservationStatus::PendingPayment;
    private ?\DateTimeImmutable $holdExpiresAt = null;

    /**
     * @param list<string> $optionIds
     * @param array<string, mixed> $metierData
     */
    public function __construct(
        private string $id,
        private string $userId,
        private string $prestationId,
        private ?string $variante,
        private array $optionIds,
        private TimeRange $period,
        private string $address,
        private float $lat,
        private float $lng,
        private Money $total,
        private Money $deposit,
        private Money $travelFee,
        private array $metierData = [],
        private string $notes = '',
    ) {
    }

    public static function hold(self $reservation, \DateTimeImmutable $now, int $holdMinutes): self
    {
        $reservation->holdExpiresAt = $now->modify(sprintf('+%d minutes', $holdMinutes));
        return $reservation;
    }

    public function id(): string { return $this->id; }
    public function userId(): string { return $this->userId; }
    public function prestationId(): string { return $this->prestationId; }
    public function variante(): ?string { return $this->variante; }
    /** @return list<string> */
    public function optionIds(): array { return $this->optionIds; }
    public function period(): TimeRange { return $this->period; }
    public function address(): string { return $this->address; }
    public function lat(): float { return $this->lat; }
    public function lng(): float { return $this->lng; }
    public function status(): ReservationStatus { return $this->status; }
    public function total(): Money { return $this->total; }
    public function deposit(): Money { return $this->deposit; }
    public function travelFee(): Money { return $this->travelFee; }
    /** @return array<string, mixed> */
    public function metierData(): array { return $this->metierData; }
    public function notes(): string { return $this->notes; }

    public function blocks(\DateTimeImmutable $now): bool
    {
        if ($this->status === ReservationStatus::PendingPayment) {
            return $this->holdExpiresAt !== null && $this->holdExpiresAt > $now;
        }
        return $this->status->blocksSlot();
    }

    public function confirm(): void
    {
        if ($this->status !== ReservationStatus::PendingPayment) {
            throw new DomainError('Seule une réservation en attente de paiement peut être confirmée.');
        }
        $this->status = ReservationStatus::Confirmed;
        $this->holdExpiresAt = null;
    }

    /** @todo Vérifier la règle d'annulation gratuite (freeCancelHours) et renvoyer si l'acompte est remboursable. */
    public function cancel(\DateTimeImmutable $now, BookingRules $rules): bool
    {
        throw new \LogicException('À implémenter');
    }

    /** @todo Déplacer vers une nouvelle période (vérifier statut et règle de délai). */
    public function reschedule(TimeRange $newPeriod, \DateTimeImmutable $now, BookingRules $rules): void
    {
        throw new \LogicException('À implémenter');
    }

    public function markDone(): void { $this->status = ReservationStatus::Done; }
    public function markNoShow(): void { $this->status = ReservationStatus::NoShow; }
    public function expire(): void { $this->status = ReservationStatus::Expired; }
}
