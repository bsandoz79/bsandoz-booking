<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Le client modifie ses coordonnées depuis son espace : nom et prénom, téléphone, e-mail (qui sert aussi à se connecter).
 * Champs absents : inchangés.
 */
final class ModifierMonCompte
{
    public function __construct(private UserRepository $users)
    {
    }

    /**
     * @param array<string, mixed> $data {firstname?, lastname?, phone?, email?}
     * @throws DomainError champ invalide ou e-mail déjà utilisé
     */
    public function __invoke(string $userId, array $data): User
    {
        $user = $this->users->get($userId);
        $texte = static function (string $cle, string $actuel, int $max) use ($data): string {
            if (!array_key_exists($cle, $data)) {
                return $actuel;
            }
            $valeur = $data[$cle];
            if (!is_string($valeur) || mb_strlen(trim($valeur)) > $max) {
                throw new DomainError(sprintf('« %s » : texte de %d caractères au plus.', $cle, $max));
            }

            return trim($valeur);
        };

        $firstname = $texte('firstname', $user->firstname(), 100);
        $lastname = $texte('lastname', $user->lastname(), 100);
        $phone = $texte('phone', $user->phone(), 30);
        $email = mb_strtolower($texte('email', $user->email(), 180));

        if ($firstname === '') {
            throw new DomainError('Le nom est obligatoire.');
        }
        if ($phone === '' || !preg_match('/^\+?[\d\s.\-()]{6,30}$/', $phone)) {
            throw new DomainError('Numéro de téléphone invalide.');
        }
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new DomainError('Adresse e-mail invalide.');
        }
        if ($email !== $user->email()) {
            $autre = $this->users->findByEmail($email);
            if ($autre !== null && $autre->id() !== $user->id()) {
                throw new DomainError('Cette adresse e-mail est déjà utilisée par un autre compte.');
            }
        }

        $user->changerCoordonnees($email, $firstname, $lastname, $phone);
        $this->users->save($user);

        return $user;
    }
}
