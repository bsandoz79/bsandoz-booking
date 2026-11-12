<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Infrastructure\Persistence;

use Bsandoz\Core\Admin\Domain\Model\Setting;
use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Shared\Domain\Clock;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineSettingRepository implements SettingRepository
{
    public function __construct(
        private EntityManagerInterface $em,
        private Clock $clock,
    ) {
    }

    public function get(string $key): ?array
    {
        return $this->em->find(Setting::class, $key)?->value();
    }

    public function save(string $key, array $value): void
    {
        $setting = $this->em->find(Setting::class, $key);
        if ($setting === null) {
            $this->em->persist(new Setting($key, $value, $this->clock->now()));
        } else {
            $setting->changer($value, $this->clock->now());
        }
        $this->em->flush();
    }
}
