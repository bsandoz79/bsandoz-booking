<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Payment;

use Bsandoz\Core\Payment\Domain\SignatureInvalide;
use Bsandoz\Core\Payment\Infrastructure\StripeGateway;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\TestCase;
use Stripe\ApiRequestor;
use Stripe\HttpClient\ClientInterface;
use Stripe\HttpClient\CurlClient;

/** Adaptateur Stripe testé sans réseau : faux client HTTP du SDK, signatures de webhook calculées comme Stripe. */
final class StripeGatewayTest extends TestCase
{
    private const WEBHOOK_SECRET = 'whsec_test_secret';

    /** @var list<array{method: string, url: string, params: array<mixed>}> */
    private array $requetes = [];

    /** @param list<array{string, int}> $reponses corps JSON et code HTTP, dans l'ordre */
    private function stripe(array $reponses): StripeGateway
    {
        $this->requetes = [];
        $test = $this;
        ApiRequestor::setHttpClient(new class($reponses, $test) implements ClientInterface {
            /** @param list<array{string, int}> $reponses */
            public function __construct(private array $reponses, private StripeGatewayTest $test)
            {
            }

            /**
             * @param array<mixed> $headers
             * @param array<mixed> $params
             * @return array{string, int, array<mixed>}
             */
            public function request($method, $absUrl, $headers, $params, $hasFile, $apiMode = 'v1')
            {
                $this->test->enregistrer((string) $method, (string) $absUrl, (array) $params);
                [$body, $code] = array_shift($this->reponses) ?? ['{}', 500];

                return [$body, $code, []];
            }
        });

        return new StripeGateway('sk_test_123', self::WEBHOOK_SECRET);
    }

    /** @param array<mixed> $params */
    public function enregistrer(string $method, string $url, array $params): void
    {
        $this->requetes[] = ['method' => $method, 'url' => $url, 'params' => $params];
    }

    protected function tearDown(): void
    {
        ApiRequestor::setHttpClient(CurlClient::instance());
    }

    private static function signer(string $payload, ?int $timestamp = null): string
    {
        $timestamp ??= time();

        return sprintf('t=%d,v1=%s', $timestamp, hash_hmac('sha256', $timestamp . '.' . $payload, self::WEBHOOK_SECRET));
    }

    public function testCreationDeLaSessionCheckout(): void
    {
        $stripe = $this->stripe([['{"id": "cs_test_abc", "object": "checkout.session", "url": "https://checkout.stripe.com/c/pay/cs_test_abc"}', 200]]);

        $session = $stripe->createCheckout('r-1', Money::cents(3000), 'Acompte : Nettoyage', 'camille@example.test', 'https://site.test/ok', 'https://site.test/annule');

        self::assertSame(['sessionId' => 'cs_test_abc', 'url' => 'https://checkout.stripe.com/c/pay/cs_test_abc'], $session);
        $requete = $this->requetes[0];
        self::assertSame('post', strtolower($requete['method']));
        self::assertStringEndsWith('/v1/checkout/sessions', $requete['url']);
        self::assertSame('payment', $requete['params']['mode']);
        self::assertSame(3000, $requete['params']['line_items'][0]['price_data']['unit_amount']);
        self::assertSame('eur', $requete['params']['line_items'][0]['price_data']['currency']);
        self::assertSame('Acompte : Nettoyage', $requete['params']['line_items'][0]['price_data']['product_data']['name']);
        self::assertSame('camille@example.test', $requete['params']['customer_email']);
        self::assertSame('r-1', $requete['params']['metadata']['reservation_id']);
        self::assertSame('https://site.test/ok', $requete['params']['success_url']);
        self::assertEqualsWithDelta(time() + 1800, $requete['params']['expires_at'], 5, 'expiration à 30 min');
    }

