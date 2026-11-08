<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Http;

use Bsandoz\Core\Notification\Application\FluxAgendaPro;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * GET /api/v1/ical/{secret}.ics : flux d'agenda du pro, protégé par un secret dans l'adresse
 * (BSANDOZ_ICAL_SECRET, au moins 32 caractères). Secret absent ou faux : 404.
 */
final class AgendaController
{
    public function __construct(
        private FluxAgendaPro $flux,
        private ?string $secret,
    ) {
    }

    #[Route('/api/v1/ical/{secret}.ics', name: 'bsandoz_ical_feed', methods: ['GET'])]
    public function feed(string $secret): Response
    {
        if ($this->secret === null || strlen($this->secret) < 32 || !hash_equals($this->secret, $secret)) {
            throw new NotFoundHttpException('Agenda introuvable.');
        }

        return new Response(($this->flux)(), Response::HTTP_OK, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="agenda.ics"',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }
}
