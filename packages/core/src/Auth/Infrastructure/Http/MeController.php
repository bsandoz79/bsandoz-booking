<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Infrastructure\Http;

use Bsandoz\Core\Auth\Application\ExporterDonnees;
use Bsandoz\Core\Auth\Application\SupprimerCompte;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Auth\Infrastructure\Security\SecurityUser;
use Bsandoz\Core\Booking\Application\AnnulerReservation;
use Bsandoz\Core\Booking\Application\DeplacerReservation;
use Bsandoz\Core\Booking\Application\MesReservations;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Espace client (jeton d'accès obligatoire, rôle ROLE_CLIENT). Chaque client n'accède qu'à ses propres données :
 * les cas d'usage vérifient le titulaire (une réservation d'un autre client répond « introuvable »).
 */
#[Route('/api/v1/me')]
final class MeController
{
    public function __construct(
        private UserRepository $users,
        private MesReservations $mesReservations,
        private AnnulerReservation $annuler,
        private DeplacerReservation $deplacer,
        private ExporterDonnees $exporter,
        private SupprimerCompte $supprimer,
    ) {
    }

    #[Route('', name: 'bsandoz_me', methods: ['GET'])]
    public function me(#[CurrentUser] SecurityUser $user): JsonResponse
    {
        $compte = $this->users->get($user->id());

        return new JsonResponse([
            'id' => $compte->id(),
            'email' => $compte->email(),
            'firstname' => $compte->firstname(),
            'lastname' => $compte->lastname(),
            'phone' => $compte->phone(),
            'roles' => $compte->roles(),
        ]);
    }

    #[Route('', name: 'bsandoz_me_delete', methods: ['DELETE'])]
    public function delete(#[CurrentUser] SecurityUser $user): Response
    {
        ($this->supprimer)($user->id());

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/export', name: 'bsandoz_me_export', methods: ['GET'])]
    public function export(#[CurrentUser] SecurityUser $user): JsonResponse
    {
        $response = new JsonResponse(($this->exporter)($user->id()));
        $response->headers->set('Content-Disposition', 'attachment; filename="mes-donnees.json"');

        return $response;
    }

    #[Route('/reservations', name: 'bsandoz_me_reservations', methods: ['GET'])]
    public function reservations(#[CurrentUser] SecurityUser $user): JsonResponse
    {
        return new JsonResponse(array_map(self::vue(...), ($this->mesReservations)($user->id())));
    }

    #[Route('/reservations/{id}', name: 'bsandoz_me_reservation_cancel', methods: ['DELETE'])]
    public function cancel(string $id, #[CurrentUser] SecurityUser $user): JsonResponse
    {
        return new JsonResponse(['refundable' => ($this->annuler)($id, $user->id())]);
    }

    #[Route('/reservations/{id}', name: 'bsandoz_me_reservation_move', methods: ['PATCH'])]
    public function move(string $id, Request $request, #[CurrentUser] SecurityUser $user): Response
    {
        $body = json_decode($request->getContent(), true);
        $start = is_array($body) && is_string($body['start'] ?? null) ? \DateTimeImmutable::createFromFormat(DATE_ATOM, $body['start']) : false;
        if ($start === false) {
            throw new InvalidRequest('« start » doit être une date ISO 8601 avec fuseau, ex. 2026-11-10T08:00:00+00:00.');
        }
        ($this->deplacer)($id, $start, $user->id());

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /** @return array<string, mixed> */
    private static function vue(Reservation $r): array
    {
        $utc = new \DateTimeZone('UTC');

        return [
            'id' => $r->id(),
            'status' => $r->status()->value,
            'prestationId' => $r->prestationId(),
            'optionIds' => $r->optionIds(),
            'start' => $r->period()->start->setTimezone($utc)->format(DATE_ATOM),
            'end' => $r->period()->end->setTimezone($utc)->format(DATE_ATOM),
            'address' => $r->address(),
            'totalCents' => $r->total()->cents,
            'depositCents' => $r->deposit()->cents,
        ];
    }
}
