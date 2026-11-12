<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Infrastructure\Http;

use Bsandoz\Core\Admin\Application\GererContenuSite;
use Bsandoz\Core\Admin\Application\GererMedias;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Contenu modifiable du site et photos.
 *   GET    /api/v1/site                  (public) → contenu ({} si rien n'a été modifié)
 *   PUT    /api/v1/admin/site            {…}      → remplace le contenu
 *   GET    /api/v1/admin/medias                   → [{name, url}]
 *   POST   /api/v1/admin/medias          (multipart, champ « fichier ») → {name, url}
 *   DELETE /api/v1/admin/medias/{name}
 */
final class SiteController
{
    public function __construct(
        private GererContenuSite $contenu,
        private GererMedias $medias,
        private string $cheminPublic = '/medias/',
    ) {
    }

    #[Route('/api/v1/site', name: 'bsandoz_site', methods: ['GET'])]
    public function lire(): JsonResponse
    {
        $reponse = new JsonResponse((object) $this->contenu->lire());
        $reponse->setPublic();
        $reponse->setMaxAge(60);

        return $reponse;
    }

    #[Route('/api/v1/admin/site', name: 'bsandoz_admin_site', methods: ['PUT'])]
    #[IsGranted('ROLE_PRO')]
    public function enregistrer(Request $request): JsonResponse
    {
        return new JsonResponse((object) $this->contenu->enregistrer(Json::corps($request)));
    }

    #[Route('/api/v1/admin/medias', name: 'bsandoz_admin_medias', methods: ['GET'])]
    #[IsGranted('ROLE_PRO')]
    public function lister(Request $request): JsonResponse
    {
        return new JsonResponse(array_map(fn (string $nom): array => $this->vue($request, $nom), $this->medias->lister()));
    }

    #[Route('/api/v1/admin/medias', name: 'bsandoz_admin_medias_upload', methods: ['POST'])]
    #[IsGranted('ROLE_PRO')]
    public function envoyer(Request $request): JsonResponse
    {
        $fichier = $request->files->get('fichier');
        if (!$fichier instanceof UploadedFile || !$fichier->isValid()) {
            throw new InvalidRequest('Photo manquante ou trop lourde (champ « fichier », 5 Mo au plus).');
        }
        $contenu = file_get_contents($fichier->getPathname());
        $nom = $this->medias->envoyer($contenu === false ? '' : $contenu);

        return new JsonResponse($this->vue($request, $nom), Response::HTTP_CREATED);
    }

    #[Route('/api/v1/admin/medias/{name}', name: 'bsandoz_admin_medias_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_PRO')]
    public function supprimer(string $name): Response
    {
        $this->medias->supprimer($name);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /** @return array{name: string, url: string} */
    private function vue(Request $request, string $nom): array
    {
        return ['name' => $nom, 'url' => $request->getSchemeAndHttpHost() . $this->cheminPublic . $nom];
    }
}
