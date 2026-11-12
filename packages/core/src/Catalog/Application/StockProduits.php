<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Application;

use Bsandoz\Core\Catalog\Domain\Port\ProduitRepository;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Produits ajoutés à une réservation : retirés du stock à la réservation (prix figé dans la réservation), remis en stock
 * si la réservation est annulée ou n'est pas payée à temps.
 *
 * @phpstan-type LigneProduit array{id: string, nom: string, prixCents: int, quantite: int}
 */
final class StockProduits
{
    public function __construct(private ProduitRepository $produits)
    {
    }

    /**
     * Vérifie tout avant de retirer quoi que ce soit du stock.
     *
     * @param array<string, int> $quantites identifiant → quantité
     * @return list<LigneProduit>
     * @throws DomainError produit inconnu, retiré, quantité invalide ou stock insuffisant
     */
    public function retirer(array $quantites): array
    {
        $produits = [];
        foreach ($quantites as $id => $quantite) {
            try {
                $produit = $this->produits->get((string) $id);
            } catch (NotFound) {
                throw new DomainError('Un des produits choisis n\'est plus proposé.');
            }
            $copie = clone $produit;
            $copie->retirerDuStock($quantite);
            $produits[] = [$produit, $quantite];
        }

        $lignes = [];
        foreach ($produits as [$produit, $quantite]) {
            $produit->retirerDuStock($quantite);
            $this->produits->save($produit);
            $lignes[] = ['id' => $produit->id(), 'nom' => $produit->nom(), 'prixCents' => $produit->prix()->cents, 'quantite' => $quantite];
        }

        return $lignes;
    }

    /**
     * Paiement arrivé après l'expiration : les produits remis en stock sont repris (stock jamais négatif : le pro voit
     * la vente dans le rendez-vous).
     *
     * @param list<array{id: string, quantite: int}> $lignes
     */
    public function reprendre(array $lignes): void
    {
        foreach ($lignes as $ligne) {
            try {
                $produit = $this->produits->get($ligne['id']);
            } catch (NotFound) {
                continue;
            }
            $produit->reprendre($ligne['quantite']);
            $this->produits->save($produit);
        }
    }

    /** @param list<array{id: string, quantite: int}> $lignes produits d'une réservation annulée ou expirée */
    public function remettre(array $lignes): void
    {
        foreach ($lignes as $ligne) {
            try {
                $produit = $this->produits->get($ligne['id']);
            } catch (NotFound) {
                continue;
            }
            $produit->remettreEnStock($ligne['quantite']);
            $this->produits->save($produit);
        }
    }
}
