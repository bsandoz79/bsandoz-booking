<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Double\FauxEnvoiPush;
use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Notifications push du pro : clé publique, abonnement réservé au pro, notification à chaque rendez-vous confirmé. */
final class PushApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    private const ABONNEMENT = ['endpoint' => 'https://push.example.test/appareil-1', 'keys' => ['p256dh' => 'BCleDeTest_-1', 'auth' => 'auth-1']];

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient([], ['HTTPS' => 'on']);
        self::reinitialiserLimites();
        FauxEnvoiPush::$envoyes = [];
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);
        $schema = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);

        $hasher = new NativePasswordHasherAdapter();
        $pro = new User('pro', 'pro@example.test', 'Alex', 'Dupont', '', ['ROLE_PRO']);
        $pro->activate($hasher->hash('artisan2026'));
        $em->persist($pro);
        $client = new User('cli', 'client@example.test', 'Camille', 'Martin', '0600000000');
        $client->activate($hasher->hash('bonjour2026'));
        $em->persist($client);
        $em->flush();
    }

    private function login(string $email, string $password): string
    {
        $this->request('POST', '/api/v1/auth/login', ['email' => $email, 'password' => $password]);
        $token = $this->json()['token'] ?? null;
        self::assertIsString($token);

        return $token;
    }

    /** @param array<string, mixed>|null $body */
    private function request(string $method, string $uri, ?array $body = null, ?string $token = null): void
    {
        $server = ['CONTENT_TYPE' => 'application/json'];
        if ($token !== null) {
            $server['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
        }
        $this->client->request($method, $uri, server: $server, content: $body === null ? null : json_encode($body, JSON_THROW_ON_ERROR));
    }

    /** @return array<mixed> */
    private function json(): array
    {
        return (array) json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }

    public function testClePubliqueEtAbonnementReserveAuPro(): void
    {
        $this->request('GET', '/api/v1/push/key');
        self::assertSame(['publicKey' => 'cle-publique-de-test'], $this->json());

        $this->request('POST', '/api/v1/admin/push', self::ABONNEMENT);
        self::assertResponseStatusCodeSame(401);
        $this->request('POST', '/api/v1/admin/push', self::ABONNEMENT, $this->login('client@example.test', 'bonjour2026'));
        self::assertResponseStatusCodeSame(403);

        $this->request('POST', '/api/v1/admin/push', ['endpoint' => 'https://push.example.test/x'], $this->login('pro@example.test', 'artisan2026'));
        self::assertResponseStatusCodeSame(400, 'clés manquantes');
        $this->request('POST', '/api/v1/admin/push', ['endpoint' => 'http://non-securise', 'keys' => ['p256dh' => 'a', 'auth' => 'b']], $this->login('pro@example.test', 'artisan2026'));
        self::assertResponseStatusCodeSame(422, 'endpoint non https');
    }

    public function testLeProEstNotifieDUnRendezVousConfirmePuisSeDesabonne(): void
    {
        $token = $this->login('pro@example.test', 'artisan2026');
        $this->request('POST', '/api/v1/admin/push', self::ABONNEMENT, $token);
        self::assertResponseStatusCodeSame(204);

        // Ouvert le mardi et le jeudi matin
        $this->request('PUT', '/api/v1/admin/availability/hours', ['hours' => [
            ['weekday' => 2, 'startsAt' => '08:00', 'endsAt' => '12:00'],
            ['weekday' => 4, 'startsAt' => '08:00', 'endsAt' => '12:00'],
        ]], $token);
        $this->request('POST', '/api/v1/admin/catalog/prestations', ['name' => 'Intérieur', 'basePriceCents' => 6900, 'baseDurationMin' => 60], $token);
        $prestationId = $this->json()['id'];
        $this->request('POST', '/api/v1/admin/reservations', [
            'prestationId' => $prestationId,
            'start' => '2026-11-10T08:00:00+00:00',
            'address' => ['label' => '1 rue de l\'Exemple, Amiens', 'lat' => 49.8941, 'lng' => 2.2958],
            'firstname' => 'Dominique', 'lastname' => 'Petit', 'email' => 'dominique@example.test', 'phone' => '0611111111',
        ], $token);
        self::assertResponseStatusCodeSame(201);

        self::assertSame([[
            'endpoint' => 'https://push.example.test/appareil-1',
            'title' => 'Nouveau rendez-vous',
            'body' => 'Intérieur · Dominique Petit · mardi 10 novembre à 09h00',
        ]], FauxEnvoiPush::$envoyes);

        $this->request('DELETE', '/api/v1/admin/push', ['endpoint' => self::ABONNEMENT['endpoint']], $token);
        self::assertResponseStatusCodeSame(204);
        FauxEnvoiPush::$envoyes = [];
        $this->request('POST', '/api/v1/admin/reservations', [
            'prestationId' => $prestationId,
            'start' => '2026-11-12T08:00:00+00:00',
            'address' => ['label' => '1 rue de l\'Exemple, Amiens', 'lat' => 49.8941, 'lng' => 2.2958],
            'firstname' => 'Dominique', 'lastname' => 'Petit', 'email' => 'dominique@example.test', 'phone' => '0611111111',
        ], $token);
        self::assertResponseStatusCodeSame(201);
        self::assertSame([], FauxEnvoiPush::$envoyes, 'appareil désabonné : plus de notification');
    }
}
