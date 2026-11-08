<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Domain\Port;

interface SettingRepository
{
    /** @return array<string, mixed>|null valeur enregistrée, ou null si le pro n'a encore rien réglé */
    public function get(string $key): ?array;

    /** @param array<string, mixed> $value */
    public function save(string $key, array $value): void;
}
