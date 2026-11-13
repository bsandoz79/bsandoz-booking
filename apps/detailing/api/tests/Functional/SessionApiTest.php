<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Infrastructure\Http\SessionController;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Connexion, renouvellement, déconnexion et espace client, de bout en bout (en HTTPS pour le cookie Secure). */
final class SessionApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient([], ['HTTPS' => 'on']);
        self::reinitialiserLimites();
        $em = $this->em();
        $schema = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);

        $hasher = new NativePasswordHasherAdapter();
        $camille = new User('u-1', 'camille@example.test', 'Camille', 'Martin', '0600000000');
        $camille->activate($hasher->hash('bonjour2026'));
        $em->persist($camille);
        $autre = new User('u-2', 'autre@example.test', 'Autre', 'Client', '0700000000');
        $autre->activate($hasher->hash('bonjour2026'));
        $em->persist($autre);

        $utc = new \DateTimeZone('UTC');
        foreach (['r-1' => 'u-1', 'r-autre' => 'u-2'] as $id => $userId) {
            $r = new Reservation(
                $id, $userId, 'p-1', null, [],
                new TimeRange(new \DateTimeImmutable('2026-10-15 08:00', $utc), new \DateTimeImmutable('2026-10-15 09:00', $utc)),
                'adresse', 49.89, 2.29, Money::cents(6900), Money::cents(2070), Money::zero(),
            );
            $r->confirm();
            $em->persist($r);
        }
        $em->flush();
    }

    private function em(): EntityManagerInterface
    {
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);

        return $em;
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

    private function login(string $email = 'camille@example.test'): string
    {
        $this->request('POST', '/api/v1/auth/login', ['email' => $email, 'password' => 'bonjour2026']);
        self::assertResponseIsSuccessful();
        $token = $this->json()['token'] ?? null;
        self::assertIsString($token);

        return $token;
    }

    private function cookie(): ?string
    {
        return $this->client->getCookieJar()->get(SessionController::COOKIE, '/api/v1/auth')?->getValue();
    }

    public function testConnexionAvecCookieDeSessionProtege(): void
    {
        $this->login();

        $resultat = $this->json();
        self::assertSame(900, $resultat['expiresIn']);
        self::assertSame(['ROLE_CLIENT'], $resultat['roles']);
        $cookie = $this->client->getResponse()->headers->getCookies()[0];
        self::assertSame(SessionController::COOKIE, $cookie->getName());
        self::assertTrue($cookie->isHttpOnly());
        self::assertTrue($cookie->isSecure());
        self::assertSame('strict', $cookie->getSameSite());
        self::assertSame('/api/v1/auth', $cookie->getPath());
    }

    public function testMauvaisMotDePasseEn401(): void
    {
        $this->request('POST', '/api/v1/auth/login', ['email' => 'camille@example.test', 'password' => 'faux']);

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/problem+json');
        self::assertSame('E-mail ou mot de passe incorrect.', $this->json()['detail']);
    }

    public function testRenouvellementAvecRotation(): void
    {
        $this->login();
        $ancien = $this->cookie();

        $this->request('POST', '/api/v1/auth/refresh');
        self::assertResponseIsSuccessful();
        self::assertIsString($this->json()['token'] ?? null);
        self::assertNotSame($ancien, $this->cookie());

        $this->client->getCookieJar()->clear();
        $this->client->getCookieJar()->set(new \Symfony\Component\BrowserKit\Cookie(SessionController::COOKIE, (string) $ancien, null, '/api/v1/auth', '', true, true));
        $this->request('POST', '/api/v1/auth/refresh');
        self::assertResponseStatusCodeSame(401, 'l\'ancien jeton ne sert plus');
    }

    public function testDeconnexion(): void
    {
        $this->login();
        $this->request('POST', '/api/v1/auth/logout');
        self::assertResponseStatusCodeSame(204);

        $this->request('POST', '/api/v1/auth/refresh');
        self::assertResponseStatusCodeSame(401);
    }

    public function testEspaceClientReserveAuxClientsConnectes(): void
    {
        $this->request('GET', '/api/v1/me');
        self::assertResponseStatusCodeSame(401);

        $this->request('GET', '/api/v1/me', token: $this->login());
        self::assertResponseIsSuccessful();
        self::assertSame('camille@example.test', $this->json()['email']);
    }

    public function testLeClientModifieSesCoordonnees(): void
    {
        $token = $this->login();
        $this->request('PATCH', '/api/v1/me', ['firstname' => 'Camille Durand', 'lastname' => '', 'phone' => '06 11 22 33 44', 'email' => 'Camille.D@Example.test'], $token);
        self::assertResponseIsSuccessful();
        self::assertSame(['Camille Durand', '06 11 22 33 44', 'camille.d@example.test'], [$this->json()['firstname'], $this->json()['phone'], $this->json()['email']]);

        // Toujours connecté (la session suit l'identifiant, pas l'e-mail) ; l'e-mail d'un autre compte est refusé.
        $this->request('PATCH', '/api/v1/me', ['email' => 'autre@example.test'], $token);
        self::assertResponseStatusCodeSame(422);
        $this->request('PATCH', '/api/v1/me', ['phone' => 'abc'], $token);
        self::assertResponseStatusCodeSame(422);
    }

    public function testMesReservationsSeulement(): void
    {
        $token = $this->login();

        $this->request('GET', '/api/v1/me/reservations', token: $token);
        self::assertSame(['r-1'], array_column($this->json(), 'id'));
        self::assertArrayHasKey('freeCancelUntil', $this->json()[0]);
        self::assertArrayHasKey('lat', $this->json()[0]);

        $this->request('DELETE', '/api/v1/me/reservations/r-autre', token: $token);
        self::assertResponseStatusCodeSame(404, 'la réservation d\'un autre client est introuvable');
    }

    public function testExportDesDonnees(): void
    {
        $this->request('GET', '/api/v1/me/export', token: $this->login());

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Disposition', 'attachment; filename="mes-donnees.json"');
        self::assertSame('camille@example.test', $this->json()['compte']['email'] ?? null);
    }

    public function testSuppressionDuCompteCoupeLAccesAussitot(): void
    {
        $token = $this->login();

        $this->request('DELETE', '/api/v1/me', token: $token);
        self::assertResponseStatusCodeSame(204);

        $this->request('GET', '/api/v1/me', token: $token);
        self::assertResponseStatusCodeSame(401, 'le jeton encore valide ne suffit plus');

        $this->request('POST', '/api/v1/auth/login', ['email' => 'camille@example.test', 'password' => 'bonjour2026']);
        self::assertResponseStatusCodeSame(401);
    }
}
