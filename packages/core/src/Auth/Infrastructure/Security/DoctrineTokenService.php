<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Infrastructure\Security;

use Bsandoz\Core\Auth\Domain\Model\AuthToken;
use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineTokenService implements TokenService
{
    public function __construct(
        private EntityManagerInterface $em,
        private IdGenerator $ids,
        private Clock $clock,
    ) {
    }

    public function issue(string $subjectId, TokenType $type, \DateInterval $ttl): string
    {
        $now = $this->clock->now();
        foreach ($this->em->getRepository(AuthToken::class)->findBy(['subjectId' => $subjectId, 'type' => $type, 'usedAt' => null]) as $previous) {
            $previous->use($now);
        }

        $plain = bin2hex(random_bytes(32));
        $this->em->persist(new AuthToken($this->ids->generate(), $subjectId, $type, self::hash($plain), $now->add($ttl)));
        $this->em->flush();

        return $plain;
    }

    public function consume(string $plainToken, TokenType $type): ?string
    {
        $token = $this->find($plainToken, $type);
        if ($token === null) {
            return null;
        }
        $token->use($this->clock->now());
        $this->em->flush();

        return $token->subjectId();
    }

    public function verify(string $plainToken, TokenType $type): ?string
    {
        return $this->find($plainToken, $type)?->subjectId();
    }

    private function find(string $plainToken, TokenType $type): ?AuthToken
    {
        if (preg_match('/^[0-9a-f]{64}$/', $plainToken) !== 1) {
            return null;
        }
        $token = $this->em->getRepository(AuthToken::class)->findOneBy(['tokenHash' => self::hash($plainToken), 'type' => $type]);

        return $token !== null && $token->isUsable($this->clock->now()) ? $token : null;
    }

    private static function hash(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }
}
