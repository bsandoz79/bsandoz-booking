<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Shared\Domain\Money;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Console\Tester\CommandTester;

/** Réservation de bout en bout (horloge figée au 01/11/2026 10:00 UTC ; mardi 10/11 ouvert 08:00–12:00, Paris). */
final class ReservationApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    private const LAT = 49.8941;
    private const LNG = 2.2958;

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        self::reinitialiserLimites();
        $em = $this->em();
        $schema = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);

        $em->persist(new OpeningHour(2, '08:00', '12:00'));
        $em->persist(new Prestation('interieur', 'Intérieur', Money::cents(6900), 90));
        $em->flush();
    }

    private function em(): EntityManagerInterface
    {
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);

        return $em;
    }

    /** @param array<string, mixed> $overrides */
    private function reserve(array $overrides = []): void
    {
        $body = $overrides + [
            'prestationId' => 'interieur',
            'optionIds' => [],
            'metierData' => ['vehicleType' => 'citadine'],
            'start' => '2026-11-10T08:00:00+00:00', // 09:00 à Paris
            'address' => ['label' => '1 rue de l\'Exemple, Amiens', 'lat' => self::LAT, 'lng' => self::LNG],
            'firstname' => 'Camille',
            'lastname' => 'Martin',
            'email' => 'camille@example.test',
            'phone' => '0600000000',
            'notes' => 'Portail bleu',
            'acceptedTerms' => true,
        ];
        $this->client->request('POST', '/api/v1/booking/reservations', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode($body, JSON_THROW_ON_ERROR));
    }

    /** @return array<mixed> */
    private function json(): array
    {
        return (array) json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }

    public function testReservationCreeeEnAttenteDeLAcompte(): void
    {
        $this->reserve();

        self::assertResponseStatusCodeSame(201);
        $resultat = $this->json();
        self::assertSame('pending_payment', $resultat['status']);
        self::assertSame(6900, $resultat['totalCents']);
        self::assertSame(2070, $resultat['depositCents']);
        self::assertSame('2026-11-01T10:10:00+00:00', $resultat['holdExpiresAt']);
        self::assertNull($resultat['paymentUrl']);

        $reservation = $this->em()->find(Reservation::class, $resultat['reservationId']);
        self::assertInstanceOf(Reservation::class, $reservation);
        self::assertSame(ReservationStatus::PendingPayment, $reservation->status());
        self::assertSame('citadine', $reservation->variante(), 'variante déduite par le résolveur detailing');
    }

    public function testLeCreneauReserveDisparaitDuCalendrier(): void
    {
        $this->reserve();
        $this->client->request('GET', sprintf('/api/v1/booking/slots?date=2026-11-10&duration=90&lat=%s&lng=%s', self::LAT, self::LNG));

        self::assertNotContains('09:00', array_column($this->json(), 'label'));
    }

    public function testDeuxiemeReservationDuMemeCreneauEn422(): void
    {
        $this->reserve();
        $this->reserve(['email' => 'autre@example.test']);

        self::assertResponseStatusCodeSame(422);
        self::assertStringContainsString('plus disponible', (string) ($this->json()['detail'] ?? ''));
    }

    public function testConditionsGeneralesNonAccepteesEn422(): void
    {
        $this->reserve(['acceptedTerms' => false]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testCorpsInvalideEn400(): void
    {
        $this->reserve(['start' => '10/11/2026 9h']);

        self::assertResponseStatusCodeSame(400);
    }

    public function testCommandeDExpirationDesBlocages(): void
    {
        $this->reserve();
        self::assertResponseStatusCodeSame(201);

        $tester = new CommandTester((new Application(self::$kernel ?? self::bootKernel()))->find('bsandoz:reservations:expirer'));
        $tester->execute([]);

        self::assertStringContainsString('0 réservation(s) expirée(s)', $tester->getDisplay(), 'horloge figée : le blocage court encore');
    }
}
