<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Port;

use Bsandoz\Core\Notification\Domain\Model\AbonnementPush;

interface AbonnementsPush
{
    public function parEndpoint(string $endpoint): ?AbonnementPush;

    /** @return list<AbonnementPush> */
    public function tous(): array;

    public function enregistrer(AbonnementPush $abonnement): void;

    public function supprimer(AbonnementPush $abonnement): void;
}
