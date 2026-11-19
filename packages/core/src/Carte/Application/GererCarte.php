<?php

declare(strict_types=1);

namespace Bsandoz\Core\Carte\Application;

use Bsandoz\Core\Carte\Domain\Model\Article;
use Bsandoz\Core\Carte\Domain\Model\Categorie;
use Bsandoz\Core\Carte\Domain\Port\Articles;
use Bsandoz\Core\Carte\Domain\Port\Categories;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\Conflit;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * La carte d'un commerce, lue par les visiteurs et modifiée par le pro (rubriques et articles).
 * Les règles (prix barré, « Nouveau », « Épuisé ») sont dans `Article` ; ici, l'orchestration et les vues.
 *
 * @phpstan-type VueArticle array{id: string, categorieId: string, nom: string, description: string, prixCents: int, prixBarreCents: int|null, nouveau: bool, epuise: bool, photo: string|null, visible: bool}
 * @phpstan-type VueRubrique array{id: string, nom: string, note: string, icone: string|null, articles: list<VueArticle>}
 */
final class GererCarte
{
    public function __construct(
        private Categories $categories,
        private Articles $articles,
        private Clock $clock,
        private IdGenerator $ids,
        /** Fuseau du commerce : « Épuisé » dure jusqu'à minuit à cette heure-là. */
        private string $fuseau = 'Europe/Paris',
    ) {
    }

    /**
     * Carte publique : rubriques dans l'ordre, articles visibles seulement, rubriques vides omises.
     *
     * @return list<VueRubrique>
     */
    public function publique(): array
    {
        return array_values(array_filter($this->vue(false), static fn (array $r): bool => $r['articles'] !== []));
    }

    /**
     * Carte de l'espace pro : toutes les rubriques, articles cachés compris.
     *
     * @return list<VueRubrique>
     */
    public function pro(): array
    {
        return $this->vue(true);
    }

    public function ajouterRubrique(string $nom, string $note = '', ?string $icone = null): Categorie
    {
        $categorie = new Categorie($this->ids->generate(), $nom, count($this->categories->all()), $note, $icone);
        $this->categories->save($categorie);

        return $categorie;
    }

    /** Modifie les champs donnés (null : inchangé ; pour l'icône, '' la retire). */
    public function modifierRubrique(string $id, ?string $nom = null, ?string $note = null, ?string $icone = null): Categorie
    {
        $categorie = $this->categories->get($id);
        if ($nom !== null) {
            $categorie->renommer($nom);
        }
        if ($note !== null) {
            $categorie->changerNote($note);
        }
        if ($icone !== null) {
            $categorie->changerIcone($icone);
        }
        $this->categories->save($categorie);

        return $categorie;
    }

    public function renommerRubrique(string $id, string $nom): void
    {
        $this->modifierRubrique($id, $nom);
    }

    /** @return array{id: string, nom: string, note: string, icone: string|null} */
    public static function vueRubrique(Categorie $c): array
    {
        return ['id' => $c->id(), 'nom' => $c->nom(), 'note' => $c->note(), 'icone' => $c->icone()];
    }

    /** @throws Conflit la rubrique contient encore des articles */
    public function supprimerRubrique(string $id): void
    {
        $categorie = $this->categories->get($id);
        foreach ($this->articles->all() as $article) {
            if ($article->categorieId() === $id) {
                throw new Conflit('Videz ou déplacez d’abord les articles de cette rubrique.');
            }
        }
        $this->categories->remove($categorie);
    }

    /** @param list<string> $ids nouvel ordre des rubriques */
    public function ordonnerRubriques(array $ids): void
    {
        foreach ($ids as $position => $id) {
            $categorie = $this->categories->get($id);
            $categorie->changerPosition($position);
            $this->categories->save($categorie);
        }
    }

