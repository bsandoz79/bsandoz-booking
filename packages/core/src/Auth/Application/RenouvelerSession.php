<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Shared\Domain\NonAuthentifie;

/** Renouvelle la session : le jeton présenté est consommé et remplacé (rotation), le compte doit toujours pouvoir se connecter. */
final class RenouvelerSession
{
    public function __construct(
        private TokenService $tokens,
        private UserRepository $users,
    ) {
    }

    /** @throws NonAuthentifie session inconnue, expirée ou compte désactivé */
    public function __invoke(string $refreshToken): Session
    {
        $userId = $this->tokens->consume($refreshToken, TokenType::Refresh)
            ?? throw new NonAuthentifie('Votre session a expiré, merci de vous reconnecter.');

        $user = $this->users->get($userId);
        if (!$user->canLogIn()) {
            throw new NonAuthentifie('Votre session a expiré, merci de vous reconnecter.');
        }

        $refresh = $this->tokens->issue($user->id(), TokenType::Refresh, new \DateInterval(Session::TTL), replacePrevious: false);

        return new Session($user->id(), $user->roles(), $refresh);
    }
}
