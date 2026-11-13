<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Service;

/** Numéro de mobile au format international, pour l'envoi de SMS (les fixes ne reçoivent pas de SMS). */
final class NumeroMobile
{
    /**
     * « 06 12 34 56 78 », « +33 6 12… », « 0033 7… » → « +33612345678 » ; autre indicatif déjà au format « +… » gardé ;
     * fixe ou numéro invalide → null.
     */
    public static function international(string $saisi): ?string
    {
        $chiffres = preg_replace('/[^\d+]/', '', $saisi) ?? '';
        if (str_starts_with($chiffres, '00')) {
            $chiffres = '+' . substr($chiffres, 2);
        }
        if (preg_match('/^0([67]\d{8})$/', $chiffres, $m)) {
            return '+33' . $m[1];
        }
        if (preg_match('/^\+33([67]\d{8})$/', $chiffres, $m)) {
            return '+33' . $m[1];
        }
        if (preg_match('/^\+(?!33)\d{8,15}$/', $chiffres)) {
            return $chiffres;
        }

        return null;
    }
}
