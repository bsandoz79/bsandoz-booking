<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Double\FauxPrestatairePaiement;
use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Abonnement de bout en bout : offre du pro → souscription du client → premier prélèvement (webhook) → lavage réservé
 * avec la prestation comprise déduite → un seul lavage par période → résiliation en fin de période → comptabilité.
 */
final class AbonnementApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient([], ['HTTPS' => 'on']);
        $this->client->disableReboot();
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

    public function testSouscriptionLavageCompriseUnParPeriodeEtResiliation(): void
    {
        $pro = $this->login('pro@example.test', 'artisan2026');
        $this->request('PUT', '/api/v1/admin/settings/rules', [
            'minNoticeHours' => 0, 'horizonDays' => 60, 'bufferMin' => 0, 'slotStepMin' => 60,
            'freeCancelHours' => 48, 'depositPercent' => 0, 'depositFixedCents' => null, 'holdMinutes' => 10,
        ], $pro);
        $this->request('PUT', '/api/v1/admin/availability/hours', ['hours' => [
            ['weekday' => 2, 'startsAt' => '08:00', 'endsAt' => '12:00'], ['weekday' => 3, 'startsAt' => '08:00', 'endsAt' => '12:00'],
        ]], $pro);
        $this->request('POST', '/api/v1/admin/catalog/prestations', ['name' => 'Extérieur Éclat', 'basePriceCents' => 2500, 'baseDurationMin' => 60, 'categoryId' => 'exterieur'], $pro);
        $exterieur = $this->json()['id'];
        $this->request('POST', '/api/v1/admin/catalog/options', ['name' => 'Très sale', 'priceCents' => 1000, 'durationMin' => 0], $pro);
        $option = $this->json()['id'];
        $this->request('PUT', '/api/v1/admin/catalog/prestations/' . $exterieur, ['name' => 'Extérieur Éclat', 'basePriceCents' => 2500, 'baseDurationMin' => 60, 'categoryId' => 'exterieur', 'optionIds' => [$option]], $pro);

        // Offre du pro : un extérieur par mois, 20 € par mois.
        $this->request('POST', '/api/v1/admin/abonnements/offres', ['nom' => 'Mensuel', 'prestationId' => $exterieur, 'periodicite' => 'mois', 'prixCents' => 2000], $pro);
        self::assertResponseStatusCodeSame(201);
        $offre = $this->json()['id'];
        $this->client->request('GET', '/api/v1/abonnements/offres');
        self::assertSame([['Mensuel', 'Extérieur Éclat', 'chaque mois', 2000]], array_map(static fn (array $o): array => [$o['nom'], $o['prestation'], $o['periodiciteLibelle'], $o['prixCents']], $this->json()));

        // Souscription du client : lien de paiement ; rien n'apparaît avant le premier prélèvement.
        $client = $this->login('client@example.test', 'bonjour2026');
        $this->request('POST', '/api/v1/me/abonnements', ['offreId' => $offre], $client);
        self::assertResponseStatusCodeSame(201);
        self::assertStringStartsWith('https://paiement.test/cs_abo_', $this->json()['url']);
        $session = substr($this->json()['url'], strlen('https://paiement.test/'));
        $this->request('GET', '/api/v1/me/abonnements', token: $client);
        self::assertSame([], $this->json());

        // Premier prélèvement : session réglée, puis facture payée (période du 1er novembre au 1er décembre).
        $this->webhook(['id' => 'evt_1', 'type' => 'checkout.session.completed', 'session' => $session, 'paid' => true, 'mode' => 'subscription', 'souscription' => 'sub_1']);
        $this->webhook(['id' => 'evt_2', 'type' => 'invoice.paid', 'souscription' => 'sub_1', 'facture' => 'in_1', 'montant' => 2000,
            'debut' => strtotime('2026-11-01 10:00 UTC'), 'fin' => strtotime('2026-12-01 10:00 UTC')]);
        $this->webhook(['id' => 'evt_2', 'type' => 'invoice.paid', 'souscription' => 'sub_1', 'facture' => 'in_1', 'montant' => 2000]);
        $this->request('GET', '/api/v1/me/abonnements', token: $client);
        $mes = $this->json();
        self::assertCount(1, $mes);
        self::assertSame(['actif', true, null], [$mes[0]['statut'], $mes[0]['utilisable'], $mes[0]['prestationPrevueLe']]);
        $abonnement = $mes[0]['id'];

        // Lavage du mois : prestation comprise déduite, l'option reste due.
        $this->request('POST', '/api/v1/booking/reservations', self::rendezVous($exterieur, '2026-11-10T08:00:00+00:00', $abonnement, [$option]), $client);
        self::assertResponseStatusCodeSame(201);
        $this->request('GET', '/api/v1/me/abonnements', token: $client);
        self::assertSame('2026-11-10T08:00:00+00:00', $this->json()[0]['prestationPrevueLe']);
        $this->request('GET', '/api/v1/me/reservations', token: $client);
        self::assertSame(1000, $this->json()[0]['totalCents'], '25 € compris dans l\'abonnement, 10 € d\'option');

        // Deuxième lavage dans la même période : refusé. Autre formule : refusée.
        $this->request('POST', '/api/v1/booking/reservations', self::rendezVous($exterieur, '2026-11-11T08:00:00+00:00', $abonnement), $client);
        self::assertResponseStatusCodeSame(422);
        self::assertStringContainsString('déjà réservée', (string) $this->json()['detail']);

        // Résiliation : effet en fin de période ; après le 1er décembre, plus de lavage compris.
        $this->request('POST', '/api/v1/me/abonnements/' . $abonnement . '/resilier', token: $client);
        self::assertResponseStatusCodeSame(204);
        $faux = static::getContainer()->get(FauxPrestatairePaiement::class);
        self::assertInstanceOf(FauxPrestatairePaiement::class, $faux);
        self::assertSame(['sub_1'], $faux->resiliations);
        $this->request('POST', '/api/v1/booking/reservations', self::rendezVous($exterieur, '2026-12-01T08:00:00+00:00', $abonnement), $client);
        self::assertResponseStatusCodeSame(422);

        // Pro : abonnés et recette du prélèvement dans la comptabilité.
        $this->request('GET', '/api/v1/admin/abonnements', token: $pro);
        self::assertSame([['Camille Martin', 'Mensuel', 'actif', true]], array_map(static fn (array $a): array => [$a['client']['nom'], $a['offre'], $a['statut'], $a['resiliationDemandee']], $this->json()));
        $this->request('GET', '/api/v1/admin/comptabilite?annee=2026', token: $pro);
        self::assertSame(2000, $this->json()['parMoyenCents']['abonnement'], 'prélèvement compté une seule fois');

        // Fin de la souscription chez le prestataire : abonnement terminé.
        $this->webhook(['id' => 'evt_3', 'type' => 'customer.subscription.deleted', 'souscription' => 'sub_1']);
        $this->request('GET', '/api/v1/me/abonnements', token: $client);
        self::assertSame(['termine', false], [$this->json()[0]['statut'], $this->json()[0]['utilisable']]);
    }

    /**
     * @param list<string> $optionIds
     * @return array<string, mixed>
     */
    private static function rendezVous(string $prestationId, string $start, string $abonnementId, array $optionIds = []): array
    {
        return [
            'prestationId' => $prestationId, 'optionIds' => $optionIds, 'start' => $start, 'abonnementId' => $abonnementId,
            'address' => ['label' => '1 rue de l\'Exemple, Amiens', 'lat' => 49.8941, 'lng' => 2.2958],
            'firstname' => 'Camille', 'lastname' => 'Martin', 'email' => 'client@example.test', 'phone' => '0600000000', 'acceptedTerms' => true,
        ];
    }

    /** @param array<string, mixed> $evenement */
    private function webhook(array $evenement): void
    {
        $this->client->request('POST', '/api/v1/payment/stripe/webhook', server: ['CONTENT_TYPE' => 'application/json', 'HTTP_STRIPE_SIGNATURE' => FauxPrestatairePaiement::SIGNATURE],
            content: json_encode($evenement, JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();
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
}
