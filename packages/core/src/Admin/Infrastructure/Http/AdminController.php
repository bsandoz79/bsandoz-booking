<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Infrastructure\Http;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/** Espace pro : tout est protégé par ROLE_PRO. */
#[Route('/api/v1/admin')]
#[IsGranted('ROLE_PRO')]
final class AdminController
{
    /** @todo Planning : réservations entre from et to, avec client et adresse. */
    #[Route('/reservations', methods: ['GET'])]
    public function reservations(Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    /** @todo Rendez-vous pris par téléphone (AjouterRendezVousManuel). */
    #[Route('/reservations', methods: ['POST'])]
    public function addReservation(Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    /** @todo Changer le statut (done, no_show), rembourser. */
    #[Route('/reservations/{id}', methods: ['PATCH'])]
    public function updateReservation(string $id, Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    /** @todo CRUD prestations, tarifs, options. */
    #[Route('/catalog/{resource}', methods: ['GET', 'POST', 'PATCH', 'DELETE'])]
    public function catalog(string $resource, Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    /** @todo Horaires, indisponibilités, règles, zone, paramètres. */
    #[Route('/settings/{section}', methods: ['GET', 'PUT'])]
    public function settings(string $section, Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    /** @todo Rendez-vous de la semaine, CA du mois, taux d'annulation. */
    #[Route('/dashboard', methods: ['GET'])]
    public function dashboard(): JsonResponse { throw new \LogicException('À implémenter'); }
}
