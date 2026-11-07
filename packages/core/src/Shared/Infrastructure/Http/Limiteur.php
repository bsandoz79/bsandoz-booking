<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure\Http;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/** Limitation des tentatives par adresse IP (429 Too Many Requests avec en-tête Retry-After). */
final class Limiteur
{
    public static function consommer(RateLimiterFactoryInterface $factory, Request $request): void
    {
        $limit = $factory->create($request->getClientIp() ?? 'inconnue')->consume();
        if (!$limit->isAccepted()) {
            $retryAfter = max(1, $limit->getRetryAfter()->getTimestamp() - time());

            throw new TooManyRequestsHttpException($retryAfter, 'Trop de tentatives : merci de réessayer un peu plus tard.');
        }
    }
}
