<?php

declare(strict_types=1);

use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Auth\Infrastructure\Persistence\DoctrineUserRepository;
use Bsandoz\Core\Booking\Application\AnnulerReservation;
use Bsandoz\Core\Booking\Application\DeplacerReservation;
use Bsandoz\Core\Booking\Application\ExpirerReservationsNonPayees;
use Bsandoz\Core\Booking\Application\ReserverCreneau;
use Bsandoz\Core\Booking\Infrastructure\Console\ExpirerReservationsCommand;
use Bsandoz\Core\Booking\Infrastructure\Http\BookingController;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Infrastructure\UuidGenerator;
use Bsandoz\Core\Booking\Application\RechercherAdresse;
use Bsandoz\Core\Booking\Domain\Port\Geocoder;
use Bsandoz\Core\Booking\Infrastructure\Geo\ApiAdresseGeocoder;
use Bsandoz\Core\Booking\Infrastructure\Http\GeoController;
use Bsandoz\Core\Booking\Application\ListerCreneaux;
use Bsandoz\Core\Booking\Application\ListerJoursDisponibles;
use Bsandoz\Core\Booking\Application\Occupations;
use Bsandoz\Core\Booking\Application\Trajet;
use Bsandoz\Core\Booking\Domain\Port\AvailabilityRepository;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Booking\Domain\Service\CreneauCalculator;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Booking\Infrastructure\Http\CreneauxController;
use Bsandoz\Core\Booking\Infrastructure\Persistence\DoctrineAvailabilityRepository;
use Bsandoz\Core\Booking\Infrastructure\Persistence\DoctrineReservationRepository;
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
    $services->set(UuidGenerator::class);
    $services->alias(IdGenerator::class, UuidGenerator::class);

    // Auth (compte créé à la réservation)
    $services->set(DoctrineUserRepository::class);
    $services->alias(UserRepository::class, DoctrineUserRepository::class);
    $services->set(CreerCompteDepuisReservation::class);
    $services->set(ProblemJsonListener::class)
        ->tag('kernel.event_listener', ['event' => 'kernel.exception', 'priority' => 10]);

    // Booking (réglages et zone)
    $services->set(ZoneCalculator::class);
    $services->set(ConfiguredSettingsProvider::class)
        ->args([param('bsandoz_core.rules'), param('bsandoz_core.zone'), param('bsandoz_core.timezone')]);
    $services->alias(SettingsProvider::class, ConfiguredSettingsProvider::class);

    // Booking (créneaux)
    $services->set(CreneauCalculator::class);
    $services->set(DoctrineReservationRepository::class);
    $services->alias(ReservationRepository::class, DoctrineReservationRepository::class);
    $services->set(DoctrineAvailabilityRepository::class);
    $services->alias(AvailabilityRepository::class, DoctrineAvailabilityRepository::class);
    $services->set(Trajet::class);
    $services->set(Occupations::class);
    $services->set(ListerCreneaux::class);
    $services->set(ListerJoursDisponibles::class);
    $services->set(CreneauxController::class)->public()->tag('controller.service_arguments');

    // Booking (réservations)
    $services->set(ReserverCreneau::class);
    $services->set(AnnulerReservation::class);
    $services->set(DeplacerReservation::class);
    $services->set(ExpirerReservationsNonPayees::class);
    $services->set(BookingController::class)->public()->tag('controller.service_arguments');

    // Booking (adresses) : Base Adresse Nationale, gratuite
    $services->set(ApiAdresseGeocoder::class);
    $services->alias(Geocoder::class, ApiAdresseGeocoder::class);
    $services->set(RechercherAdresse::class);
    $services->set(GeoController::class)->public()->tag('controller.service_arguments');
    $services->set(ExpirerReservationsCommand::class);

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
