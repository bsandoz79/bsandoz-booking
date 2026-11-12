<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Application;

use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Demande de contact ou de devis envoyée depuis le site (ex. page « Professionnels ») : transmise par mail au pro,
 * avec l'adresse du demandeur en « répondre à ». Le kit ne connaît pas le contenu métier : `details` est une liste
 * libre de questions / réponses (ex. « Type de véhicules » → « Utilitaires »).
 *
 * Données : {"nom", "email", "telephone"?, "entreprise"?, "message", "details"?: {"question": "réponse"}, "site"?}
 * « site » est un champ piège invisible : rempli (robot), la demande est ignorée sans erreur.
 */
final class EnvoyerDemandeContact
{
    private const DETAILS_MAX = 12;

    public function __construct(
        private Notifier $notifier,
        private ?string $proEmail = null,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     * @throws DomainError champ manquant ou invalide, ou réception des demandes non configurée
     */
    public function __invoke(array $data): void
    {
        if (is_string($data['site'] ?? null) && trim($data['site']) !== '') {
            return;
        }
        if ($this->proEmail === null || trim($this->proEmail) === '') {
            throw new DomainError('L\'envoi de demandes par le site n\'est pas encore disponible : merci d\'appeler ou d\'écrire directement.');
        }

        $nom = self::texte($data, 'nom', 120, true);
        $email = self::texte($data, 'email', 180, true);
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new DomainError('Adresse e-mail invalide.');
        }
        $message = self::texte($data, 'message', 3000, true);

        $details = [];
        $brut = $data['details'] ?? [];
        if (!is_array($brut) || count($brut) > self::DETAILS_MAX) {
            throw new DomainError('Détails de la demande invalides.');
        }
        foreach ($brut as $question => $reponse) {
            if (!is_string($reponse)) {
                throw new DomainError('Détails de la demande invalides.');
            }
            $question = mb_substr(trim((string) $question), 0, 80);
            $reponse = mb_substr(trim($reponse), 0, 300);
            if ($question !== '' && $reponse !== '') {
                $details[$question] = $reponse;
            }
        }

        $this->notifier->send(trim($this->proEmail), 'pro_contact_request', [
            'nom' => $nom,
            'email' => $email,
            'telephone' => self::texte($data, 'telephone', 30, false),
            'entreprise' => self::texte($data, 'entreprise', 120, false),
            'message' => $message,
            'details' => $details,
            'replyTo' => $email,
        ]);
    }

    /** @param array<string, mixed> $data */
    private static function texte(array $data, string $cle, int $max, bool $obligatoire): string
    {
        $valeur = $data[$cle] ?? '';
        if (!is_string($valeur)) {
            throw new DomainError(sprintf('« %s » doit être un texte.', $cle));
        }
        $valeur = trim($valeur);
        if ($obligatoire && $valeur === '') {
            throw new DomainError(match ($cle) {
                'nom' => 'Merci d\'indiquer votre nom.',
                'email' => 'Merci d\'indiquer votre adresse e-mail.',
                'message' => 'Merci de décrire votre besoin.',
                default => sprintf('« %s » est obligatoire.', $cle),
            });
        }
        if (mb_strlen($valeur) > $max) {
            throw new DomainError(sprintf('« %s » est limité à %d caractères.', $cle, $max));
        }

        return $valeur;
    }
}
