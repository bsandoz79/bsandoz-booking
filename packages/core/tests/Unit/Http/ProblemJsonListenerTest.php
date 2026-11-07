<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Http;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\ProblemJsonListener;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Symfony\Component\HttpKernel\HttpKernelInterface;

final class ProblemJsonListenerTest extends TestCase
{
    private function handle(\Throwable $exception, string $path = '/api/v1/catalog'): ExceptionEvent
    {
        $event = new ExceptionEvent($this->createStub(HttpKernelInterface::class), Request::create($path), HttpKernelInterface::MAIN_REQUEST, $exception);
        (new ProblemJsonListener())($event);

        return $event;
    }

    /** @return iterable<string, array{\Throwable, int, string}> */
    public static function exceptions(): iterable
    {
        yield 'introuvable' => [new NotFound('Prestation introuvable.'), 404, 'Prestation introuvable.'];
        yield 'règle métier' => [new DomainError('Option indisponible.'), 422, 'Option indisponible.'];
        yield 'requête invalide' => [new InvalidRequest('« prestationId » est obligatoire.'), 400, '« prestationId » est obligatoire.'];
    }

    #[DataProvider('exceptions')]
    public function testErreurEnProblemJson(\Throwable $exception, int $status, string $detail): void
    {
        $response = $this->handle($exception)->getResponse();

        self::assertNotNull($response);
        self::assertSame($status, $response->getStatusCode());
        self::assertSame('application/problem+json', $response->headers->get('Content-Type'));
        self::assertSame(
            ['type' => 'about:blank', 'title' => $response::$statusTexts[$status], 'status' => $status, 'detail' => $detail],
            json_decode((string) $response->getContent(), true),
        );
    }

    public function testExceptionHttpGardeSonStatutEtSesEntetes(): void
    {
        $response = $this->handle(new MethodNotAllowedHttpException(['GET']))->getResponse();

        self::assertNotNull($response);
        self::assertSame(405, $response->getStatusCode());
        self::assertSame('GET', $response->headers->get('Allow'));
    }

    public function testPasDeDetailPourUneErreurServeur(): void
    {
        $response = $this->handle(new ServiceUnavailableHttpException(null, 'détail interne'))->getResponse();

        self::assertNotNull($response);
        self::assertSame(503, $response->getStatusCode());
        self::assertArrayNotHasKey('detail', (array) json_decode((string) $response->getContent(), true));
    }

    public function testIgnoreLesExceptionsInattendues(): void
    {
        self::assertNull($this->handle(new \RuntimeException('bug'))->getResponse());
    }

    public function testIgnoreLesPagesHorsApi(): void
    {
        self::assertNull($this->handle(new NotFound('x'), '/autre')->getResponse());
    }
}
