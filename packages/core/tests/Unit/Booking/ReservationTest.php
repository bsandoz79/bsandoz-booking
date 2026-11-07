<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;
use PHPUnit\Framework\TestCase;

final class ReservationTest extends TestCase
{
    private function utc(string $date): \DateTimeImmutable
    {
        return new \DateTimeImmutable($date, new \DateTimeZone('UTC'));
    }

    private function reservation(): Reservation
    {
        return new Reservation(
            id: 'r-1',
            userId: 'u-1',
            prestationId: 'p-1',
            variante: 'v-1',
            optionIds: ['o-1', 'o-2'],
            period: new TimeRange($this->utc('2026-11-10 08:00'), $this->utc('2026-11-10 10:00')),
            address: '1 rue de l\'Exemple',
            lat: 46.5,
            lng: 6.6,
            total: Money::cents(15900),
            deposit: Money::cents(4770),
            travelFee: Money::cents(1000),
            metierData: ['cle' => 'valeur'],
            notes: 'Portail bleu',
        );
    }

    public function testExposeSesDonnees(): void
    {
        $r = $this->reservation();

        self::assertSame('r-1', $r->id());
        self::assertSame('u-1', $r->userId());
        self::assertSame('p-1', $r->prestationId());
        self::assertSame('v-1', $r->variante());
        self::assertSame(['o-1', 'o-2'], $r->optionIds());
        self::assertSame(120, $r->period()->minutes());
        self::assertSame('1 rue de l\'Exemple', $r->address());
        self::assertSame(46.5, $r->lat());
        self::assertSame(6.6, $r->lng());
        self::assertSame(15900, $r->total()->cents);
        self::assertSame(4770, $r->deposit()->cents);
        self::assertSame(1000, $r->travelFee()->cents);
        self::assertSame(['cle' => 'valeur'], $r->metierData());
        self::assertSame('Portail bleu', $r->notes());
        self::assertSame(ReservationStatus::PendingPayment, $r->status());
    }

    public function testLeBlocageExpireApresLeDelai(): void
    {
        $now = $this->utc('2026-11-07 10:00');
        $r = Reservation::hold($this->reservation(), $now, 10);

        self::assertTrue($r->blocks($now->modify('+9 minutes')));
        self::assertFalse($r->blocks($now->modify('+10 minutes')));
    }

    public function testConfirmationUniquementDepuisAttenteDePaiement(): void
    {
        $r = $this->reservation();
        $r->confirm();
        self::assertSame(ReservationStatus::Confirmed, $r->status());
        self::assertTrue($r->blocks($this->utc('2026-11-07 10:00')));

        $this->expectException(DomainError::class);
        $r->confirm();
    }
}
