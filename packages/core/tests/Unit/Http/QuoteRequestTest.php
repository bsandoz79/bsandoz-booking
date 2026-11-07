<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Http;

use Bsandoz\Core\Catalog\Infrastructure\Http\QuoteRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class QuoteRequestTest extends TestCase
{
    private static function request(string $body): Request
    {
        return Request::create('/api/v1/booking/quote', 'POST', content: $body);
    }

    public function testCorpsComplet(): void
    {
        $q = QuoteRequest::fromRequest(self::request(json_encode([
            'prestationId' => 'p-1',
            'optionIds' => ['o-1', 'o-2'],
            'metierData' => ['cle' => 'valeur'],
            'variante' => 'v-1',
            'lat' => 49.89,
            'lng' => 2,
        ], JSON_THROW_ON_ERROR)));

        self::assertSame('p-1', $q->prestationId);
        self::assertSame(['o-1', 'o-2'], $q->optionIds);
        self::assertSame(['cle' => 'valeur'], $q->metierData);
        self::assertSame('v-1', $q->variante);
        self::assertSame(49.89, $q->lat);
        self::assertSame(2.0, $q->lng);
    }

    public function testValeursParDefaut(): void
    {
        $q = QuoteRequest::fromRequest(self::request('{"prestationId": "p-1", "metierData": {}}'));

        self::assertSame([], $q->optionIds);
        self::assertSame([], $q->metierData);
        self::assertNull($q->variante);
        self::assertNull($q->lat);
        self::assertNull($q->lng);
    }

    /** @return iterable<string, array{string}> */
    public static function corpsInvalides(): iterable
    {
        yield 'pas du JSON' => ['pas du json'];
        yield 'liste JSON' => ['["p-1"]'];
        yield 'nombre JSON' => ['42'];
        yield 'prestation absente' => ['{}'];
        yield 'prestation vide' => ['{"prestationId": "  "}'];
        yield 'prestation non textuelle' => ['{"prestationId": 12}'];
        yield 'options non liste' => ['{"prestationId": "p", "optionIds": {"a": "o-1"}}'];
        yield 'option non textuelle' => ['{"prestationId": "p", "optionIds": ["o-1", 3]}'];
        yield 'metierData liste' => ['{"prestationId": "p", "metierData": ["x"]}'];
        yield 'variante non textuelle' => ['{"prestationId": "p", "variante": 3}'];
        yield 'latitude seule' => ['{"prestationId": "p", "lat": 49.8}'];
        yield 'longitude textuelle' => ['{"prestationId": "p", "lat": 49.8, "lng": "2.3"}'];
        yield 'latitude hors bornes' => ['{"prestationId": "p", "lat": 91, "lng": 2}'];
        yield 'longitude hors bornes' => ['{"prestationId": "p", "lat": 49, "lng": -181}'];
    }

    #[DataProvider('corpsInvalides')]
    public function testCorpsInvalide(string $body): void
    {
        $this->expectException(InvalidRequest::class);
        QuoteRequest::fromRequest(self::request($body));
    }
}
