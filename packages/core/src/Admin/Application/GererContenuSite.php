<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Application;

use Bsandoz\Core\Admin\Domain\Model\Setting;
use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Contenu éditorial du site (textes, coordonnées, FAQ, avis, photos…) modifié par le pro dans son espace.
 * Le kit ne connaît pas sa forme (chaque site définit la sienne) : il garde un objet JSON de textes, nombres et listes,
 * borné en taille et en profondeur. Le site l'affiche comme du texte (jamais comme du HTML).
 */
final class GererContenuSite
{
    public const TAILLE_MAX = 200_000;
    public const TEXTE_MAX = 5_000;
    private const PROFONDEUR_MAX = 6;

    public function __construct(private SettingRepository $settings)
    {
    }

    /** @return array<string, mixed> contenu enregistré ({} si le pro n'a encore rien modifié) */
    public function lire(): array
    {
        return $this->settings->get(Setting::CONTENU) ?? [];
    }

    /**
     * Remplace tout le contenu.
     *
     * @param array<mixed> $contenu
     * @return array<string, mixed>
     * @throws DomainError contenu trop volumineux, trop imbriqué ou d'un type non pris en charge
     */
    public function enregistrer(array $contenu): array
    {
        if ($contenu !== [] && array_is_list($contenu)) {
            throw new DomainError('Le contenu du site doit être un objet {"rubrique": …}.');
        }
        $propre = self::nettoyer($contenu, 1);
        if (strlen(json_encode($propre, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)) > self::TAILLE_MAX) {
            throw new DomainError(sprintf('Le contenu du site dépasse %d Ko.', intdiv(self::TAILLE_MAX, 1000)));
        }
        /** @var array<string, mixed> $propre */
        $this->settings->save(Setting::CONTENU, $propre);

        return $propre;
    }

    /**
     * @param array<mixed> $valeur
     * @return array<mixed>
     */
    private static function nettoyer(array $valeur, int $profondeur): array
    {
        if ($profondeur > self::PROFONDEUR_MAX) {
            throw new DomainError('Le contenu du site est trop imbriqué.');
        }
        $resultat = [];
        foreach ($valeur as $cle => $element) {
            if (is_string($cle) && preg_match('/^[A-Za-z][A-Za-z0-9_]{0,59}$/', $cle) !== 1) {
                throw new DomainError(sprintf('Nom de rubrique invalide : « %s ».', mb_substr($cle, 0, 60)));
            }
            $resultat[$cle] = match (true) {
                is_array($element) => self::nettoyer($element, $profondeur + 1),
                is_string($element) => self::texte($element),
                is_int($element), is_float($element), is_bool($element), $element === null => $element,
                default => throw new DomainError('Type de valeur non pris en charge dans le contenu du site.'),
            };
        }

        return $resultat;
    }

    private static function texte(string $texte): string
    {
        $texte = trim(str_replace("\r\n", "\n", $texte));
        if (mb_strlen($texte) > self::TEXTE_MAX) {
            throw new DomainError(sprintf('Un texte du site dépasse %d caractères.', self::TEXTE_MAX));
        }

        return $texte;
    }
}
