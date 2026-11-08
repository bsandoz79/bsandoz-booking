<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Port;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Shared\Domain\NotFound;

interface OptionRepository
{
    /** @throws NotFound */
    public function get(string $id): Option;

    /**
     * Options demandées, dans l'ordre des identifiants (doublons ignorés).
     *
     * @param list<string> $ids
     * @return list<Option>
     * @throws NotFound si un identifiant est inconnu
     */
    public function getMany(array $ids): array;

    /** @return list<Option> toutes les options, actives ou non (espace pro), triées par nom */
    public function all(): array;

    /** @return list<Option> options actives, triées par nom */
    public function allActive(): array;

    /** Crée ou remplace l'option du même identifiant. */
    public function save(Option $option): void;
}
