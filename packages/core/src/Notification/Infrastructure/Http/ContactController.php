<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Http;

use Bsandoz\Core\Notification\Application\EnvoyerDemandeContact;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Bsandoz\Core\Shared\Infrastructure\Http\Limiteur;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/** POST /api/v1/contact : demande de contact ou de devis transmise au pro par mail (limitée par adresse IP). */
final class ContactController
{
    public function __construct(
        private EnvoyerDemandeContact $envoyer,
        private RateLimiterFactoryInterface $contactLimiter,
    ) {
    }

    #[Route('/api/v1/contact', name: 'bsandoz_contact', methods: ['POST'])]
    public function envoyer(Request $request): Response
    {
        Limiteur::consommer($this->contactLimiter, $request);
        ($this->envoyer)(Json::corps($request));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
