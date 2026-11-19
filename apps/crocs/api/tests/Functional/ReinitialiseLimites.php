<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Psr\Cache\CacheItemPoolInterface;

/** Remet à zéro les compteurs de limitation des tentatives (cache fichier conservé entre deux lancements des tests). */
trait ReinitialiseLimites
{
    private static function reinitialiserLimites(): void
    {
        $pool = static::getContainer()->get('cache.rate_limiter');
        self::assertInstanceOf(CacheItemPoolInterface::class, $pool);
        $pool->clear();
    }
}
