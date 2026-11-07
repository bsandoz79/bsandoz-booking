<?php

declare(strict_types=1);

use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Catalog\Application\CalculerDevis;
use Bsandoz\Core\Catalog\Application\ListerCatalogue;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Catalog\Domain\Port\VarianteResolver;
use Bsandoz\Core\Catalog\Domain\Service\PrixCalculator;
use Bsandoz\Core\Catalog\Infrastructure\Http\CatalogController;
use Bsandoz\Core\Catalog\Infrastructure\Persistence\DoctrineOptionRepository;
use Bsandoz\Core\Catalog\Infrastructure\Persistence\DoctrinePrestationRepository;
use Bsandoz\Core\Catalog\Infrastructure\Variante\SansVarianteResolver;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Infrastructure\Http\ProblemJsonListener;
use Bsandoz\Core\Shared\Infrastructure\SystemClock;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

use function Symfony\Component\DependencyInjection\Loader\Configurator\param;

/*
 * Services du kit, déclarés un par un au fil des modules implémentés.
 * Les ports (interfaces) pointent vers un adaptateur par défaut ; l'application peut les redéfinir.
 */
return static function (ContainerConfigurator $container): void {
    $services = $container->services()->defaults()->autowire()->autoconfigure();

    // Shared
    $services->set(SystemClock::class);
    $services->alias(Clock::class, SystemClock::class);
    $services->set(ProblemJsonListener::class)
        ->tag('kernel.event_listener', ['event' => 'kernel.exception', 'priority' => 10]);

    // Booking (réglages et zone)
    $services->set(ZoneCalculator::class);
    $services->set(ConfiguredSettingsProvider::class)
        ->args([param('bsandoz_core.rules'), param('bsandoz_core.zone'), param('bsandoz_core.timezone')]);
    $services->alias(SettingsProvider::class, ConfiguredSettingsProvider::class);

    // Catalog
    $services->set(PrixCalculator::class);
    $services->set(SansVarianteResolver::class);
    $services->alias(VarianteResolver::class, SansVarianteResolver::class);
    $services->set(DoctrinePrestationRepository::class);
    $services->alias(PrestationRepository::class, DoctrinePrestationRepository::class);
    $services->set(DoctrineOptionRepository::class);
    $services->alias(OptionRepository::class, DoctrineOptionRepository::class);
    $services->set(ListerCatalogue::class);
    $services->set(CalculerDevis::class);
    $services->set(CatalogController::class)->public()->tag('controller.service_arguments');
};
