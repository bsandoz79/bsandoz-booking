<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * RGPD : suppression du compte par le client. Refusée s'il reste un rendez-vous à venir (à annuler d'abord).
 * Le compte est anonymisé, ses réservations aussi (adresse, précisions, données métier effacées ; montants et dates
 * gardés pour la comptabilité ; les factures conservent leurs mentions légales) et tous ses liens et sessions sont invalidés.
 */
final class SupprimerCompte
{
    public function __construct(
        private UserRepository $users,
        private ReservationRepository $reservations,
        private TokenService $tokens,
        private Clock $clock,
    ) {
    }

    /** @throws DomainError rendez-vous à venir */
    public function __invoke(string $userId): void
    {
        $now = $this->clock->now();
        foreach ($this->reservations->forUser($userId) as $reservation) {
            if ($reservation->period()->end > $now && $reservation->blocks($now)) {
                throw new DomainError('Vous avez un rendez-vous à venir : merci de l\'annuler avant de supprimer votre compte.');
            }
        }

        foreach ($this->reservations->forUser($userId) as $reservation) {
            $reservation->anonymiser();
            $this->reservations->save($reservation);
        }

        $user = $this->users->get($userId);
        $user->anonymize();
        $this->users->save($user);
        $this->tokens->revokeAll($userId, ...TokenType::cases());
    }
}
