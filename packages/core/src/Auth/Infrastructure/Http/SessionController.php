<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Infrastructure\Http;

use Bsandoz\Core\Auth\Application\RenouvelerSession;
use Bsandoz\Core\Auth\Application\SeConnecter;
use Bsandoz\Core\Auth\Application\SeDeconnecter;
use Bsandoz\Core\Auth\Application\Session;
use Bsandoz\Core\Auth\Infrastructure\Security\SecurityUser;
use Bsandoz\Core\Shared\Domain\NonAuthentifie;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Limiteur;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Session : jeton d'accès JWT court (dans la réponse, à envoyer en « Authorization: Bearer … ») et jeton de
 * renouvellement de 30 jours dans un cookie httpOnly, Secure, SameSite=Strict, limité aux routes /api/v1/auth.
 *   POST /api/v1/auth/login   {"email", "password"} → {"token", "expiresIn", "roles"} + cookie
 *   POST /api/v1/auth/refresh (cookie)              → nouveau jeton + nouveau cookie (rotation)
 *   POST /api/v1/auth/logout  (cookie)              → 204, cookie effacé
 */
#[Route('/api/v1/auth')]
final class SessionController
{
    public const COOKIE = 'bsandoz_refresh';
    private const COOKIE_PATH = '/api/v1/auth';

    public function __construct(
        private SeConnecter $connecter,
        private RenouvelerSession $renouveler,
        private SeDeconnecter $deconnecter,
        private JWTTokenManagerInterface $jwt,
        private RateLimiterFactoryInterface $loginLimiter,
        private int $accessTokenTtl,
    ) {
    }

    #[Route('/login', name: 'bsandoz_auth_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        Limiteur::consommer($this->loginLimiter, $request);
        $body = json_decode($request->getContent(), true);
        $email = is_array($body) ? ($body['email'] ?? null) : null;
        $password = is_array($body) ? ($body['password'] ?? null) : null;
        if (!is_string($email) || !is_string($password) || $email === '' || $password === '') {
            throw new InvalidRequest('« email » et « password » sont obligatoires.');
        }

        return $this->ouvrir(($this->connecter)($email, $password));
    }

    #[Route('/refresh', name: 'bsandoz_auth_refresh', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $token = $request->cookies->get(self::COOKIE);
        if (!is_string($token) || $token === '') {
            throw new NonAuthentifie('Votre session a expiré, merci de vous reconnecter.');
        }

        return $this->ouvrir(($this->renouveler)($token));
    }

    #[Route('/logout', name: 'bsandoz_auth_logout', methods: ['POST'])]
    public function logout(Request $request): Response
    {
        $token = $request->cookies->get(self::COOKIE);
        ($this->deconnecter)(is_string($token) ? $token : null);

        $response = new Response(null, Response::HTTP_NO_CONTENT);
        $response->headers->clearCookie(self::COOKIE, self::COOKIE_PATH, null, true, true, Cookie::SAMESITE_STRICT);

        return $response;
    }

    private function ouvrir(Session $session): JsonResponse
    {
        $response = new JsonResponse([
            'token' => $this->jwt->create(new SecurityUser($session->userId, $session->roles)),
            'expiresIn' => $this->accessTokenTtl,
            'roles' => $session->roles,
        ]);
        $response->headers->setCookie(
            Cookie::create(self::COOKIE)
                ->withValue($session->refreshToken)
                ->withExpires((new \DateTimeImmutable())->add(new \DateInterval(Session::TTL)))
                ->withPath(self::COOKIE_PATH)
                ->withSecure(true)
                ->withHttpOnly(true)
                ->withSameSite(Cookie::SAMESITE_STRICT),
        );

        return $response;
    }
}
