<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Admin;

use Bsandoz\Core\Admin\Infrastructure\Persistence\DoctrineSettingRepository;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

final class DoctrineSettingRepositoryTest extends DoctrineTestCase
{
    public function testEnregistrePuisRemplace(): void
    {
        $repository = new DoctrineSettingRepository($this->em, new FrozenClock('2026-11-08 10:00'));
        self::assertNull($repository->get('rules'));

        $repository->save('rules', ['minNoticeHours' => 12]);
        $this->reload();
        self::assertSame(['minNoticeHours' => 12], $repository->get('rules'));

        $repository->save('rules', ['minNoticeHours' => 6]);
        $this->reload();
        self::assertSame(['minNoticeHours' => 6], $repository->get('rules'));
    }
}
