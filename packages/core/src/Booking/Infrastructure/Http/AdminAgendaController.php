<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Application\GererDisponibilites;
use Bsandoz\Core\Booking\Application\GererRendezVousPro;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Payment\Application\CreerPaiementSurPlace;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Agenda dans l'espace pro (ROLE_PRO).
 * Horaires et indisponibilités :
 *   GET/PUT /api/v1/admin/availability/hours  {"hours": [{"weekday", "startsAt", "endsAt"}]}
 *   GET     /api/v1/admin/availability/unavailabilities?from=&to= ; POST {"start", "end", "reason"} ; DELETE …/{id}
 * Rendez-vous :
 *   GET   /api/v1/admin/reservations?from=&to=            → planning
 *   POST  /api/v1/admin/reservations {…, "sendDepositLink"} → rendez-vous pris par téléphone
 *   GET   /api/v1/admin/reservations/{id}                   → un rendez-vous (suivi du paiement par QR code)
 *   PATCH /api/v1/admin/reservations/{id} {"status": "done" | "no_show"}
 *   POST  /api/v1/admin/reservations/{id}/encaisser {"moyen": "carte" | "especes" | "virement" | "cheque"}
 *   POST  /api/v1/admin/reservations/{id}/paiement-qr       → {"url"} à afficher en QR code
 *   POST  /api/v1/admin/reservations/{id}/cancel {"refund": bool} ; POST …/{id}/refund {"amountCents"?}
 */
#[Route('/api/v1/admin')]
#[IsGranted('ROLE_PRO')]
final class AdminAgendaController
{
    public function __construct(
        private GererDisponibilites $disponibilites,
        private GererRendezVousPro $rendezVous,
        private SettingsProvider $settings,
        private CreerPaiementSurPlace $paiementSurPlace,
    ) {
    }

    #[Route('/availability/hours', name: 'bsandoz_admin_hours', methods: ['GET'])]
    public function horaires(): JsonResponse
    {
        return new JsonResponse($this->disponibilites->horaires());
    }

    #[Route('/availability/hours', name: 'bsandoz_admin_hours_update', methods: ['PUT'])]
    public function definirHoraires(Request $request): JsonResponse
    {
        $hours = Json::corps($request)['hours'] ?? null;
        if (!is_array($hours) || !array_is_list($hours) || array_filter($hours, static fn (mixed $h): bool => !is_array($h)) !== []) {
            throw new InvalidRequest('« hours » doit être une liste de plages {weekday, startsAt, endsAt}.');
        }
        /** @var list<array<string, mixed>> $hours */
        return new JsonResponse($this->disponibilites->definirHoraires($hours));
    }

    #[Route('/availability/unavailabilities', name: 'bsandoz_admin_unavailabilities', methods: ['GET'])]
    public function indisponibilites(Request $request): JsonResponse
    {
        [$from, $to] = $this->periode($request);

        return new JsonResponse($this->disponibilites->indisponibilites($from, $to));
    }

    #[Route('/availability/unavailabilities', name: 'bsandoz_admin_unavailability_create', methods: ['POST'])]
    public function ajouterIndisponibilite(Request $request): JsonResponse
    {
        $body = Json::corps($request);
        $tz = $this->settings->timezone();
        $id = $this->disponibilites->ajouterIndisponibilite(
            Json::date($body['start'] ?? null, 'start', $tz),
            Json::date($body['end'] ?? null, 'end', $tz),
            is_string($body['reason'] ?? null) ? $body['reason'] : '',
        );

        return new JsonResponse(['id' => $id], Response::HTTP_CREATED);
    }

    #[Route('/availability/unavailabilities/{id}', name: 'bsandoz_admin_unavailability_delete', methods: ['DELETE'])]
    public function supprimerIndisponibilite(string $id): Response
    {
        $this->disponibilites->supprimerIndisponibilite($id);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/reservations', name: 'bsandoz_admin_reservations', methods: ['GET'])]
    public function planning(Request $request): JsonResponse
    {
        [$from, $to] = $this->periode($request);

        return new JsonResponse($this->rendezVous->planning($from, $to));
    }

    #[Route('/reservations', name: 'bsandoz_admin_reservation_create', methods: ['POST'])]
    public function ajouter(Request $request): JsonResponse
    {
        $envoyerLien = (Json::corps($request)['sendDepositLink'] ?? false) === true;
        $commande = ReservationRequest::toCommand($request)->avecConditionsAcceptees();

        return new JsonResponse($this->rendezVous->ajouterParTelephone($commande, $envoyerLien), Response::HTTP_CREATED);
    }

    #[Route('/reservations/{id}', name: 'bsandoz_admin_reservation', methods: ['GET'])]
    public function detail(string $id): JsonResponse
    {
        return new JsonResponse($this->rendezVous->detail($id));
    }

    #[Route('/reservations/{id}/encaisser', name: 'bsandoz_admin_reservation_encaisser', methods: ['POST'])]
    public function encaisser(string $id, Request $request): Response
    {
        $moyen = Json::corps($request)['moyen'] ?? null;
        if (!is_string($moyen)) {
            throw new InvalidRequest('« moyen » est obligatoire (carte, especes, virement ou cheque).');
        }
        $this->rendezVous->encaisser($id, $moyen);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/reservations/{id}/paiement-qr', name: 'bsandoz_admin_reservation_paiement_qr', methods: ['POST'])]
    public function paiementQr(string $id): JsonResponse
    {
        return new JsonResponse(['url' => ($this->paiementSurPlace)($id)], Response::HTTP_CREATED);
    }

    #[Route('/reservations/{id}', name: 'bsandoz_admin_reservation_status', methods: ['PATCH'])]
    public function statut(string $id, Request $request): Response
    {
        $statut = Json::corps($request)['status'] ?? null;
        if (!is_string($statut)) {
            throw new InvalidRequest('« status » est obligatoire (done ou no_show).');
        }
        $this->rendezVous->changerStatut($id, $statut);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/reservations/{id}/cancel', name: 'bsandoz_admin_reservation_cancel', methods: ['POST'])]
    public function annuler(string $id, Request $request): JsonResponse
    {
        $rembourse = $this->rendezVous->annuler($id, (Json::corps($request)['refund'] ?? false) === true);

        return new JsonResponse(['refundedCents' => $rembourse->cents]);
    }

    #[Route('/reservations/{id}/refund', name: 'bsandoz_admin_reservation_refund', methods: ['POST'])]
    public function rembourser(string $id, Request $request): JsonResponse
    {
        $montant = Json::corps($request)['amountCents'] ?? null;
        if ($montant !== null && !is_int($montant)) {
            throw new InvalidRequest('« amountCents » doit être un nombre entier de centimes.');
        }

        return new JsonResponse(['refundedCents' => $this->rendezVous->rembourser($id, $montant)->cents]);
    }

    /** @return array{\DateTimeImmutable, \DateTimeImmutable} */
    private function periode(Request $request): array
    {
        $tz = $this->settings->timezone();

        return [Json::date($request->query->get('from'), 'from', $tz), Json::date($request->query->get('to'), 'to', $tz)];
    }
}
