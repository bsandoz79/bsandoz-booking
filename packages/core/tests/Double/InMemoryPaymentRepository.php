<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Payment\Domain\Model\Payment;
use Bsandoz\Core\Payment\Domain\Port\PaymentRepository;

final class InMemoryPaymentRepository implements PaymentRepository
{
    /** @var array<string, Payment> */
    private array $items = [];

    public function save(Payment $payment): void
    {
        $this->items[$payment->id()] = $payment;
    }

    public function bySessionId(string $sessionId): ?Payment
    {
        foreach ($this->items as $payment) {
            if ($payment->providerSessionId() === $sessionId) {
                return $payment;
            }
        }

        return null;
    }

    public function paidForReservation(string $reservationId): ?Payment
    {
        $paid = array_filter($this->items, static fn (Payment $p): bool => $p->reservationId() === $reservationId && $p->isPaid());
        usort($paid, static fn (Payment $a, Payment $b): int => $b->paidAt() <=> $a->paidAt());

        return $paid[0] ?? null;
    }
}
