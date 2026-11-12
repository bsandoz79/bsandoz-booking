<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Admin\Domain\Port\SettingRepository;

final class InMemorySettingRepository implements SettingRepository
{
    /** @var array<string, array<string, mixed>> */
    private array $items = [];

    public function get(string $key): ?array
    {
        return $this->items[$key] ?? null;
    }

    public function save(string $key, array $value): void
    {
        $this->items[$key] = $value;
    }
}
