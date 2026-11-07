<?php

declare(strict_types=1);

namespace Bsandoz\Core;

use Bsandoz\Core\Shared\Infrastructure\Persistence\DoctrineMappings;
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

    /** @param array{timezone: string, rules: array<string, int|null>, zone?: array<string, float|int>} $config */
    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        $container->parameters()
            ->set('bsandoz_core.timezone', $config['timezone'])
            ->set('bsandoz_core.rules', $config['rules'])
            ->set('bsandoz_core.zone', $config['zone'] ?? null);

        $container->import('../config/services.php');
    }

    public function prependExtension(ContainerConfigurator $container, ContainerBuilder $builder): void
    {
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
