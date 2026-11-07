<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Shared\Domain\Money;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Lien « gérer mon rendez-vous » de bout en bout (horloge figée au 01/11/2026 10:00 UTC, acompte 30 %).
 * Mardis ouverts 08:00–12:00 (Paris) ; réservation le mardi 10/11 à 09:00.
 */
final class ManageApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    private const LAT = 49.8941;
    private const LNG = 2.2958;

    private KernelBrowser $client;
    private string $token;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        self::reinitialiserLimites();
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);
        $schema = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);
        $em->persist(new OpeningHour(2, '08:00', '12:00'));
        $em->persist(new Prestation('interieur', 'Intérieur', Money::cents(6900), 60));
        $em->flush();

        $this->request('POST', '/api/v1/booking/reservations', [
            'prestationId' => 'interieur',
            'start' => '2026-11-10T08:00:00+00:00',
            'address' => ['label' => '1 rue de l\'Exemple, Amiens', 'lat' => self::LAT, 'lng' => self::LNG],
            'firstname' => 'Camille', 'lastname' => 'Martin', 'email' => 'camille@example.test', 'phone' => '0600000000',
            'acceptedTerms' => true,
        ]);
        self::assertResponseStatusCodeSame(201);
        $token = $this->json()['manageToken'] ?? null;
        self::assertIsString($token);
        $this->token = $token;
    }

    /** @param array<string, mixed>|null $body */
    private function request(string $method, string $uri, ?array $body = null): void
    {
        $this->client->request($method, $uri, server: ['CONTENT_TYPE' => 'application/json'], content: $body === null ? null : json_encode($body, JSON_THROW_ON_ERROR));
    }

    /** @return array<mixed> */
    private function json(): array
    {
        return (array) json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }

    public function testVoirLaReservation(): void
    {
        $this->request('GET', '/api/v1/booking/manage/' . $this->token);

        self::assertResponseIsSuccessful();
        $vue = $this->json();
        self::assertSame('pending_payment', $vue['status']);
        self::assertSame('2026-11-10T08:00:00+00:00', $vue['start']);
        self::assertSame('2026-11-08T08:00:00+00:00', $vue['freeCancelUntil'], '48 h avant');
        self::assertSame(6900, $vue['totalCents']);
    }

    public function testAnnulerDepuisLeLien(): void
    {
        $this->request('DELETE', '/api/v1/booking/manage/' . $this->token);

        self::assertResponseIsSuccessful();
        self::assertSame(['refundable' => false], $this->json(), 'en attente de paiement : rien à rembourser');

        $this->request('GET', '/api/v1/booking/manage/' . $this->token);
        self::assertSame('cancelled', $this->json()['status']);
    }

    public function testDeplacerUneReservationNonConfirmeeEn422(): void
    {
        $this->request('PATCH', '/api/v1/booking/manage/' . $this->token, ['start' => '2026-11-17T09:00:00+00:00']);

        self::assertResponseStatusCodeSame(422, 'seule une réservation confirmée (acompte payé) peut être déplacée');
    }

    public function testDeplacementSansDateEn400(): void
    {
        $this->request('PATCH', '/api/v1/booking/manage/' . $this->token, ['start' => 'mardi']);

        self::assertResponseStatusCodeSame(400);
    }

    public function testLienInconnuEn404(): void
    {
        $this->request('GET', '/api/v1/booking/manage/' . str_repeat('0', 64));

        self::assertResponseStatusCodeSame(404);
        self::assertResponseHeaderSame('Content-Type', 'application/problem+json');
    }
}
