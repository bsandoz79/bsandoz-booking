<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Model;

/**
 * Jeton envoyé par mail (activation, mot de passe oublié, gestion d'une réservation).
 * Seul le hachage SHA-256 de la valeur est conservé ; sujet = compte ou réservation selon le type.
 */
class AuthToken
{
    private ?\DateTimeImmutable $usedAt = null;

    public function __construct(
        private string $id,
        private string $subjectId,
        private TokenType $type,
        private string $tokenHash,
        private \DateTimeImmutable $expiresAt,
    ) {
    }

    public function id(): string { return $this->id; }
    public function subjectId(): string { return $this->subjectId; }
    public function type(): TokenType { return $this->type; }
    public function tokenHash(): string { return $this->tokenHash; }
    public function expiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function usedAt(): ?\DateTimeImmutable { return $this->usedAt; }

    public function isUsable(\DateTimeImmutable $now): bool
    {
        return $this->usedAt === null && $now < $this->expiresAt;
    }

    /** Marque le jeton comme utilisé (consommé ou remplacé par un jeton plus récent). */
    public function use(\DateTimeImmutable $now): void
    {
        $this->usedAt ??= $now;
    }
}
