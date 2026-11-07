<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Shared\Domain\Clock;

/** Jetons en mémoire, valeurs prévisibles « <type>-<n> » ; mêmes règles que le vrai service. */
final class InMemoryTokenService implements TokenService
{
    /** @var array<string, array{subject: string, type: TokenType, expiresAt: \DateTimeImmutable, used: bool}> */
    private array $tokens = [];
    private int $next = 1;

    public function __construct(private Clock $clock)
    {
    }

    public function issue(string $subjectId, TokenType $type, \DateInterval $ttl, bool $replacePrevious = true): string
    {
        if ($replacePrevious) {
            $this->revokeAll($subjectId, $type);
        }

        $plain = sprintf('%s-%d', $type->value, $this->next++);
        $this->tokens[$plain] = ['subject' => $subjectId, 'type' => $type, 'expiresAt' => $this->clock->now()->add($ttl), 'used' => false];

        return $plain;
    }

    public function revokeAll(string $subjectId, TokenType ...$types): void
    {
        foreach ($this->tokens as &$token) {
            if ($token['subject'] === $subjectId && in_array($token['type'], $types, true)) {
                $token['used'] = true;
            }
        }
        unset($token);
    }

    public function consume(string $plainToken, TokenType $type): ?string
    {
        $subject = $this->verify($plainToken, $type);
        if ($subject !== null) {
            $this->tokens[$plainToken]['used'] = true;
        }

        return $subject;
    }

    public function verify(string $plainToken, TokenType $type): ?string
    {
        $token = $this->tokens[$plainToken] ?? null;
        if ($token === null || $token['type'] !== $type || $token['used'] || $this->clock->now() >= $token['expiresAt']) {
            return null;
        }

        return $token['subject'];
    }
}
