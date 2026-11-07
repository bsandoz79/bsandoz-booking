<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Activation, mot de passe oublié et limitation des tentatives, de bout en bout. */
final class AuthApiTest extends WebTestCase
{
    use ReinitialiseLimites;

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

        $em->persist(new User('u-1', 'camille@example.test', 'Camille', 'Martin', '0600000000'));
        $em->flush();
    }

    private function em(): EntityManagerInterface
    {
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);

        return $em;
    }

    private function token(TokenType $type): string
    {
        $tokens = static::getContainer()->get(TokenService::class);
        self::assertInstanceOf(TokenService::class, $tokens);

        return $tokens->issue('u-1', $type, new \DateInterval('PT1H'));
    }

    /** @param array<string, mixed> $body */
    private function post(string $uri, array $body): void
    {
        $this->client->request('POST', $uri, server: ['CONTENT_TYPE' => 'application/json'], content: json_encode($body, JSON_THROW_ON_ERROR));
    }

    private function user(): User
    {
        $this->em()->clear();
        $user = $this->em()->find(User::class, 'u-1');
        self::assertInstanceOf(User::class, $user);

        return $user;
    }

    public function testActivation(): void
    {
        $this->post('/api/v1/auth/activate', ['token' => $this->token(TokenType::Activation), 'password' => 'bonjour2026']);

        self::assertResponseStatusCodeSame(204);
        self::assertSame(UserStatus::Active, $this->user()->status());
    }

    public function testActivationAvecMotDePasseFaibleEn422(): void
    {
        $this->post('/api/v1/auth/activate', ['token' => $this->token(TokenType::Activation), 'password' => 'court']);

        self::assertResponseStatusCodeSame(422);
        self::assertResponseHeaderSame('Content-Type', 'application/problem+json');
    }

    public function testActivationAvecLienInvalideEn422(): void
    {
        $this->post('/api/v1/auth/activate', ['token' => str_repeat('a', 64), 'password' => 'bonjour2026']);

        self::assertResponseStatusCodeSame(422);
    }

    public function testMotDePasseOublieMemeReponseQueLEmailExisteOuNon(): void
    {
        $this->post('/api/v1/auth/forgot', ['email' => 'camille@example.test']);
        self::assertResponseStatusCodeSame(202);
        $connu = $this->client->getResponse()->getContent();

        $this->post('/api/v1/auth/forgot', ['email' => 'inconnu@example.test']);
        self::assertResponseStatusCodeSame(202);
        self::assertSame($connu, $this->client->getResponse()->getContent());
    }

    public function testNouveauMotDePasse(): void
    {
        $this->post('/api/v1/auth/reset', ['token' => $this->token(TokenType::PasswordReset), 'password' => 'nouveau2027']);

        self::assertResponseStatusCodeSame(204);
        self::assertSame(UserStatus::Active, $this->user()->status(), 'compte en attente activé au passage');
    }

    public function testChampManquantEn400(): void
    {
        $this->post('/api/v1/auth/reset', ['password' => 'nouveau2027']);

        self::assertResponseStatusCodeSame(400);
    }

    public function testTropDeDemandesDeMotDePasseOublieEn429(): void
    {
        $this->client->disableReboot();
        for ($i = 1; $i <= 5; ++$i) {
            $this->post('/api/v1/auth/forgot', ['email' => 'camille@example.test']);
            self::assertResponseStatusCodeSame(202, sprintf('demande n° %d acceptée', $i));
        }

        $this->post('/api/v1/auth/forgot', ['email' => 'camille@example.test']);

        self::assertResponseStatusCodeSame(429);
        self::assertResponseHasHeader('Retry-After');
        self::assertResponseHeaderSame('Content-Type', 'application/problem+json');
    }
}
