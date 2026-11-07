<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Calendrier de bout en bout (horloge figée au 01/11/2026 10:00 UTC en test, zone de démo autour d'Amiens).
 * Mardi 10/11/2026 ouvert 08:00–12:00 et 14:00–18:00.
 */
final class CreneauxApiTest extends WebTestCase
{
    // Adresse au point de départ de la zone de démo : aucun trajet.
    private const LAT = 49.8941;
    private const LNG = 2.2958;

    private KernelBrowser $client;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);
        $this->em = $em;
        $schema = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);

        $em->persist(new OpeningHour(2, '08:00', '12:00'));
        $em->persist(new OpeningHour(2, '14:00', '18:00'));
        $em->persist(new Prestation('complet', 'Complet', Money::cents(10900), 150, occupePlage: true));
        $em->flush();
    }

    /** @return array<mixed> */
    private function get(string $uri): array
    {
        $this->client->request('GET', $uri);

        return (array) json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }

    public function testJoursDisponibles(): void
    {
        $days = $this->get(sprintf('/api/v1/booking/days?month=2026-11&duration=60&lat=%s&lng=%s', self::LAT, self::LNG));

        self::assertResponseIsSuccessful();
        self::assertSame(['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24'], $days);
    }

    public function testCreneauxDuJourAvecLibelleEnHeureLocale(): void
    {
        $slots = $this->get(sprintf('/api/v1/booking/slots?date=2026-11-10&duration=60&lat=%s&lng=%s', self::LAT, self::LNG));

        self::assertResponseIsSuccessful();
        self::assertSame(['start' => '2026-11-10T07:00:00+00:00', 'end' => '2026-11-10T08:00:00+00:00', 'label' => '08:00'], $slots[0]);
    }

    public function testPrestationADureeIncertaineEnDemiJournee(): void
    {
        $slots = $this->get(sprintf('/api/v1/booking/slots?date=2026-11-10&duration=150&lat=%s&lng=%s&prestation=complet', self::LAT, self::LNG));

        self::assertResponseIsSuccessful();
        self::assertSame(['08:00', '14:00'], array_column($slots, 'label'));
    }

    public function testUneReservationConfirmeeRetireLesCreneaux(): void
    {
        $paris = new \DateTimeZone('Europe/Paris');
        $r = new Reservation(
            'r-1', 'u-1', 'complet', null, [],
            new TimeRange(new \DateTimeImmutable('2026-11-10 08:00', $paris), new \DateTimeImmutable('2026-11-10 12:00', $paris)),
            'adresse', self::LAT, self::LNG, Money::cents(10900), Money::cents(3270), Money::zero(),
        );
        $r->confirm();
        $this->em->persist($r);
        $this->em->flush();

        $slots = $this->get(sprintf('/api/v1/booking/slots?date=2026-11-10&duration=60&lat=%s&lng=%s', self::LAT, self::LNG));

        self::assertSame('14:00', $slots[0]['label'] ?? null);
    }

    public function testAdresseHorsZoneEn422(): void
    {
        $this->get('/api/v1/booking/slots?date=2026-11-10&duration=60&lat=48.8566&lng=2.3522');

        self::assertResponseStatusCodeSame(422);
        self::assertResponseHeaderSame('Content-Type', 'application/problem+json');
    }

    public function testParametresInvalidesEn400(): void
    {
        $this->get('/api/v1/booking/slots?date=2026-11-10&duration=0');
        self::assertResponseStatusCodeSame(400);

        $this->get(sprintf('/api/v1/booking/days?duration=60&lat=%s&lng=%s', self::LAT, self::LNG));
        self::assertResponseStatusCodeSame(400);
    }

    public function testDateInvalideEn422(): void
    {
        $this->get(sprintf('/api/v1/booking/slots?date=10-11-2026&duration=60&lat=%s&lng=%s', self::LAT, self::LNG));

        self::assertResponseStatusCodeSame(422);
    }
}
