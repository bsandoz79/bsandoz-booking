<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Notification\Domain\Model\AbonnementPush;
use Bsandoz\Core\Notification\Domain\Port\AbonnementsPush;

final class InMemoryAbonnementsPush implements AbonnementsPush
{
    /** @var array<string, AbonnementPush> par endpoint */
    private array $abonnements = [];

    public function parEndpoint(string $endpoint): ?AbonnementPush
    {
        return $this->abonnements[$endpoint] ?? null;
    }

    public function tous(): array
    {
        return array_values($this->abonnements);
    }

    public function enregistrer(AbonnementPush $abonnement): void
    {
        $this->abonnements[$abonnement->endpoint] = $abonnement;
    }

    public function supprimer(AbonnementPush $abonnement): void
    {
        unset($this->abonnements[$abonnement->endpoint]);
    }
}
