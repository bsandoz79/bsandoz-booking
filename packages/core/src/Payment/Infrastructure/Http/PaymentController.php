<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Infrastructure\Http;

use Bsandoz\Core\Payment\Application\ConfirmerPaiement;
use Bsandoz\Core\Payment\Domain\SignatureInvalide;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Webhook Stripe : POST /api/v1/payment/stripe/webhook (à déclarer dans le tableau de bord Stripe, évènement
 * « checkout.session.completed »). Signature vérifiée avec STRIPE_WEBHOOK_SECRET ; invalide → 400, sinon 200.
 */
final class PaymentController
{
    public function __construct(private ConfirmerPaiement $confirmer)
    {
    }

    #[Route('/api/v1/payment/stripe/webhook', name: 'bsandoz_payment_stripe_webhook', methods: ['POST'])]
    public function stripeWebhook(Request $request): JsonResponse
    {
        try {
            ($this->confirmer)($request->getContent(), (string) $request->headers->get('Stripe-Signature', ''));
        } catch (SignatureInvalide $e) {
            throw new InvalidRequest($e->getMessage());
        }

        return new JsonResponse(['received' => true]);
    }
}
