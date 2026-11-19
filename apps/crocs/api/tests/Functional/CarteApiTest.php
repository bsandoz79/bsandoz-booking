<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Console\Tester\CommandTester;

/** Le patron modifie sa carte depuis l'espace pro ; les visiteurs la lisent sur le site. */
final class CarteApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient([], ['HTTPS' => 'on', 'HTTP_HOST' => 'api.example.test']);
        self::reinitialiserLimites();
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);
        $schema = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);

        $pro = new User('pro', 'patron@example.test', 'Sam', 'Patron', '', ['ROLE_PRO']);
        $pro->activate((new NativePasswordHasherAdapter())->hash('kebab-2026'));
        $em->persist($pro);
        $em->flush();
    }

    public function testLePatronModifieSaCarteEtLesVisiteursLaVoient(): void
    {
        $this->request('POST', '/api/v1/admin/carte/rubriques', ['nom' => 'Sandwichs']);
        self::assertResponseStatusCodeSame(401, 'sans connexion, rien ne change');

        $jeton = $this->login();
        $this->request('POST', '/api/v1/admin/carte/rubriques', ['nom' => 'Sandwichs', 'note' => 'Avec frites : + 1 €', 'icone' => 'sandwich'], $jeton);
        self::assertResponseStatusCodeSame(201);
        $rubrique = $this->json();
        self::assertSame('sandwich', $rubrique['icone']);

        $this->request('POST', '/api/v1/admin/carte/articles', ['categorieId' => $rubrique['id'], 'nom' => 'Kebab', 'description' => 'Poulet-dinde', 'prixCents' => 550], $jeton);
        self::assertResponseStatusCodeSame(201);
        $kebab = $this->json();

        // Nouveau prix : l'ancien reste barré ; « Épuisé » en une touche.
        $this->request('PUT', '/api/v1/admin/carte/articles/' . $kebab['id'], ['categorieId' => $rubrique['id'], 'nom' => 'Kebab', 'description' => 'Poulet-dinde', 'prixCents' => 600, 'visible' => true, 'photo' => null], $jeton);
        self::assertResponseIsSuccessful();
        $this->request('PUT', '/api/v1/admin/carte/articles/' . $kebab['id'] . '/epuise', ['epuise' => true], $jeton);
        self::assertResponseIsSuccessful();

        $this->request('GET', '/api/v1/carte');
        self::assertResponseIsSuccessful();
        $carte = $this->json();
        self::assertSame('Avec frites : + 1 €', $carte[0]['note']);
        self::assertSame(['nom' => 'Kebab', 'prixCents' => 600, 'prixBarreCents' => 550, 'nouveau' => true, 'epuise' => true],
            array_intersect_key($carte[0]['articles'][0], array_flip(['nom', 'prixCents', 'prixBarreCents', 'nouveau', 'epuise'])));
    }

    public function testLeContenuDuSiteEstModifiable(): void
    {
        $jeton = $this->login();
        $this->request('PUT', '/api/v1/admin/site', ['accroche' => 'Kebabs et tacos', 'horaires' => [['jours' => 'Lundi', 'heures' => '11 h 30 – 14 h 30']]], $jeton);
        self::assertResponseIsSuccessful();
        $this->request('GET', '/api/v1/site');
        self::assertSame('Kebabs et tacos', $this->json()['accroche']);
    }

    public function testLaCarteDeDepartSeChargeUneSeuleFois(): void
    {
        $kernel = self::$kernel;
        self::assertNotNull($kernel);
        $commande = new CommandTester((new Application($kernel))->find('crocs:carte:charger'));
        $commande->execute([]);
        self::assertStringContainsString('Carte chargée : 10 rubriques', $commande->getDisplay());
        $commande->execute([]);
        self::assertStringContainsString('rien n’est chargé', $commande->getDisplay());

        $this->request('GET', '/api/v1/carte');
        $carte = $this->json();
        self::assertCount(10, $carte);
        self::assertSame(['Les Sandwichs', 'sandwich'], [$carte[0]['nom'], $carte[0]['icone']]);
        self::assertSame(550, $carte[0]['articles'][0]['prixCents']);
        self::assertNull($carte[0]['articles'][0]['prixBarreCents'], 'pas de prix barré au départ');
        self::assertFalse($carte[0]['articles'][0]['nouveau'], 'la carte de départ n’est pas « Nouveau »');
    }

    private function login(): string
    {
        $this->request('POST', '/api/v1/auth/login', ['email' => 'patron@example.test', 'password' => 'kebab-2026']);
        $jeton = $this->json()['token'] ?? null;
        self::assertIsString($jeton);

        return $jeton;
    }

    /** @param array<string, mixed>|null $corps */
    private function request(string $methode, string $uri, ?array $corps = null, ?string $jeton = null): void
    {
        $server = ['CONTENT_TYPE' => 'application/json'];
        if ($jeton !== null) {
            $server['HTTP_AUTHORIZATION'] = 'Bearer ' . $jeton;
        }
        $this->client->request($methode, $uri, server: $server, content: $corps === null ? null : json_encode($corps, JSON_THROW_ON_ERROR));
    }

    /** @return array<mixed> */
    private function json(): array
    {
        return (array) json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }
}
