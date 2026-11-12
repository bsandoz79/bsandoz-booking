<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Domain;

/** Montant en centimes d'euro, immuable. */
final class Money
{
    private function __construct(public readonly int $cents)
    {
        if ($cents < 0) {
            throw new DomainError('Un montant ne peut pas être négatif.');
        }
    }

    public static function cents(int $cents): self
    {
        return new self($cents);
    }

    public static function zero(): self
    {
        return new self(0);
    }

    public function add(self $other): self
    {
        return new self($this->cents + $other->cents);
    }

    /** @throws DomainError si le résultat serait négatif */
    public function subtract(self $other): self
    {
        return new self($this->cents - $other->cents);
    }

    public function multiply(int $factor): self
    {
        return new self($this->cents * $factor);
    }

    /** Pourcentage arrondi au centime supérieur. */
    public function percent(int $percent): self
    {
        return new self((int) ceil($this->cents * $percent / 100));
    }

    public function min(self $other): self
    {
        return $this->cents <= $other->cents ? $this : $other;
    }

    public function equals(self $other): bool
    {
        return $this->cents === $other->cents;
    }

    /** Ex. « 1 299,00 € ». */
    public function format(): string
    {
        return number_format($this->cents / 100, 2, ',', "\u{202F}") . "\u{00A0}€";
    }
}
