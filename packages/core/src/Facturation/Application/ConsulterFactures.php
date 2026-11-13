<?php

declare(strict_types=1);

namespace Bsandoz\Core\Facturation\Application;

use Bsandoz\Core\Facturation\Domain\Model\Facture;
use Bsandoz\Core\Facturation\Domain\Port\FactureRepository;
use Bsandoz\Core\Shared\Domain\NotFound;

/** Factures de l'espace pro (toutes) et de l'espace client (les siennes), en tableaux prêts pour l'API. */
final class ConsulterFactures
{
    public function __construct(private FactureRepository $factures)
    {
    }

    /** @return list<array<string, mixed>> */
    public function toutes(): array
    {
        return array_map(self::resume(...), $this->factures->toutes());
    }

    /** @return list<array<string, mixed>> */
    public function duClient(string $userId): array
    {
        return array_map(self::resume(...), $this->factures->pourClient($userId));
    }

    /**
     * @param string|null $userId client connecté : seule sa facture est visible (null : espace pro)
     * @return array<string, mixed>
     * @throws NotFound
     */
    public function voir(string $id, ?string $userId = null): array
    {
        $f = $this->factures->get($id);
        if ($userId !== null && $f->userId() !== $userId) {
            throw new NotFound('Facture introuvable.');
        }

        // Détail : la fiche complète du client remplace son nom seul.
        return array_merge(self::resume($f), [
            'vendeur' => $f->vendeur(),
            'client' => $f->client(),
            'lignes' => $f->lignes(),
            'payeEnLigneCents' => $f->payeEnLigne()->cents,
            'payeSurPlaceCents' => $f->payeSurPlace()->cents,
            'moyenSurPlace' => $f->moyenSurPlace(),
        ]);
    }

    /**
     * Facture d'une réservation, si elle a été émise (identifiant et numéro).
     *
     * @return array{id: string, numero: string}|null
     */
    public function deLaReservation(string $reservationId): ?array
    {
        $f = $this->factures->pourReservation($reservationId);

        return $f === null ? null : ['id' => $f->id(), 'numero' => $f->numero()];
    }

    /** @return array<string, mixed> */
    private static function resume(Facture $f): array
    {
        $utc = new \DateTimeZone('UTC');

        return [
            'id' => $f->id(),
            'numero' => $f->numero(),
            'reservationId' => $f->reservationId(),
            'emiseLe' => $f->emiseLe()->setTimezone($utc)->format(DATE_ATOM),
            'prestationLe' => $f->prestationLe()->setTimezone($utc)->format(DATE_ATOM),
            'client' => ($f->client()['entreprise'] ?? '') !== '' ? $f->client()['entreprise'] : ($f->client()['nom'] ?? ''),
            'totalCents' => $f->total()->cents,
        ];
    }
}
