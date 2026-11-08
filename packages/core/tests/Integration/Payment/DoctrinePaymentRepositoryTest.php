<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Payment;

use Bsandoz\Core\Payment\Domain\Model\Payment;
use Bsandoz\Core\Payment\Domain\Model\PaymentStatus;
use Bsandoz\Core\Payment\Infrastructure\Persistence\DoctrinePaymentRepository;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

final class DoctrinePaymentRepositoryTest extends DoctrineTestCase
{
    private static function utc(string $datetime): \DateTimeImmutable
    {
        return new \DateTimeImmutable($datetime, new \DateTimeZone('UTC'));
    }

    public function testEnregistreEtRetrouveParSession(): void
    {
        $repository = new DoctrinePaymentRepository($this->em);
        $payment = new Payment('pay-1', 'r-1', 'cs_test_1', Money::cents(3000), self::utc('2026-11-07 10:00'));
        $payment->markPaid(self::utc('2026-11-07 10:05'));
        $payment->refund(Money::cents(1000));
        $repository->save($payment);
        $this->reload();

        $relu = $repository->bySessionId('cs_test_1');
        self::assertNotNull($relu);
        self::assertSame('r-1', $relu->reservationId());
        self::assertSame(3000, $relu->amount()->cents);
        self::assertSame(1000, $relu->refunded()->cents);
        self::assertSame(PaymentStatus::PartiallyRefunded, $relu->status());
        self::assertSame('2026-11-07T10:05:00+00:00', $relu->paidAt()?->format(DATE_ATOM));
        self::assertNull($repository->bySessionId('cs_inconnue'));
    }

    public function testPaiementEncaisseDeLaReservation(): void
    {
        $repository = new DoctrinePaymentRepository($this->em);
        $abandonne = new Payment('pay-1', 'r-1', 'cs_1', Money::cents(3000), self::utc('2026-11-07 10:00'));
        $paye = new Payment('pay-2', 'r-1', 'cs_2', Money::cents(3000), self::utc('2026-11-07 10:20'));
        $paye->markPaid(self::utc('2026-11-07 10:25'));
        $repository->save($abandonne);
        $repository->save($paye);
        $repository->save(new Payment('pay-3', 'r-2', 'cs_3', Money::cents(500), self::utc('2026-11-07 11:00')));
        $this->reload();

        self::assertSame('pay-2', $repository->paidForReservation('r-1')?->id(), 'la session abandonnée est ignorée');
        self::assertNull($repository->paidForReservation('r-2'), 'pas encore payé');
    }
}
