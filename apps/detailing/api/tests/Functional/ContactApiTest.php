<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Demande de devis depuis la page « Professionnels » : mail au pro avec l'adresse du demandeur en « répondre à ». */
final class ContactApiTest extends WebTestCase
{
    use ReinitialiseLimites;

    public function testDemandeTransmiseAuPro(): void
    {
        $client = static::createClient();
        self::reinitialiserLimites();
        $client->enableProfiler();
        $client->request('POST', '/api/v1/contact', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'nom' => 'Alex Martin', 'email' => 'alex@transport.test', 'entreprise' => 'Transports Martin', 'telephone' => '0600000000',
            'message' => 'Devis pour nos utilitaires.', 'details' => ['Type de véhicules' => 'Utilitaires', 'Fréquence' => 'Mensuelle'],
        ], JSON_THROW_ON_ERROR));

        self::assertResponseStatusCodeSame(204);
        self::assertEmailCount(1);
        $mail = self::getMailerMessage();
        self::assertNotNull($mail);
        self::assertEmailAddressContains($mail, 'To', 'pro@example.test');
        self::assertEmailAddressContains($mail, 'Reply-To', 'alex@transport.test');
        self::assertEmailTextBodyContains($mail, 'Fréquence : Mensuelle');
    }

    public function testChampsManquantsEn422(): void
    {
        $client = static::createClient();
        self::reinitialiserLimites();
        $client->request('POST', '/api/v1/contact', server: ['CONTENT_TYPE' => 'application/json'], content: '{"nom": "Alex"}');
        self::assertResponseStatusCodeSame(422);
    }
}
