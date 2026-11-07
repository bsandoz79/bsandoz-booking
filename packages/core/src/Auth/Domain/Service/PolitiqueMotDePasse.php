<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Service;

use Bsandoz\Core\Shared\Domain\DomainError;

/** Mot de passe accepté : 10 à 4096 caractères, avec au moins une lettre et un chiffre. */
final class PolitiqueMotDePasse
{
    public const MIN = 10;
    private const MAX = 4096;

    /** @throws DomainError mot de passe trop faible */
    public function verifier(string $plainPassword): void
    {
        $length = mb_strlen($plainPassword);
        if ($length < self::MIN || $length > self::MAX) {
            throw new DomainError(sprintf('Le mot de passe doit contenir au moins %d caractères.', self::MIN));
        }
        if (preg_match('/\p{L}/u', $plainPassword) !== 1 || preg_match('/\d/', $plainPassword) !== 1) {
            throw new DomainError('Le mot de passe doit contenir au moins une lettre et un chiffre.');
        }
    }
}
