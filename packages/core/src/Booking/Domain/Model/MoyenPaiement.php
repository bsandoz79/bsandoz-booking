<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

/** Moyen de paiement du reste à régler sur place, noté par le pro à l'encaissement. */
enum MoyenPaiement: string
{
    /** Carte bancaire sur le terminal du pro (TPE). */
    case Carte = 'carte';
    case Especes = 'especes';
    case Virement = 'virement';
    case Cheque = 'cheque';
    /** Carte bancaire sur le téléphone du client, après avoir scanné le QR code (paiement en ligne). */
    case QrCode = 'qr';

    /** Libellé pour la facture : « réglés sur place par … ». */
    public function libelle(): string
    {
        return match ($this) {
            self::Carte => 'carte bancaire',
            self::Especes => 'espèces',
            self::Virement => 'virement',
            self::Cheque => 'chèque',
            self::QrCode => 'carte bancaire (QR code)',
        };
    }
}
