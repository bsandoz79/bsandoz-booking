<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Model;

/** Utilisateur. Créé « pending » (sans mot de passe) à la 1re réservation, « active » après activation. */
class User
{
    private ?string $passwordHash = null;
    private UserStatus $status = UserStatus::Pending;

    /** @param list<string> $roles */
    public function __construct(
        private string $id,
        private string $email,
        private string $firstname,
        private string $lastname,
        private string $phone,
        private array $roles = ['ROLE_CLIENT'],
        private ?\DateTimeImmutable $createdAt = null,
    ) {
    }

    public function id(): string { return $this->id; }
    public function email(): string { return $this->email; }
    public function firstname(): string { return $this->firstname; }
    public function lastname(): string { return $this->lastname; }
    public function phone(): string { return $this->phone; }
    public function createdAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function status(): UserStatus { return $this->status; }
    /** @return list<string> */
    public function roles(): array { return $this->roles; }
    public function passwordHash(): ?string { return $this->passwordHash; }

    public function activate(string $passwordHash): void
    {
        $this->passwordHash = $passwordHash;
        $this->status = UserStatus::Active;
    }

    public function changePassword(string $passwordHash): void
    {
        $this->passwordHash = $passwordHash;
    }

    /**
     * Suppression du compte (RGPD) : plus aucune donnée personnelle, connexion impossible.
     * L'identifiant est conservé pour que les réservations passées (obligations comptables) restent cohérentes.
     */
    public function anonymize(): void
    {
        $this->email = sprintf('supprime-%s@invalid', $this->id);
        $this->firstname = '';
        $this->lastname = '';
        $this->phone = '';
        $this->passwordHash = null;
        $this->roles = [];
        $this->status = UserStatus::Deleted;
    }

    public function canLogIn(): bool
    {
        return $this->status === UserStatus::Active && $this->passwordHash !== null;
    }
}
