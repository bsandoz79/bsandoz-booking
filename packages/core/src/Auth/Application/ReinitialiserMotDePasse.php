<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Auth\Domain\Port\PasswordHasher;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Auth\Domain\Service\PolitiqueMotDePasse;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Nouveau mot de passe depuis le lien « mot de passe oublié ». Un compte encore en attente est activé au passage
 * (le lien prouve que le client a accès à sa boîte mail). Révocation des sessions ouvertes : feature/core-auth-session.
 */
final class ReinitialiserMotDePasse
{
    public function __construct(
        private UserRepository $users,
        private TokenService $tokens,
        private PasswordHasher $hasher,
        private PolitiqueMotDePasse $politique,
    ) {
    }

    /** @throws DomainError mot de passe trop faible, lien invalide ou expiré */
    public function __invoke(string $token, string $plainPassword): void
    {
        $this->politique->verifier($plainPassword);

        $userId = $this->tokens->consume($token, TokenType::PasswordReset)
            ?? throw new DomainError('Ce lien est invalide ou a expiré. Merci d\'en demander un nouveau.');

        $user = $this->users->get($userId);
        $hash = $this->hasher->hash($plainPassword);
        $user->status() === UserStatus::Pending ? $user->activate($hash) : $user->changePassword($hash);
        $this->users->save($user);
    }
}
