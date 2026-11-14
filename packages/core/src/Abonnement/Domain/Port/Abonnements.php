<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Domain\Port;

use Bsandoz\Core\Abonnement\Domain\Model\Abonnement;
use Bsandoz\Core\Shared\Domain\NotFound;

interface Abonnements
{
    /** @throws NotFound */
    public function get(string $id): Abonnement;

    /** @return list<Abonnement> du client, les plus récents d'abord */
    public function duClient(string $userId): array;

    public function parSession(string $sessionId): ?Abonnement;

    public function parFournisseur(string $fournisseurId): ?Abonnement;

    /** @return list<Abonnement> tous, les plus récents d'abord */
    public function tous(): array;

    public function save(Abonnement $abonnement): void;
}
