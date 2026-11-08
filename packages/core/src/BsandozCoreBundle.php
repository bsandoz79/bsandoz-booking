<?php

declare(strict_types=1);

namespace Bsandoz\Core;

use Bsandoz\Core\Shared\Infrastructure\Persistence\ChiffreType;
use Bsandoz\Core\Shared\Infrastructure\Persistence\DoctrineMappings;
use Bsandoz\Core\Shared\Infrastructure\Security\Chiffreur;
use Symfony\Component\Config\Definition\Builder\ArrayNodeDefinition;
use Symfony\Component\Config\Definition\Configurator\DefinitionConfigurator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

/**
 * Point d'entrée du kit : configuration « bsandoz_core », services (config/services.php),
 * mappings XML et types Doctrine des modules. Routes : config/routes.php, importé par l'application.
 */
final class BsandozCoreBundle extends AbstractBundle
{
    protected string $extensionAlias = 'bsandoz_core';

    public function configure(DefinitionConfigurator $definition): void
    {
        /** @var ArrayNodeDefinition $root */
        $root = $definition->rootNode();
        $root
            ->children()
                ->scalarNode('timezone')->defaultValue('Europe/Paris')->cannotBeEmpty()->end()
                ->scalarNode('encryption_key')
                    ->info('Clé de chiffrement de l\'adresse et du téléphone (64 caractères hexadécimaux), propre au client.')
                    ->defaultValue('%env(default::BSANDOZ_ENCRYPTION_KEY)%')
                ->end()
                ->arrayNode('mail')
                    ->info('Mails envoyés aux clients et au pro (modèles Twig du kit, surchargeables dans templates/bsandoz/emails/).')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->scalarNode('from_email')->defaultValue('no-reply@localhost')->end()
                        ->scalarNode('from_name')->defaultValue('Réservation')->end()
                        ->scalarNode('brand')->defaultValue('Réservation')->info('Nom affiché dans les mails et les agendas.')->end()
                        ->scalarNode('front_url')->defaultValue('%env(default::FRONT_URL)%')->info('Adresse du site, pour les liens des mails.')->end()
                        ->scalarNode('pro_email')->defaultNull()->info('Adresse du pro, prévenu à chaque rendez-vous confirmé, déplacé ou annulé.')->end()
                    ->end()
                ->end()
                ->arrayNode('payment')
                    ->info('Acompte en ligne (Stripe Checkout). URL de retour vers le site : marqueur {reservationId} accepté.')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->scalarNode('stripe_secret_key')->defaultValue('%env(default::STRIPE_SECRET_KEY)%')->end()
                        ->scalarNode('stripe_webhook_secret')->defaultValue('%env(default::STRIPE_WEBHOOK_SECRET)%')->end()
                        ->scalarNode('success_url')->defaultValue('/')->end()
                        ->scalarNode('cancel_url')->defaultValue('/')->end()
                    ->end()
                ->end()
                ->arrayNode('rules')
                    ->info('Règles de réservation (modifiables dans l\'espace pro à partir de feature/core-admin).')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->integerNode('min_notice_hours')->defaultValue(24)->min(0)->end()
                        ->integerNode('horizon_days')->defaultValue(60)->min(1)->end()
                        ->integerNode('buffer_min')->defaultValue(15)->min(0)->end()
                        ->integerNode('slot_step_min')->defaultValue(30)->min(5)->end()
                        ->integerNode('free_cancel_hours')->defaultValue(48)->min(0)->end()
                        ->integerNode('deposit_percent')->defaultValue(30)->min(0)->max(100)->end()
                        ->integerNode('deposit_fixed_cents')->defaultNull()->min(0)->end()
                        ->integerNode('hold_minutes')->defaultValue(10)->min(1)->end()
                    ->end()
                ->end()
                ->arrayNode('zone')
                    ->info('Zone d\'intervention à domicile depuis le point de départ du pro. Absente : activité sur place (ni trajet ni frais).')
                    ->children()
                        ->floatNode('origin_lat')->isRequired()->min(-90)->max(90)->end()
                        ->floatNode('origin_lng')->isRequired()->min(-180)->max(180)->end()
                        ->floatNode('free_radius_km')->defaultValue(0.0)->min(0)->end()
                        ->integerNode('price_per_km_cents')->defaultValue(0)->min(0)->end()
                        ->floatNode('max_distance_km')->isRequired()->min(0)->end()
                        ->floatNode('road_factor')->defaultValue(1.3)->min(1)->end()
                        ->floatNode('average_speed_kmh')->defaultValue(50.0)->min(1)->end()
                    ->end()
                ->end()
            ->end();
    }

    /** @param array{timezone: string, encryption_key: string|null, mail: array{from_email: string, from_name: string, brand: string, front_url: string|null, pro_email: string|null}, payment: array{stripe_secret_key: string|null, stripe_webhook_secret: string|null, success_url: string, cancel_url: string}, rules: array<string, int|null>, zone?: array<string, float|int>} $config */
    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        $container->parameters()
            ->set('bsandoz_core.timezone', $config['timezone'])
            ->set('bsandoz_core.mail.from_email', $config['mail']['from_email'])
            ->set('bsandoz_core.mail.from_name', $config['mail']['from_name'])
            ->set('bsandoz_core.mail.brand', $config['mail']['brand'])
            ->set('bsandoz_core.mail.front_url', $config['mail']['front_url'] ?? '')
            ->set('bsandoz_core.mail.pro_email', $config['mail']['pro_email'])
            ->set('bsandoz_core.payment.stripe_secret_key', $config['payment']['stripe_secret_key'])
            ->set('bsandoz_core.payment.stripe_webhook_secret', $config['payment']['stripe_webhook_secret'])
            ->set('bsandoz_core.payment.success_url', $config['payment']['success_url'])
            ->set('bsandoz_core.payment.cancel_url', $config['payment']['cancel_url'])
            ->set('bsandoz_core.encryption_key', $config['encryption_key'])
            ->set('bsandoz_core.rules', $config['rules'])
            ->set('bsandoz_core.zone', $config['zone'] ?? null);

        $container->import('../config/services.php');
    }

    /** Fournit le chiffreur au type Doctrine « bsandoz_chiffre » (les types Doctrine ne passent pas par le conteneur). */
    public function boot(): void
    {
        $chiffreur = $this->container?->get(Chiffreur::class);
        if ($chiffreur instanceof Chiffreur) {
            ChiffreType::utiliser($chiffreur);
        }
    }

    /** Limites de tentatives par adresse IP (fenêtre glissante d'une heure). */
    public const RATE_LIMITS = [
        'bsandoz_reservation' => 10,
        'bsandoz_login' => 10,
        'bsandoz_activation' => 10,
        'bsandoz_forgot' => 5,
        'bsandoz_manage' => 30,
    ];

    public function prependExtension(ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        $limiters = [];
        foreach (self::RATE_LIMITS as $name => $limit) {
            $limiters[$name] = ['policy' => 'sliding_window', 'limit' => $limit, 'interval' => '1 hour'];
        }
        $container->extension('framework', ['rate_limiter' => $limiters]);

        if (!$builder->hasExtension('doctrine')) {
            return;
        }

        $mappings = [];
        foreach (DoctrineMappings::mappings() as $name => $mapping) {
            $mappings[$name] = ['type' => 'xml', 'dir' => $mapping['dir'], 'prefix' => $mapping['prefix'], 'is_bundle' => false];
        }

        $container->extension('doctrine', [
            'dbal' => ['types' => DoctrineMappings::types()],
            'orm' => ['mappings' => $mappings],
        ]);
    }
}