    public function testStripeIndisponible(): void
    {
        $stripe = $this->stripe([['{"error": {"message": "Erreur interne", "type": "api_error"}}', 500]]);

        $this->expectException(DomainError::class);
        $stripe->createCheckout('r-1', Money::cents(3000), 'Acompte', 'camille@example.test', 'https://site.test/ok', 'https://site.test/annule');
    }

    public function testPaiementNonConfigure(): void
    {
        $this->expectException(DomainError::class);
        $this->expectExceptionMessage('pas encore configuré');
        (new StripeGateway('', self::WEBHOOK_SECRET))->createCheckout('r-1', Money::cents(3000), 'Acompte', 'c@example.test', 'https://a.test', 'https://b.test');
    }

    public function testRemboursementSurLeMoyenDePaiementDeLaSession(): void
    {
        $stripe = $this->stripe([
            ['{"id": "cs_test_abc", "object": "checkout.session", "payment_intent": "pi_123"}', 200],
            ['{"id": "re_1", "object": "refund", "amount": 1000}', 200],
        ]);

        $stripe->refund('cs_test_abc', Money::cents(1000));

        self::assertStringEndsWith('/v1/checkout/sessions/cs_test_abc', $this->requetes[0]['url']);
        self::assertStringEndsWith('/v1/refunds', $this->requetes[1]['url']);
        self::assertSame(['payment_intent' => 'pi_123', 'amount' => 1000], $this->requetes[1]['params']);
    }

    public function testRemboursementSansEncaissement(): void
    {
        $stripe = $this->stripe([['{"id": "cs_test_abc", "object": "checkout.session", "payment_intent": null}', 200]]);

        $this->expectException(DomainError::class);
        $stripe->refund('cs_test_abc', Money::cents(1000));
    }

    public function testWebhookSigneDeSessionReglee(): void
    {
        $payload = json_encode([
            'id' => 'evt_1', 'object' => 'event', 'type' => 'checkout.session.completed',
            'data' => ['object' => ['id' => 'cs_test_abc', 'object' => 'checkout.session', 'payment_status' => 'paid']],
        ], JSON_THROW_ON_ERROR);

        $evenement = (new StripeGateway('sk_test_123', self::WEBHOOK_SECRET))->parseWebhook($payload, self::signer($payload));

        self::assertSame('evt_1', $evenement->id);
        self::assertSame('cs_test_abc', $evenement->sessionId);
        self::assertTrue($evenement->confirmeUnPaiement());
    }

    public function testWebhookPaiementDiffereNonRegle(): void
    {
        $payload = json_encode([
            'id' => 'evt_2', 'object' => 'event', 'type' => 'checkout.session.completed',
            'data' => ['object' => ['id' => 'cs_test_abc', 'object' => 'checkout.session', 'payment_status' => 'unpaid']],
        ], JSON_THROW_ON_ERROR);

        self::assertFalse((new StripeGateway('sk', self::WEBHOOK_SECRET))->parseWebhook($payload, self::signer($payload))->confirmeUnPaiement());
    }

    public function testWebhookAvecMauvaiseSignature(): void
    {
        $payload = '{"id": "evt_1", "object": "event", "type": "checkout.session.completed", "data": {"object": {}}}';

        $this->expectException(SignatureInvalide::class);
        (new StripeGateway('sk', self::WEBHOOK_SECRET))->parseWebhook($payload, 't=' . time() . ',v1=' . str_repeat('0', 64));
    }

    public function testWebhookTropAncienRefuse(): void
    {
        $payload = '{"id": "evt_1", "object": "event", "type": "checkout.session.completed", "data": {"object": {}}}';

        $this->expectException(SignatureInvalide::class);
        (new StripeGateway('sk', self::WEBHOOK_SECRET))->parseWebhook($payload, self::signer($payload, time() - 3600));
    }

    public function testWebhookSansSecretConfigure(): void
    {
        $this->expectException(SignatureInvalide::class);
        (new StripeGateway('sk', ''))->parseWebhook('{}', 't=1,v1=abc');
    }
}
