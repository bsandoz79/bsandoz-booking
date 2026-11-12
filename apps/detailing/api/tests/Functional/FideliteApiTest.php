<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Carte de fidélité de bout en bout : tampons ajoutés à la main par le pro, tampon automatique quand le pro marque la
 * prestation réalisée, carte visible par le client, remise de 20 % appliquée d'elle-même à la réservation suivante.
 */
final class FideliteApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient([], ['HTTPS' => 'on']);
        $this->client->disableReboot(); // même horloge figée d'une requête à l'autre
        self::reinitialiserLimites();
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

    /** @return array<string, mixed> */
    private static function rendezVous(string $prestationId, string $start): array
    {
        return [
            'prestationId' => $prestationId, 'start' => $start,
            'address' => ['label' => '1 rue de l\'Exemple, Amiens', 'lat' => 49.8941, 'lng' => 2.2958],
            'firstname' => 'Camille', 'lastname' => 'Martin', 'email' => 'client@example.test', 'phone' => '0600000000',
        ];
    }

    public function testDeLaCarteALaRemise(): void
    {
        $this->request('GET', '/api/v1/fidelite');
        self::assertSame(['actif' => true, 'tamponsRequis' => 4, 'remisePercent' => 20], $this->json(), 'règle publique par défaut');

        $pro = $this->login('pro@example.test', 'artisan2026');
        $this->request('PUT', '/api/v1/admin/settings/rules', ['minNoticeHours' => 0, 'horizonDays' => 60, 'bufferMin' => 0, 'slotStepMin' => 60,
            'freeCancelHours' => 48, 'depositPercent' => 0, 'depositFixedCents' => null, 'holdMinutes' => 10], $pro);
        $this->request('PUT', '/api/v1/admin/availability/hours', ['hours' => [['weekday' => 2, 'startsAt' => '08:00', 'endsAt' => '12:00']]], $pro);
        $this->request('POST', '/api/v1/admin/catalog/prestations', ['name' => 'Intérieur', 'basePriceCents' => 6900, 'baseDurationMin' => 60], $pro);
        $prestationId = (string) $this->json()['id'];

        // Le pro reporte 3 tampons d'une carte papier.
        $this->request('PATCH', '/api/v1/admin/fidelite/cli', ['delta' => 3], $pro);
        self::assertSame(3, $this->json()['tampons']);

        // 4e prestation, sans remise, réalisée le mardi 3 : tampon automatique.
        $this->request('POST', '/api/v1/admin/reservations', self::rendezVous($prestationId, '2026-11-03T08:00:00+00:00'), $pro);
        self::assertResponseStatusCodeSame(201);
        $quatrieme = (string) $this->json()['reservationId'];
        $horloge = static::getContainer()->get(FrozenClock::class);
        self::assertInstanceOf(FrozenClock::class, $horloge);
        $horloge->set('2026-11-03 12:00');
        $this->request('PATCH', '/api/v1/admin/reservations/' . $quatrieme, ['status' => 'done'], $pro);
        self::assertResponseIsSuccessful();

        // Le client voit sa carte pleine.
        $this->request('GET', '/api/v1/me/fidelite', token: $this->login('client@example.test', 'bonjour2026'));
        self::assertSame(['actif' => true, 'tampons' => 4, 'tamponsRequis' => 4, 'remisePercent' => 20, 'remiseDisponible' => true], $this->json());

        // 5e : 20 % déduits d'eux-mêmes, la carte repart.
        $this->request('POST', '/api/v1/admin/reservations', self::rendezVous($prestationId, '2026-11-10T08:00:00+00:00'), $pro);
        self::assertResponseStatusCodeSame(201);
        $this->request('GET', '/api/v1/admin/reservations?from=2026-11-09&to=2026-11-16', token: $pro);
        $planning = $this->json();
        self::assertSame(5520, $planning[0]['totalCents']);
        self::assertSame(1380, $planning[0]['remiseFideliteCents']);
        self::assertSame('cli', $planning[0]['clientId']);
        $this->request('GET', '/api/v1/admin/fidelite/cli', token: $pro);
        self::assertSame(0, $this->json()['tampons']);
    }

    public function testReserveAuxBonsComptes(): void
    {
        $this->request('PATCH', '/api/v1/admin/fidelite/cli', ['delta' => 1], $this->login('client@example.test', 'bonjour2026'));
        self::assertResponseStatusCodeSame(403, 'un client ne tamponne pas sa propre carte');
        $this->request('GET', '/api/v1/me/fidelite');
        self::assertResponseStatusCodeSame(401);
        $this->request('PATCH', '/api/v1/admin/fidelite/cli', ['delta' => 'beaucoup'], $this->login('pro@example.test', 'artisan2026'));
        self::assertResponseStatusCodeSame(400);
    }
}
