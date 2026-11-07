<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\PasswordHasher;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Auth\Domain\Service\PolitiqueMotDePasse;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Activation du compte depuis le lien reçu par mail : le client choisit son mot de passe.
 * Le mot de passe est vérifié avant de consommer le jeton, pour qu'un mot de passe refusé ne grille pas le lien.
 */
final class ActiverCompte
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

        $userId = $this->tokens->consume($token, TokenType::Activation)
            ?? throw new DomainError('Ce lien d\'activation est invalide ou a expiré.');

        $user = $this->users->get($userId);
        $user->activate($this->hasher->hash($plainPassword));
        $this->users->save($user);
    }
}
