<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Espace pro de bout en bout (horloge figée au 01/11/2026 10:00 UTC, faux Stripe). */
final class AdminApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient([], ['HTTPS' => 'on']);
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

    public function testReserveAuPro(): void
    {
        $this->request('GET', '/api/v1/admin/dashboard');
        self::assertResponseStatusCodeSame(401, 'sans connexion');

        $this->request('GET', '/api/v1/admin/dashboard', token: $this->login('client@example.test', 'bonjour2026'));
        self::assertResponseStatusCodeSame(403, 'un client n\'a pas accès à l\'espace pro');

        $this->request('GET', '/api/v1/admin/dashboard', token: $this->login('pro@example.test', 'artisan2026'));
        self::assertResponseIsSuccessful();
        self::assertSame(0, $this->json()['monthBookings']);
        // Blocs « Ma journée », « Choses à faire », chiffres et clients ; informations de facturation encore à compléter.
        self::assertSame([], $this->json()['journee']);
        self::assertContains('facturation', array_column($this->json()['aFaire'], 'type'));
        self::assertSame(0, $this->json()['chiffres']['panierMoyenCents']);
        self::assertSame(0, $this->json()['clients']['nouveauxMois']);
    }

    public function testFichesClientsReserveesAuPro(): void
    {
        $this->request('GET', '/api/v1/admin/clients', token: $this->login('client@example.test', 'bonjour2026'));
        self::assertResponseStatusCodeSame(403);

        $token = $this->login('pro@example.test', 'artisan2026');
        $this->request('GET', '/api/v1/admin/clients', token: $token);
        self::assertResponseIsSuccessful();
        self::assertSame([], $this->json());
        $this->request('GET', '/api/v1/admin/clients/inconnu', token: $token);
        self::assertResponseStatusCodeSame(404);
    }

    public function testParcoursDuPro(): void
    {
        $token = $this->login('pro@example.test', 'artisan2026');

        // Réglages : pas d'acompte, pas de délai minimum
        $this->request('PUT', '/api/v1/admin/settings/rules', [
            'minNoticeHours' => 0, 'horizonDays' => 60, 'bufferMin' => 0, 'slotStepMin' => 60,
            'freeCancelHours' => 48, 'depositPercent' => 0, 'depositFixedCents' => null, 'holdMinutes' => 10,
        ], $token);
        self::assertResponseIsSuccessful();
        self::assertSame(0, $this->json()['rules']['depositPercent']);

        // Horaires : mardi matin
        $this->request('PUT', '/api/v1/admin/availability/hours', ['hours' => [['weekday' => 2, 'startsAt' => '08:00', 'endsAt' => '12:00']]], $token);
        self::assertResponseIsSuccessful();
        self::assertCount(1, $this->json());

        // Catalogue : une prestation
        $this->request('POST', '/api/v1/admin/catalog/prestations', ['name' => 'Intérieur', 'basePriceCents' => 6900, 'baseDurationMin' => 60], $token);
        self::assertResponseStatusCodeSame(201);
        $prestationId = $this->json()['id'];
        self::assertIsString($prestationId);

        // Congé le mardi 17
        $this->request('POST', '/api/v1/admin/availability/unavailabilities', ['start' => '2026-11-17', 'end' => '2026-11-18', 'reason' => 'Congé'], $token);
        self::assertResponseStatusCodeSame(201);

        // Rendez-vous pris par téléphone le mardi 10 à 09:00 (Paris)
        $this->request('POST', '/api/v1/admin/reservations', [
            'prestationId' => $prestationId,
            'start' => '2026-11-10T08:00:00+00:00',
            'address' => ['label' => '1 rue de l\'Exemple, Amiens', 'lat' => 49.8941, 'lng' => 2.2958],
            'firstname' => 'Dominique', 'lastname' => 'Petit', 'email' => 'dominique@example.test', 'phone' => '0611111111',
        ], $token);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('confirmed', $this->json()['status'], 'sans acompte : confirmé tout de suite');

        // Planning de la semaine
        $this->request('GET', '/api/v1/admin/reservations?from=2026-11-09&to=2026-11-16', token: $token);
        self::assertResponseIsSuccessful();
        $planning = $this->json();
        self::assertCount(1, $planning);
        self::assertSame('Dominique Petit', $planning[0]['client']['name']);
        self::assertSame('1 rue de l\'Exemple, Amiens', $planning[0]['address'], 'adresse déchiffrée');

        // Le congé retire le mardi 17 du calendrier public
        $this->request('GET', '/api/v1/booking/days?month=2026-11&duration=60&lat=49.8941&lng=2.2958');
        self::assertNotContains('2026-11-17', $this->json());
    }

    public function testFactureEmiseQuandLaPrestationEstFaite(): void
    {
        $this->client->disableReboot();
        $token = $this->login('pro@example.test', 'artisan2026');
        $this->request('PUT', '/api/v1/admin/settings/rules', [
            'minNoticeHours' => 0, 'horizonDays' => 60, 'bufferMin' => 0, 'slotStepMin' => 60,
            'freeCancelHours' => 48, 'depositPercent' => 0, 'depositFixedCents' => null, 'holdMinutes' => 10,
        ], $token);
        $this->request('PUT', '/api/v1/admin/availability/hours', ['hours' => [['weekday' => 2, 'startsAt' => '08:00', 'endsAt' => '12:00']]], $token);
        $this->request('POST', '/api/v1/admin/catalog/prestations', ['name' => 'Intérieur', 'basePriceCents' => 6900, 'baseDurationMin' => 60], $token);
        $prestationId = $this->json()['id'];
        $this->request('POST', '/api/v1/admin/reservations', [
            'prestationId' => $prestationId, 'start' => '2026-11-10T08:00:00+00:00',
            'address' => ['label' => '1 rue de l\'Exemple, Amiens', 'lat' => 49.8941, 'lng' => 2.2958],
            'firstname' => 'Dominique', 'lastname' => 'Petit', 'email' => 'dominique@example.test', 'phone' => '0611111111',
            'metierData' => ['entreprise' => 'Transports Petit', 'siret' => '12345678900012'],
        ], $token);
        $reservationId = $this->json()['reservationId'];
        self::assertIsString($reservationId);

        // Pas encore faite : pas de facture.
        $this->request('POST', '/api/v1/admin/reservations/' . $reservationId . '/facture', token: $token);
        self::assertResponseStatusCodeSame(422);

        // Le mardi à 10 h, le pro marque la prestation faite : facture émise automatiquement.
        $horloge = static::getContainer()->get(\Bsandoz\Core\Shared\Infrastructure\FrozenClock::class);
        self::assertInstanceOf(\Bsandoz\Core\Shared\Infrastructure\FrozenClock::class, $horloge);
        $horloge->set('2026-11-10 10:00');
        // Lien de la page d'avis : joint au mail de facture.
        $this->request('PUT', '/api/v1/admin/settings/avis', ['lien' => 'https://g.page/r/exemple/review'], $token);
        self::assertSame(['actif' => true, 'lien' => 'https://g.page/r/exemple/review'], $this->json());
        $this->request('PATCH', '/api/v1/admin/reservations/' . $reservationId, ['status' => 'done'], $token);
        self::assertResponseIsSuccessful();
        $mailFacture = array_values(array_filter(self::getMailerMessages(), static fn ($m): bool => $m instanceof \Symfony\Component\Mime\Email && str_contains((string) $m->getSubject(), 'Votre facture')));
        self::assertCount(1, $mailFacture);
        self::assertEmailHtmlBodyContains($mailFacture[0], 'https://g.page/r/exemple/review');

        $this->request('GET', '/api/v1/admin/factures', token: $token);
        $factures = $this->json();
        self::assertCount(1, $factures);
        self::assertSame(['F-2026-0001', 'Transports Petit', 6900], [$factures[0]['numero'], $factures[0]['client'], $factures[0]['totalCents']]);

        $this->request('GET', '/api/v1/admin/factures/' . $factures[0]['id'], token: $token);
        $facture = $this->json();
        self::assertSame([['libelle' => 'Intérieur', 'montantCents' => 6900]], $facture['lignes']);
        self::assertSame(['12345678900012', '[à compléter]'], [$facture['client']['siret'], $facture['vendeur']['siret']]);
        self::assertSame([0, 6900], [$facture['payeEnLigneCents'], $facture['payeSurPlaceCents']]);

        // Une seule facture par prestation ; le client la retrouve dans son espace.
        $this->request('POST', '/api/v1/admin/reservations/' . $reservationId . '/facture', token: $token);
        self::assertSame('F-2026-0001', $this->json()['numero']);
    }

    public function testRegleIncoherenteEn422(): void
    {
        $this->request('PUT', '/api/v1/admin/settings/rules', ['minNoticeHours' => 0], $this->login('pro@example.test', 'artisan2026'));

        self::assertResponseStatusCodeSame(422);
    }

    public function testPasserEnActiviteSurPlace(): void
    {
        $token = $this->login('pro@example.test', 'artisan2026');

        $this->request('PUT', '/api/v1/admin/settings/zone', ['zone' => null], $token);

        self::assertResponseIsSuccessful();
        self::assertNull($this->json()['zone']);
    }

    public function testLeProGereSesProduitsEtLeurStock(): void
    {
        $token = $this->login('pro@example.test', 'artisan2026');
        $this->request('POST', '/api/v1/admin/catalog/produits', ['name' => 'Microfibre', 'description' => 'Lot de 2', 'priceCents' => 600, 'stock' => 3], $token);
        self::assertResponseStatusCodeSame(201);
        $id = $this->json()['id'] ?? null;
        self::assertIsString($id);

        $this->request('GET', '/api/v1/catalog');
        self::assertSame([['id' => $id, 'name' => 'Microfibre', 'description' => 'Lot de 2', 'priceCents' => 600, 'stock' => 3, 'photo' => null]], $this->json()['produits'] ?? null);

        $this->request('PUT', '/api/v1/admin/catalog/produits/' . $id, ['name' => 'Microfibre', 'priceCents' => 700, 'stock' => 0], $token);
        self::assertResponseIsSuccessful();
        $this->request('GET', '/api/v1/catalog');
        self::assertSame([], $this->json()['produits'] ?? null, 'stock à 0 : plus proposé sur le site');

        $this->request('DELETE', '/api/v1/admin/catalog/produits/' . $id, token: $token);
        self::assertResponseStatusCodeSame(204);
        $this->request('GET', '/api/v1/admin/catalog', token: $token);
        self::assertSame([false, 700], [$this->json()['produits'][0]['active'] ?? null, $this->json()['produits'][0]['priceCents'] ?? null]);

        $this->request('POST', '/api/v1/admin/catalog/produits', ['name' => 'Gratuit', 'priceCents' => 0, 'stock' => 1], $token);
        self::assertResponseStatusCodeSame(422);
    }
}
