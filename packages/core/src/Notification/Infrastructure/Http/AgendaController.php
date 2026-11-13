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
 * GET /api/v1/admin/agenda (pro) → {"url": "https://…/agenda.ics" | null} : adresse à ajouter dans Google Agenda, Apple
 * Calendrier ou Outlook (null tant que le secret n'est pas configuré sur le serveur).
 */
final class AgendaController
{
    public function __construct(
        private FluxAgendaPro $flux,
        private ?string $secret,
    ) {
    }

    #[Route('/api/v1/admin/agenda', name: 'bsandoz_admin_agenda', methods: ['GET'])]
    #[\Symfony\Component\Security\Http\Attribute\IsGranted('ROLE_PRO')]
    public function adresse(\Symfony\Component\Routing\Generator\UrlGeneratorInterface $urls): \Symfony\Component\HttpFoundation\JsonResponse
    {
        $actif = $this->secret !== null && strlen($this->secret) >= 32;

        return new \Symfony\Component\HttpFoundation\JsonResponse([
            'url' => $actif ? $urls->generate('bsandoz_ical_feed', ['secret' => $this->secret], \Symfony\Component\Routing\Generator\UrlGeneratorInterface::ABSOLUTE_URL) : null,
        ]);
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
