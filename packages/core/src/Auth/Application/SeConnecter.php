<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\PasswordHasher;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Shared\Domain\NonAuthentifie;

/**
 * Connexion par e-mail et mot de passe. Même message et même coût de calcul que le compte existe ou non,
 * qu'il soit en attente d'activation, supprimé, ou que le mot de passe soit faux.
 */
final class SeConnecter
{
    private const MESSAGE = 'E-mail ou mot de passe incorrect.';

    private ?string $hashFactice = null;

    public function __construct(
        private UserRepository $users,
        private PasswordHasher $hasher,
        private TokenService $tokens,
    ) {
    }

    /** @throws NonAuthentifie */
    public function __invoke(string $email, string $plainPassword): Session
    {
        $user = $this->users->findByEmail($email);
        $hash = $user?->passwordHash() ?? ($this->hashFactice ??= $this->hasher->hash(bin2hex(random_bytes(16))));
        $valide = $this->hasher->verify($hash, $plainPassword);

        if ($user === null || !$valide || !$user->canLogIn()) {
            throw new NonAuthentifie(self::MESSAGE);
        }

        $refresh = $this->tokens->issue($user->id(), TokenType::Refresh, new \DateInterval(Session::TTL), replacePrevious: false);

        return new Session($user->id(), $user->roles(), $refresh);
    }
}
