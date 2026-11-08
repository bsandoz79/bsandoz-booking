<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Notification\Application\FluxAgendaPro;
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use PHPUnit\Framework\TestCase;

final class FluxAgendaProTest extends TestCase
{
    public function testRendezVousConfirmesDansLeFlux(): void
    {
        $utc = new \DateTimeZone('UTC');
        $reservations = new InMemoryReservationRepository();
        $creer = static function (string $id, string $start, bool $confirmer) use ($reservations, $utc): void {
            $debut = new \DateTimeImmutable($start, $utc);
            $r = new Reservation($id, 'u-1', 'p-1', null, [], new TimeRange($debut, $debut->modify('+1 hour')), '1 rue de l\'Exemple', 0.0, 0.0, Money::cents(6900), Money::zero(), Money::zero(), [], 'Portail bleu');
            if ($confirmer) {
                $r->confirm();
            }
            $reservations->save($r);
        };
        $creer('confirmee', '2026-11-10 08:00', true);
        $creer('en-attente', '2026-11-11 08:00', false);
        $creer('ancienne', '2026-09-01 08:00', true);

        $users = new InMemoryUserRepository();
        $users->save(new User('u-1', 'camille@example.test', 'Camille', 'Martin', '0600000000'));
        $flux = new FluxAgendaPro($reservations, $users, new InMemoryPrestationRepository(new Prestation('p-1', 'Nettoyage', Money::cents(6900), 60)), new IcsGenerator(), new FrozenClock('2026-11-07 10:00'), 'Marque');

        $ics = str_replace("\r\n ", '', $flux());

        self::assertStringContainsString('X-WR-CALNAME:Marque', $ics);
        self::assertSame(1, substr_count($ics, 'BEGIN:VEVENT'), 'seulement le rendez-vous confirmé et récent');
        self::assertStringContainsString('UID:confirmee@bsandoz', $ics);
        self::assertStringContainsString('SUMMARY:Nettoyage – Camille Martin', $ics);
        self::assertStringContainsString("LOCATION:1 rue de l'Exemple", $ics);
        self::assertStringContainsString('DESCRIPTION:Téléphone : 0600000000\nTotal : 69\,00 €\nInformations : Portail bleu', $ics);
    }
}
