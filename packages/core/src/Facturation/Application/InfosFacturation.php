<?php

declare(strict_types=1);

namespace Bsandoz\Core\Facturation\Application;

use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Informations du vendeur imprimées sur les factures, réglées dans l'espace pro (« [à compléter] » tant qu'elles ne
 * sont pas saisies) : nom ou raison sociale, adresse, SIRET, mention de TVA, e-mail et téléphone.
 */
final class InfosFacturation
{
    public const CLE = 'facturation';
    public const A_COMPLETER = '[à compléter]';
    private const CHAMPS = ['nom' => 120, 'adresse' => 240, 'siret' => 20, 'mentionTva' => 160, 'email' => 180, 'telephone' => 30];

    public function __construct(private SettingRepository $settings)
    {
    }

    /** @return array<string, string> */
    public function vendeur(): array
    {
        $enregistre = $this->settings->get(self::CLE) ?? [];
        $vendeur = [];
        foreach (array_keys(self::CHAMPS) as $champ) {
            $valeur = $enregistre[$champ] ?? null;
            $vendeur[$champ] = is_string($valeur) && trim($valeur) !== '' ? $valeur : ($champ === 'mentionTva' ? 'TVA non applicable, art. 293 B du CGI' : self::A_COMPLETER);
        }

        return $vendeur;
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, string>
     * @throws DomainError champ trop long ou SIRET invalide
     */
    public function changer(array $data): array
    {
        $valeurs = [];
        foreach (self::CHAMPS as $champ => $max) {
            $valeur = $data[$champ] ?? '';
            if (!is_string($valeur) || mb_strlen(trim($valeur)) > $max) {
                throw new DomainError(sprintf('« %s » : texte de %d caractères au plus.', $champ, $max));
            }
            $valeurs[$champ] = trim($valeur);
        }
        $siret = preg_replace('/[\s.]/', '', $valeurs['siret']) ?? '';
        if ($siret !== '' && !preg_match('/^(\d{14}|\d{10})$/', $siret)) {
            throw new DomainError('SIRET : 14 chiffres (ou 10 pour un numéro d\'entreprise belge).');
        }
        $valeurs['siret'] = $siret;
        $this->settings->save(self::CLE, $valeurs);

        return $this->vendeur();
    }
}
