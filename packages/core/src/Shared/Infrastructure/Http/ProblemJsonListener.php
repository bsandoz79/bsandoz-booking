<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure\Http;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Erreurs de l'API (/api/…) en application/problem+json (RFC 9457) :
 * NotFound → 404, DomainError → 422, InvalidRequest → 400, HttpException → son statut.
 * Les autres exceptions restent gérées par Symfony (500, sans fuite de détail en production).
 */
final class ProblemJsonListener
{
    public function __invoke(ExceptionEvent $event): void
    {
        if (!str_starts_with($event->getRequest()->getPathInfo(), '/api/')) {
            return;
        }

        $exception = $event->getThrowable();
        [$status, $detail] = match (true) {
            $exception instanceof NotFound => [Response::HTTP_NOT_FOUND, $exception->getMessage()],
            $exception instanceof DomainError => [Response::HTTP_UNPROCESSABLE_ENTITY, $exception->getMessage()],
            $exception instanceof InvalidRequest => [Response::HTTP_BAD_REQUEST, $exception->getMessage()],
            $exception instanceof HttpExceptionInterface => [
                $exception->getStatusCode(),
                $exception->getStatusCode() < 500 ? $exception->getMessage() : null,
            ],
            default => [null, null],
        };

        if ($status === null) {
            return;
        }

        $headers = $exception instanceof HttpExceptionInterface ? $exception->getHeaders() : [];
        $headers['Content-Type'] = 'application/problem+json';

        $event->setResponse(new JsonResponse(array_filter([
            'type' => 'about:blank',
            'title' => Response::$statusTexts[$status] ?? 'Erreur',
            'status' => $status,
            'detail' => $detail !== '' ? $detail : null,
        ], static fn (mixed $value): bool => $value !== null), $status, $headers));
    }
}
