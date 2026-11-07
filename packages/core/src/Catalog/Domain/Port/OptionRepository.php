<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Port;

use Bsandoz\Core\Catalog\Domain\Model\Option;

interface OptionRepository
{
    public function get(string $id): Option;

    /** @param list<string> $ids
     *  @return list<Option> */
    public function getMany(array $ids): array;

    public function save(Option $option): void;
}
