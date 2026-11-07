<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;

/** Règles de réservation réglées par le pro. */
final class BookingRules
{
    public function __construct(
        public readonly int $minNoticeHours = 24,
        public readonly int $horizonDays = 60,
        public readonly int $bufferMin = 15,
        public readonly int $slotStepMin = 30,
        public readonly int $freeCancelHours = 48,
        public readonly ?int $depositPercent = 30,
        public readonly ?int $depositFixedCents = null,
        public readonly int $holdMinutes = 10,
    ) {
        if ($minNoticeHours < 0 || $bufferMin < 0 || $freeCancelHours < 0) {
            throw new DomainError('Le délai minimum, le tampon et le délai d\'annulation ne peuvent pas être négatifs.');
        }
        if ($horizonDays < 1) {
            throw new DomainError('L\'horizon de réservation doit être d\'au moins un jour.');
        }
        if ($slotStepMin < 5) {
            throw new DomainError('Le pas entre deux créneaux doit être d\'au moins 5 minutes.');
        }
        if ($depositPercent !== null && ($depositPercent < 0 || $depositPercent > 100)) {
            throw new DomainError('Le pourcentage d\'acompte doit être compris entre 0 et 100.');
        }
        if ($depositFixedCents !== null && $depositFixedCents < 0) {
            throw new DomainError('L\'acompte fixe ne peut pas être négatif.');
        }
        if ($holdMinutes < 1) {
            throw new DomainError('Le blocage d\'un créneau en attente de paiement doit durer au moins une minute.');
        }
    }
}