    /** Nouvel article, à la fin de sa rubrique : « Nouveau » pendant un mois. */
    public function ajouterArticle(string $categorieId, string $nom, string $description, int $prixCents, bool $visible = true, ?string $photo = null): Article
    {
        $this->categories->get($categorieId);
        $position = count(array_filter($this->articles->all(), static fn (Article $a): bool => $a->categorieId() === $categorieId));
        $article = new Article($this->ids->generate(), $categorieId, $nom, self::prix($prixCents), $this->clock->now(), $description, $position, $visible, self::photo($photo));
        $this->articles->save($article);

        return $article;
    }

    /** Modification : un prix différent garde l'ancien barré pendant un mois. */
    public function modifierArticle(string $id, string $categorieId, string $nom, string $description, int $prixCents, bool $visible, ?string $photo): Article
    {
        $this->categories->get($categorieId);
        $article = $this->articles->get($id);
        $article->modifier($nom, $description, $categorieId, $visible);
        $article->changerPrix(self::prix($prixCents), $this->clock->now());
        $article->changerPhoto(self::photo($photo));
        $this->articles->save($article);

        return $article;
    }

    /** « Épuisé » jusqu'au lendemain, ou remis en vente. */
    public function epuiser(string $id, bool $epuise): Article
    {
        $article = $this->articles->get($id);
        if ($epuise) {
            $article->marquerEpuise($this->clock->now(), new \DateTimeZone($this->fuseau));
        } else {
            $article->remettreEnVente();
        }
        $this->articles->save($article);

        return $article;
    }

    /** @param list<string> $ids nouvel ordre des articles d'une rubrique */
    public function ordonnerArticles(array $ids): void
    {
        foreach ($ids as $position => $id) {
            $article = $this->articles->get($id);
            $article->changerPosition($position);
            $this->articles->save($article);
        }
    }

    public function supprimerArticle(string $id): void
    {
        $this->articles->remove($this->articles->get($id));
    }

    /** @return VueArticle */
    public function vueArticle(Article $a): array
    {
        $maintenant = $this->clock->now();

        return [
            'id' => $a->id(),
            'categorieId' => $a->categorieId(),
            'nom' => $a->nom(),
            'description' => $a->description(),
            'prixCents' => $a->prix()->cents,
            'prixBarreCents' => $a->prixBarre($maintenant)?->cents,
            'nouveau' => $a->estNouveau($maintenant),
            'epuise' => $a->estEpuise($maintenant),
            'photo' => $a->photo(),
            'visible' => $a->estVisible(),
        ];
    }

    /** @return list<VueRubrique> */
    private function vue(bool $tout): array
    {
        $categories = $this->categories->all();
        usort($categories, static fn (Categorie $a, Categorie $b): int => [$a->position(), $a->nom()] <=> [$b->position(), $b->nom()]);
        $articles = $this->articles->all();
        usort($articles, static fn (Article $a, Article $b): int => [$a->position(), $a->nom()] <=> [$b->position(), $b->nom()]);

        $rubriques = [];
        foreach ($categories as $c) {
            $liste = [];
            foreach ($articles as $a) {
                if ($a->categorieId() === $c->id() && ($tout || $a->estVisible())) {
                    $liste[] = $this->vueArticle($a);
                }
            }
            $rubriques[] = [...self::vueRubrique($c), 'articles' => $liste];
        }

        return $rubriques;
    }

    private static function prix(int $cents): Money
    {
        if ($cents > 1_000_000) {
            throw new DomainError('Prix trop élevé.');
        }

        return Money::cents($cents);
    }

    /** Nom d'une photo envoyée par /admin/medias (pas de chemin ni d'adresse extérieure). */
    private static function photo(?string $photo): ?string
    {
        $photo = $photo === null ? '' : trim($photo);
        if ($photo === '') {
            return null;
        }
        if (preg_match('/^[A-Za-z0-9._-]{1,120}$/', $photo) !== 1 || str_contains($photo, '..')) {
            throw new DomainError('Photo invalide : envoyez-la depuis l’espace pro.');
        }

        return $photo;
    }
}
