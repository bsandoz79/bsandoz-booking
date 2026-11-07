<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Http;

use Bsandoz\Core\Booking\Infrastructure\Http\ReservationRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class ReservationRequestTest extends TestCase
{
    /** @return array<string, mixed> */
    private static function body(): array
    {
        return [
            'prestationId' => 'p-1',
            'optionIds' => ['o-1'],
            'metierData' => ['cle' => 'valeur'],
            'variante' => 'v-1',
            'start' => '2026-11-10T09:00:00+01:00',
            'address' => ['label' => '1 rue de l\'Exemple', 'lat' => 49.89, 'lng' => 2],
            'firstname' => 'Camille',
            'lastname' => 'Martin',
            'email' => 'camille@example.test',
            'phone' => '0600000000',
            'notes' => 'Portail bleu',
            'acceptedTerms' => true,
        ];
    }

    /** @param array<string, mixed> $body */
    private static function request(array $body): Request
    {
        return Request::create('/api/v1/booking/reservations', 'POST', content: json_encode($body, JSON_THROW_ON_ERROR));
    }

    public function testCorpsComplet(): void
    {
        $c = ReservationRequest::toCommand(self::request(self::body()));

        self::assertSame('p-1', $c->prestationId);
        self::assertSame(['o-1'], $c->optionIds);
        self::assertSame(['cle' => 'valeur'], $c->metierData);
        self::assertSame('v-1', $c->variante);
        self::assertSame('2026-11-10T08:00:00+00:00', $c->start->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM));
        self::assertSame('1 rue de l\'Exemple', $c->address);
        self::assertSame(49.89, $c->lat);
        self::assertSame(2.0, $c->lng);
        self::assertSame('Portail bleu', $c->notes);
        self::assertTrue($c->acceptedTerms);
    }

    public function testActiviteSurPlaceSansAdresseNiNotes(): void
    {
        $body = self::body();
        $body['address'] = null;
        unset($body['notes'], $body['variante']);

        $c = ReservationRequest::toCommand(self::request($body));

        self::assertSame('', $c->address);
        self::assertNull($c->lat);
        self::assertSame('', $c->notes);
        self::assertNull($c->variante);
    }

    public function testCgvAccepteesUniquementAvecTrue(): void
    {
        $body = self::body();
        $body['acceptedTerms'] = 'oui';

        self::assertFalse(ReservationRequest::toCommand(self::request($body))->acceptedTerms);
    }

    /** @return iterable<string, array{string, mixed}> */
    public static function champsInvalides(): iterable
    {
        yield 'prestation absente' => ['prestationId', null];
        yield 'e-mail vide' => ['email', ' '];
        yield 'date sans fuseau' => ['start', '2026-11-10 09:00'];
        yield 'date absente' => ['start', null];
        yield 'options non liste' => ['optionIds', 'o-1'];
        yield 'metierData liste' => ['metierData', ['x']];
        yield 'adresse sans coordonnées' => ['address', ['label' => 'Rue']];
        yield 'adresse hors bornes' => ['address', ['label' => 'Rue', 'lat' => 95, 'lng' => 2]];
        yield 'adresse textuelle' => ['address', '1 rue'];
        yield 'variante non textuelle' => ['variante', 3];
    }

    #[DataProvider('champsInvalides')]
    public function testChampInvalide(string $key, mixed $value): void
    {
        $body = self::body();
        $body[$key] = $value;

        $this->expectException(InvalidRequest::class);
        ReservationRequest::toCommand(self::request($body));
    }

    public function testCorpsNonJson(): void
    {
        $this->expectException(InvalidRequest::class);
        ReservationRequest::toCommand(Request::create('/', 'POST', content: 'pas du json'));
    }
}
