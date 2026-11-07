<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Route d'autocomplétion (sans appel réseau : moins de 3 caractères). L'adaptateur est testé dans le kit avec un faux client HTTP. */
final class GeoApiTest extends WebTestCase
{
    public function testRechercheTropCourteSansResultat(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/geo/search?q=12');

        self::assertResponseIsSuccessful();
        self::assertSame('[]', $client->getResponse()->getContent());
    }
}
