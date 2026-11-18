<?php

declare(strict_types=1);

namespace Bsandoz\Core\Carte\Infrastructure\Http;

use Bsandoz\Core\Carte\Application\GererCarte;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Carte d'un commerce (module Carte).
 *   GET    /api/v1/carte                                (public) → [{id, nom, articles: [{…, prixBarreCents, nouveau, epuise}]}]
 *   GET    /api/v1/admin/carte                          (pro)    → toutes les rubriques et articles (cachés compris)
 *   POST   /api/v1/admin/carte/rubriques                {nom}
 *   PATCH  /api/v1/admin/carte/rubriques/{id}           {nom}
 *   DELETE /api/v1/admin/carte/rubriques/{id}           (refusé si la rubrique a des articles)
 *   PUT    /api/v1/admin/carte/rubriques-ordre          {ids}
 *   POST   /api/v1/admin/carte/articles                 {categorieId, nom, description?, prixCents, visible?, photo?}
 *   PUT    /api/v1/admin/carte/articles/{id}            {categorieId, nom, description, prixCents, visible, photo}
 *   PUT    /api/v1/admin/carte/articles/{id}/epuise     {epuise: bool}
 *   PUT    /api/v1/admin/carte/articles-ordre           {ids}
 *   DELETE /api/v1/admin/carte/articles/{id}
 */
final class CarteController
{
    public function __construct(private GererCarte $carte)
    {
    }

    #[Route('/api/v1/carte', name: 'bsandoz_carte', methods: ['GET'])]
    public function publique(): JsonResponse
    {
        $reponse = new JsonResponse($this->carte->publique());
        // Court : un prix changé ou « Épuisé » doit se voir vite.
        $reponse->setPublic();
        $reponse->setMaxAge(30);

        return $reponse;
    }

    #[Route('/api/v1/admin/carte', name: 'bsandoz_admin_carte', methods: ['GET'])]
    #[IsGranted('ROLE_PRO')]
    public function pro(): JsonResponse
    {
        return new JsonResponse($this->carte->pro());
    }

    #[Route('/api/v1/admin/carte/rubriques', name: 'bsandoz_admin_carte_rubrique_ajouter', methods: ['POST'])]
    #[IsGranted('ROLE_PRO')]
    public function ajouterRubrique(Request $request): JsonResponse
    {
        $c = $this->carte->ajouterRubrique(self::texte(Json::corps($request), 'nom'));

        return new JsonResponse(['id' => $c->id(), 'nom' => $c->nom()], Response::HTTP_CREATED);
    }

    #[Route('/api/v1/admin/carte/rubriques/{id}', name: 'bsandoz_admin_carte_rubrique_renommer', methods: ['PATCH'])]
    #[IsGranted('ROLE_PRO')]
    public function renommerRubrique(string $id, Request $request): Response
    {
        $this->carte->renommerRubrique($id, self::texte(Json::corps($request), 'nom'));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/v1/admin/carte/rubriques/{id}', name: 'bsandoz_admin_carte_rubrique_supprimer', methods: ['DELETE'])]
    #[IsGranted('ROLE_PRO')]
    public function supprimerRubrique(string $id): Response
    {
        $this->carte->supprimerRubrique($id);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/v1/admin/carte/rubriques-ordre', name: 'bsandoz_admin_carte_rubriques_ordre', methods: ['PUT'])]
    #[IsGranted('ROLE_PRO')]
    public function ordonnerRubriques(Request $request): Response
    {
        $this->carte->ordonnerRubriques(self::ids(Json::corps($request)));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/v1/admin/carte/articles', name: 'bsandoz_admin_carte_article_ajouter', methods: ['POST'])]
    #[IsGranted('ROLE_PRO')]
    public function ajouterArticle(Request $request): JsonResponse
    {
        $d = Json::corps($request);
        $article = $this->carte->ajouterArticle(
            self::texte($d, 'categorieId'),
            self::texte($d, 'nom'),
            self::texte($d, 'description', ''),
            self::prix($d),
            ($d['visible'] ?? true) !== false,
            self::photo($d),
        );

        return new JsonResponse($this->carte->vueArticle($article), Response::HTTP_CREATED);
    }

    #[Route('/api/v1/admin/carte/articles/{id}', name: 'bsandoz_admin_carte_article_modifier', methods: ['PUT'])]
    #[IsGranted('ROLE_PRO')]
    public function modifierArticle(string $id, Request $request): JsonResponse
    {
        $d = Json::corps($request);
        $article = $this->carte->modifierArticle(
            $id,
            self::texte($d, 'categorieId'),
            self::texte($d, 'nom'),
            self::texte($d, 'description', ''),
            self::prix($d),
            ($d['visible'] ?? true) !== false,
            self::photo($d),
        );

        return new JsonResponse($this->carte->vueArticle($article));
    }

    #[Route('/api/v1/admin/carte/articles/{id}/epuise', name: 'bsandoz_admin_carte_article_epuise', methods: ['PUT'])]
    #[IsGranted('ROLE_PRO')]
    public function epuiser(string $id, Request $request): JsonResponse
    {
        $epuise = Json::corps($request)['epuise'] ?? null;
        if (!is_bool($epuise)) {
            throw new InvalidRequest('« epuise » doit valoir true ou false.');
        }

        return new JsonResponse($this->carte->vueArticle($this->carte->epuiser($id, $epuise)));
    }

    #[Route('/api/v1/admin/carte/articles-ordre', name: 'bsandoz_admin_carte_articles_ordre', methods: ['PUT'])]
    #[IsGranted('ROLE_PRO')]
    public function ordonnerArticles(Request $request): Response
    {
        $this->carte->ordonnerArticles(self::ids(Json::corps($request)));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/v1/admin/carte/articles/{id}', name: 'bsandoz_admin_carte_article_supprimer', methods: ['DELETE'])]
    #[IsGranted('ROLE_PRO')]
    public function supprimerArticle(string $id): Response
    {
        $this->carte->supprimerArticle($id);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /** @param array<string, mixed> $d */
    private static function texte(array $d, string $cle, ?string $defaut = null): string
    {
        $valeur = $d[$cle] ?? $defaut;
        if (!is_string($valeur)) {
            throw new InvalidRequest(sprintf('« %s » doit être un texte.', $cle));
        }

        return $valeur;
    }

    /** @param array<string, mixed> $d */
    private static function prix(array $d): int
    {
        $prix = $d['prixCents'] ?? null;
        if (!is_int($prix) || $prix < 0) {
            throw new InvalidRequest('« prixCents » doit être un nombre entier de centimes (ex. 750 pour 7,50 €).');
        }

        return $prix;
    }

    /** @param array<string, mixed> $d */
    private static function photo(array $d): ?string
    {
        $photo = $d['photo'] ?? null;
        if ($photo !== null && !is_string($photo)) {
            throw new InvalidRequest('« photo » doit être le nom d’une photo envoyée, ou null.');
        }

        return $photo;
    }

    /**
     * @param array<string, mixed> $d
     *
     * @return list<string>
     */
    private static function ids(array $d): array
    {
        $ids = $d['ids'] ?? null;
        if (!is_array($ids) || !array_is_list($ids) || array_filter($ids, static fn (mixed $id): bool => !is_string($id)) !== []) {
            throw new InvalidRequest('« ids » doit être la liste des identifiants dans le nouvel ordre.');
        }

        /** @var list<string> $ids */
        return $ids;
    }
}
