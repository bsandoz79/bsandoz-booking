<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Infrastructure\Persistence\DoctrineUserRepository;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Infrastructure\Persistence\DoctrineReservationRepository;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;

/** L'adresse et le téléphone sont chiffrés en base, en clair dans le domaine. */
final class DonneesChiffreesTest extends DoctrineTestCase
{
    public function testTelephoneChiffreEnBase(): void
    {
        $users = new DoctrineUserRepository($this->em);
        $users->save(new User('u-1', 'camille@example.test', 'Camille', 'Martin', '06 12 34 56 78'));
        $this->reload();

        $brut = (string) $this->em->getConnection()->fetchOne('SELECT phone FROM user_account');
        self::assertStringStartsWith('enc:v1:', $brut);
        self::assertStringNotContainsString('12 34', $brut);
        self::assertSame('06 12 34 56 78', $users->get('u-1')->phone());
        self::assertSame('camille@example.test', $this->em->getConnection()->fetchOne('SELECT email FROM user_account'), 'e-mail en clair : nécessaire pour la connexion');
    }

    public function testAdresseChiffreeEnBase(): void
    {
        $utc = new \DateTimeZone('UTC');
        $reservations = new DoctrineReservationRepository($this->em);
        $reservations->save(new Reservation(
            'r-1', 'u-1', 'p-1', null, [],
            new TimeRange(new \DateTimeImmutable('2026-11-10 08:00', $utc), new \DateTimeImmutable('2026-11-10 09:00', $utc)),
            '12 rue de l\'Exemple, 80000 Amiens', 49.89, 2.29, Money::cents(100), Money::zero(), Money::zero(),
        ));
        $this->reload();

        $brut = (string) $this->em->getConnection()->fetchOne('SELECT address FROM reservation');
        self::assertStringStartsWith('enc:v1:', $brut);
        self::assertStringNotContainsString('Amiens', $brut);
        self::assertSame('12 rue de l\'Exemple, 80000 Amiens', $reservations->get('r-1')->address());
    }

    public function testAncienneValeurEnClairToujoursLisible(): void
    {
        $users = new DoctrineUserRepository($this->em);
        $users->save(new User('u-1', 'camille@example.test', 'Camille', 'Martin', '0600000000'));
        $this->em->getConnection()->executeStatement("UPDATE user_account SET phone = '0611111111'");
        $this->reload();

        self::assertSame('0611111111', $users->get('u-1')->phone());
    }
}
