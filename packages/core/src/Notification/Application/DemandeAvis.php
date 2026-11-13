<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Application;

use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Demande d'avis (ex. fiche Google) : lien vers la page d'avis, ajouté au mail envoyé au client une fois la prestation
 * faite (mail de facture). Désactivée tant que le pro n'a pas saisi de lien.
 */
final class DemandeAvis
{
    public const CLE = 'avis';
    private const LONGUEUR_MAX = 500;

    public function __construct(private SettingRepository $settings)
    {
    }

    /** @return array{actif: bool, lien: string} */
    public function reglage(): array
    {
        $r = $this->settings->get(self::CLE) ?? [];
        $lien = is_string($r['lien'] ?? null) ? $r['lien'] : '';

        return ['actif' => ($r['actif'] ?? true) === true && $lien !== '', 'lien' => $lien];
    }

    /**
     * @param array<string, mixed> $data {actif, lien}
     * @return array{actif: bool, lien: string}
     * @throws DomainError lien invalide
     */
    public function changer(array $data): array
    {
        $lien = $data['lien'] ?? '';
        if (!is_string($lien)) {
            throw new DomainError('« lien » doit être une adresse web.');
        }
        $lien = trim($lien);
        if ($lien !== '' && (mb_strlen($lien) > self::LONGUEUR_MAX || !preg_match('#^https://[^\s<>"]+$#', $lien))) {
            throw new DomainError('Le lien d\'avis doit être une adresse https:// complète (500 caractères au plus).');
        }
        $this->settings->save(self::CLE, ['actif' => ($data['actif'] ?? true) === true, 'lien' => $lien]);

        return $this->reglage();
    }

    /** Lien à mettre dans le mail, ou null si la demande d'avis est désactivée. */
    public function lien(): ?string
    {
        $r = $this->reglage();

        return $r['actif'] ? $r['lien'] : null;
    }
}
