<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Domain\Model;

/** Paramètre réglé par le pro dans son espace (ex. « rules », « zone »), valeur JSON. */
class Setting
{
    public const REGLES = 'rules';
    public const ZONE = 'zone';
    /** Contenu éditorial du site (textes, coordonnées, FAQ, avis, photos). */
    public const CONTENU = 'site';

    /** @param array<string, mixed> $value */
    public function __construct(
        private string $key,
        private array $value,
        private \DateTimeImmutable $updatedAt,
    ) {
    }

    public function key(): string { return $this->key; }

    /** @return array<string, mixed> */
    public function value(): array { return $this->value; }

    public function updatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    /** @param array<string, mixed> $value */
    public function changer(array $value, \DateTimeImmutable $now): void
    {
        $this->value = $value;
        $this->updatedAt = $now;
    }
}
