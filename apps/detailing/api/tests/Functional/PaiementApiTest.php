<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Double\FauxPrestatairePaiement;
use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Shared\Domain\Money;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Réservation → lien de paiement → webhook → réservation confirmée → annulation gratuite remboursée, de bout en bout
 * (faux Stripe ; horloge figée au 01/11/2026 10:00 UTC ; mardi 10/11 à 09:00, acompte 30 % de 69 €).
 */
final class PaiementApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    private KernelBrowser $client;
    private string $manageToken;
    private string $reservationId;

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

        $this->request('POST', '/api/v1/booking/reservations', json_encode([
            'prestationId' => 'interieur',
            'start' => '2026-11-10T08:00:00+00:00',
            'address' => ['label' => '1 rue de l\'Exemple, Amiens', 'lat' => 49.8941, 'lng' => 2.2958],
            'firstname' => 'Camille', 'lastname' => 'Martin', 'email' => 'camille@example.test', 'phone' => '0600000000',
            'acceptedTerms' => true,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $resultat = $this->json();
        self::assertIsString($resultat['manageToken']);
        self::assertIsString($resultat['reservationId']);
        $this->manageToken = $resultat['manageToken'];
        $this->reservationId = $resultat['reservationId'];
    }

    /** @param array<string, string> $server */
    private function request(string $method, string $uri, ?string $content = null, array $server = []): void
    {
        $this->client->request($method, $uri, server: $server + ['CONTENT_TYPE' => 'application/json'], content: $content);
    }

    /** @return array<mixed> */
    private function json(): array
    {
        return (array) json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }

    private function db(): Connection
    {
        $connection = static::getContainer()->get('doctrine.dbal.default_connection');
        self::assertInstanceOf(Connection::class, $connection);

        return $connection;
    }

    private function sessionId(): string
    {
        return (string) $this->db()->fetchOne('SELECT provider_session_id FROM payment WHERE reservation_id = ?', [$this->reservationId]);
    }

    private function webhook(string $signature = FauxPrestatairePaiement::SIGNATURE): void
    {
        $payload = json_encode(['id' => 'evt_1', 'type' => 'checkout.session.completed', 'session' => $this->sessionId(), 'paid' => true], JSON_THROW_ON_ERROR);
        $this->request('POST', '/api/v1/payment/stripe/webhook', $payload, ['HTTP_STRIPE_SIGNATURE' => $signature]);
    }

    private function statut(): string
    {
        $this->request('GET', '/api/v1/booking/manage/' . $this->manageToken);

        return (string) ($this->json()['status'] ?? '');
    }

    public function testWebhookConfirmeLaReservation(): void
    {
        self::assertSame('pending', $this->db()->fetchOne('SELECT status FROM payment'));

        $this->webhook();

        self::assertResponseIsSuccessful();
        self::assertSame(['received' => true], $this->json());
        self::assertSame('confirmed', $this->statut());
        self::assertSame('paid', $this->db()->fetchOne('SELECT status FROM payment'));
    }

    public function testWebhookRecuDeuxFois(): void
    {
        $this->webhook();
        $this->webhook();

        self::assertResponseIsSuccessful();
        self::assertSame('confirmed', $this->statut());
    }

    public function testWebhookAvecMauvaiseSignatureEn400(): void
    {
        $this->webhook('falsifiee');

        self::assertResponseStatusCodeSame(400);
        self::assertResponseHeaderSame('Content-Type', 'application/problem+json');
        self::assertSame('pending_payment', $this->statut());
    }

    public function testAnnulationGratuiteRembourseLAcompte(): void
    {
        $this->webhook();

        $this->request('DELETE', '/api/v1/booking/manage/' . $this->manageToken);

        self::assertSame(['refundable' => true], $this->json());
        self::assertSame('refunded', $this->db()->fetchOne('SELECT status FROM payment'));
        self::assertSame(2070, (int) $this->db()->fetchOne('SELECT refunded_cents FROM payment'));
    }

    public function testDeplacementPossibleUneFoisConfirmee(): void
    {
        $this->webhook();

        $this->request('PATCH', '/api/v1/booking/manage/' . $this->manageToken, json_encode(['start' => '2026-11-17T09:00:00+00:00'], JSON_THROW_ON_ERROR));

        self::assertResponseIsSuccessful();
        self::assertSame('2026-11-17T09:00:00+00:00', $this->json()['start']);
    }
}
