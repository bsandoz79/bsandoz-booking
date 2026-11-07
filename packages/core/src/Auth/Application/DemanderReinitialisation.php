<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Notification\Domain\Port\Notifier;

/**
 * Mot de passe oublié (ou changement depuis l'espace client) : mail avec un lien valable 1 h.
 * Rien ne permet de savoir si l'e-mail est connu : le cas d'usage ne renvoie rien et ne lève rien.
 */
final class DemanderReinitialisation
{
    private const RESET_TTL = 'PT1H';

    public function __construct(
        private UserRepository $users,
        private TokenService $tokens,
        private Notifier $notifier,
    ) {
    }

    public function __invoke(string $email): void
    {
        $user = $this->users->findByEmail($email);
        if ($user === null || $user->status() === UserStatus::Deleted) {
            return;
        }

        $token = $this->tokens->issue($user->id(), TokenType::PasswordReset, new \DateInterval(self::RESET_TTL));
        $this->notifier->send($user->email(), 'password_reset', ['firstname' => $user->firstname(), 'token' => $token]);
    }
}
