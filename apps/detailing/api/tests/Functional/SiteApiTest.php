<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/** Contenu modifiable du site (lecture publique, modification par le pro) et photos envoyées depuis l'espace pro. */
final class SiteApiTest extends WebTestCase
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

    public function testContenuLuParTousModifieParLePro(): void
    {
        $this->request('GET', '/api/v1/site');
        self::assertResponseIsSuccessful();
        self::assertSame('{}', $this->client->getResponse()->getContent(), 'objet vide tant que rien n\'est modifié');

        $contenu = ['coordonnees' => ['telephone' => '06 00 00 00 00'], 'faq' => [['question' => 'Eau ?', 'reponse' => 'Non.']]];
        $this->request('PUT', '/api/v1/admin/site', $contenu);
        self::assertResponseStatusCodeSame(401);
        $this->request('PUT', '/api/v1/admin/site', $contenu, $this->login('client@example.test', 'bonjour2026'));
        self::assertResponseStatusCodeSame(403);

        $this->request('PUT', '/api/v1/admin/site', $contenu, $this->login('pro@example.test', 'artisan2026'));
        self::assertResponseIsSuccessful();
        $this->request('GET', '/api/v1/site');
        self::assertSame($contenu, $this->json());

        $this->request('PUT', '/api/v1/admin/site', ['mauvais nom' => 'x'], $this->login('pro@example.test', 'artisan2026'));
        self::assertResponseStatusCodeSame(422);
    }

    public function testPhotosEnvoyeesListeesEtSupprimees(): void
    {
        $token = $this->login('pro@example.test', 'artisan2026');
        $fichier = tempnam(sys_get_temp_dir(), 'photo');
        self::assertIsString($fichier);
        file_put_contents($fichier, "\xFF\xD8\xFF\xE0" . str_repeat('x', 100));

        $this->client->request('POST', '/api/v1/admin/medias', files: ['fichier' => new UploadedFile($fichier, 'avant.jpg', 'image/jpeg', null, true)], server: ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);
        self::assertResponseStatusCodeSame(201);
        $photo = $this->json();
        self::assertIsString($photo['name']);
        self::assertMatchesRegularExpression('#^https://api\.example\.test/medias/[a-f0-9]{32}\.jpg$#', (string) $photo['url']);

        $this->request('GET', '/api/v1/admin/medias', token: $token);
        self::assertSame([$photo], $this->json());

        $this->request('DELETE', '/api/v1/admin/medias/' . $photo['name'], token: $token);
        self::assertResponseStatusCodeSame(204);
        $this->request('GET', '/api/v1/admin/medias', token: $token);
        self::assertSame([], $this->json());

        file_put_contents($fichier, '<?php echo 1;');
        $this->client->request('POST', '/api/v1/admin/medias', files: ['fichier' => new UploadedFile($fichier, 'photo.jpg', 'image/jpeg', null, true)], server: ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);
        self::assertResponseStatusCodeSame(422, 'un faux JPEG est refusé');
    }
}
