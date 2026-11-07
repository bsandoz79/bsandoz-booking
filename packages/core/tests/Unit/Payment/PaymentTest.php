<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Payment;

use Bsandoz\Core\Payment\Domain\Model\EvenementPaiement;
use Bsandoz\Core\Payment\Domain\Model\Payment;
use Bsandoz\Core\Payment\Domain\Model\PaymentStatus;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\TestCase;

final class PaymentTest extends TestCase
{
    private static function payment(): Payment
    {
        return new Payment('pay-1', 'r-1', 'cs_test_1', Money::cents(3000), new \DateTimeImmutable('2026-11-07 10:00'));
    }

    public function testEnAttentePuisPayeUneSeuleFois(): void
    {
        $p = self::payment();
        $now = new \DateTimeImmutable('2026-11-07 10:05');

        self::assertSame(PaymentStatus::Pending, $p->status());
        self::assertSame(0, $p->refundable()->cents, 'rien à rembourser avant encaissement');
        self::assertTrue($p->markPaid($now));
        self::assertFalse($p->markPaid($now->modify('+1 minute')), 'deuxième notification ignorée');
        self::assertSame($now, $p->paidAt());
        self::assertSame(3000, $p->refundable()->cents);
    }

    public function testRemboursementPartielPuisTotal(): void
    {
        $p = self::payment();
        $p->markPaid(new \DateTimeImmutable());

        $p->refund(Money::cents(1000));
        self::assertSame(PaymentStatus::PartiallyRefunded, $p->status());
        self::assertSame(2000, $p->refundable()->cents);

        $p->refund(Money::cents(2000));
        self::assertSame(PaymentStatus::Refunded, $p->status());
        self::assertSame(3000, $p->refunded()->cents);
        self::assertSame(0, $p->refundable()->cents);
    }

    public function testRemboursementSuperieurAuResteRefuse(): void
    {
        $p = self::payment();
        $p->markPaid(new \DateTimeImmutable());

        $this->expectException(DomainError::class);
        $p->refund(Money::cents(3001));
    }

    public function testRemboursementNulRefuse(): void
    {
        $p = self::payment();
        $p->markPaid(new \DateTimeImmutable());

        $this->expectException(DomainError::class);
        $p->refund(Money::zero());
    }

    public function testRemboursementAvantEncaissementRefuse(): void
    {
        $this->expectException(DomainError::class);
        self::payment()->refund(Money::cents(100));
    }

    public function testSeuleUneSessionRegleeConfirme(): void
    {
        self::assertTrue((new EvenementPaiement('evt_1', 'checkout.session.completed', 'cs_1', true))->confirmeUnPaiement());
        self::assertFalse((new EvenementPaiement('evt_2', 'checkout.session.completed', 'cs_1', false))->confirmeUnPaiement(), 'paiement différé non encore réglé');
        self::assertFalse((new EvenementPaiement('evt_3', 'checkout.session.expired', 'cs_1', false))->confirmeUnPaiement());
        self::assertFalse((new EvenementPaiement('evt_4', 'charge.refunded', null, true))->confirmeUnPaiement());
    }
}
