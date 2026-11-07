<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Infrastructure\Http;

use Bsandoz\Core\Auth\Application\ActiverCompte;
use Bsandoz\Core\Auth\Application\DemanderReinitialisation;
use Bsandoz\Core\Auth\Application\ReinitialiserMotDePasse;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Limiteur;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Comptes par lien reçu par mail :
 *   POST /api/v1/auth/activate {"token", "password"} → 204
 *   POST /api/v1/auth/forgot   {"email"}             → 202 (même réponse que l'e-mail existe ou non)
 *   POST /api/v1/auth/reset    {"token", "password"} → 204
 * Connexion et session : feature/core-auth-session.
 */
#[Route('/api/v1/auth')]
final class AuthController
{
    public function __construct(
        private ActiverCompte $activer,
        private DemanderReinitialisation $demander,
        private ReinitialiserMotDePasse $reinitialiser,
        private RateLimiterFactoryInterface $activationLimiter,
        private RateLimiterFactoryInterface $forgotLimiter,
    ) {
    }

    #[Route('/activate', name: 'bsandoz_auth_activate', methods: ['POST'])]
    public function activate(Request $request): Response
    {
        Limiteur::consommer($this->activationLimiter, $request);
        $body = self::body($request);
        ($this->activer)(self::string($body, 'token'), self::string($body, 'password'));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/forgot', name: 'bsandoz_auth_forgot', methods: ['POST'])]
    public function forgot(Request $request): JsonResponse
    {
        Limiteur::consommer($this->forgotLimiter, $request);
        ($this->demander)(self::string(self::body($request), 'email'));

        return new JsonResponse(['message' => 'Si un compte existe pour cette adresse, un lien vient de lui être envoyé.'], Response::HTTP_ACCEPTED);
    }

    #[Route('/reset', name: 'bsandoz_auth_reset', methods: ['POST'])]
    public function reset(Request $request): Response
    {
        Limiteur::consommer($this->activationLimiter, $request);
        $body = self::body($request);
        ($this->reinitialiser)(self::string($body, 'token'), self::string($body, 'password'));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /** @return array<mixed> */
    private static function body(Request $request): array
    {
        try {
            $body = json_decode($request->getContent(), true, 8, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new InvalidRequest('Le corps de la requête doit être un objet JSON.');
        }
        if (!is_array($body)) {
            throw new InvalidRequest('Le corps de la requête doit être un objet JSON.');
        }

        return $body;
    }

    /** @param array<mixed> $body */
    private static function string(array $body, string $key): string
    {
        $value = $body[$key] ?? null;
        if (!is_string($value) || $value === '') {
            throw new InvalidRequest(sprintf('« %s » est obligatoire.', $key));
        }

        return $value;
    }
}
