<?php

declare(strict_types=1);

use Bsandoz\Core\Admin\Application\GererReglages;
use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Admin\Infrastructure\Persistence\DoctrineSettingRepository;
use Bsandoz\Core\Booking\Infrastructure\Settings\DatabaseSettingsProvider;
use Bsandoz\Core\Auth\Application\ExporterDonnees;
use Bsandoz\Core\Auth\Application\RenouvelerSession;
use Bsandoz\Core\Auth\Application\SeConnecter;
use Bsandoz\Core\Auth\Application\SeDeconnecter;
use Bsandoz\Core\Auth\Application\SupprimerCompte;
use Bsandoz\Core\Auth\Infrastructure\Http\MeController;
use Bsandoz\Core\Auth\Infrastructure\Http\SessionController;
use Bsandoz\Core\Auth\Infrastructure\Security\SecurityUserProvider;
use Bsandoz\Core\Booking\Application\MesReservations;
use Bsandoz\Core\Payment\Application\ConfirmerPaiement;
use Bsandoz\Core\Payment\Application\CreerSessionAcompte;
use Bsandoz\Core\Payment\Application\RembourserAcompte;
use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Payment\Domain\Port\PaymentRepository;
use Bsandoz\Core\Payment\Infrastructure\Http\PaymentController;
use Bsandoz\Core\Payment\Infrastructure\Persistence\DoctrinePaymentRepository;
use Bsandoz\Core\Payment\Infrastructure\StripeGateway;
use Bsandoz\Core\Shared\Infrastructure\Console\CleChiffrementCommand;
use Bsandoz\Core\Shared\Infrastructure\Security\Chiffreur;
use Bsandoz\Core\Auth\Application\ActiverCompte;
use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Auth\Application\DemanderReinitialisation;
use Bsandoz\Core\Auth\Application\ReinitialiserMotDePasse;
use Bsandoz\Core\Auth\Domain\Port\PasswordHasher;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Auth\Domain\Service\PolitiqueMotDePasse;
use Bsandoz\Core\Auth\Infrastructure\Http\AuthController;
use Bsandoz\Core\Auth\Infrastructure\Security\DoctrineTokenService;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Bsandoz\Core\Booking\Application\ReservationParJeton;
use Bsandoz\Core\Booking\Infrastructure\Http\ManageController;
use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Bsandoz\Core\Booking\Application\NotificationsReservation;
use Bsandoz\Core\Admin\Application\GererContenuSite;
use Bsandoz\Core\Fidelite\Application\GererFidelite;
use Bsandoz\Core\Fidelite\Domain\Port\CartesFidelite;
use Bsandoz\Core\Fidelite\Infrastructure\Http\FideliteController;
use Bsandoz\Core\Fidelite\Infrastructure\Persistence\DoctrineCartesFidelite;
use Bsandoz\Core\Admin\Application\GererMedias;
use Bsandoz\Core\Admin\Domain\Port\StockageMedias;
use Bsandoz\Core\Admin\Infrastructure\Http\SiteController;
use Bsandoz\Core\Admin\Infrastructure\Medias\DossierMedias;
use Bsandoz\Core\Notification\Application\EnvoyerRappels;
use Bsandoz\Core\Notification\Application\GererAbonnementsPush;
use Bsandoz\Core\Notification\Application\NotifierProParPush;
use Bsandoz\Core\Notification\Domain\Port\AbonnementsPush;
use Bsandoz\Core\Notification\Domain\Port\EnvoiPush;
use Bsandoz\Core\Notification\Infrastructure\Console\ClesPushCommand;
use Bsandoz\Core\Notification\Infrastructure\Http\PushController;
use Bsandoz\Core\Notification\Infrastructure\Persistence\DoctrineAbonnementsPush;
use Bsandoz\Core\Notification\Infrastructure\Push\WebPushEnvoi;
use Bsandoz\Core\Notification\Application\FluxAgendaPro;
use Bsandoz\Core\Notification\Infrastructure\Http\AgendaController;
use Bsandoz\Core\Notification\Domain\Port\JournalNotifications;
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
use Bsandoz\Core\Notification\Infrastructure\Console\SendNotificationsCommand;
use Bsandoz\Core\Notification\Infrastructure\Persistence\DoctrineJournalNotifications;
use Bsandoz\Core\Notification\Infrastructure\LogNotifier;
use Bsandoz\Core\Notification\Infrastructure\Mailer\SymfonyMailerNotifier;
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
use Bsandoz\Core\Booking\Infrastructure\Http\ZoneController;
use Bsandoz\Core\Admin\Application\TableauDeBord;
use Bsandoz\Core\Admin\Infrastructure\Http\AdminController;
use Bsandoz\Core\Booking\Infrastructure\Http\AdminAgendaController;
use Bsandoz\Core\Catalog\Infrastructure\Http\AdminCatalogueController;
use Bsandoz\Core\Auth\Application\CreerComptePro;
use Bsandoz\Core\Auth\Infrastructure\Console\CreerCompteProCommand;
use Bsandoz\Core\Booking\Application\GererDisponibilites;
use Bsandoz\Core\Booking\Application\GererRendezVousPro;
use Bsandoz\Core\Booking\Application\ListerCreneaux;
use Bsandoz\Core\Booking\Application\ListerJoursDisponibles;
use Bsandoz\Core\Booking\Application\Occupations;
use Bsandoz\Core\Booking\Application\EstimerDeplacement;
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
use Bsandoz\Core\Catalog\Application\GererCatalogue;
use Bsandoz\Core\Catalog\Application\ListerCatalogue;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Catalog\Domain\Port\ProduitRepository;
use Bsandoz\Core\Catalog\Application\StockProduits;
use Bsandoz\Core\Catalog\Infrastructure\Persistence\DoctrineProduitRepository;
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
use function Symfony\Component\DependencyInjection\Loader\Configurator\service;

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
    $services->set(Chiffreur::class)->public()->args([param('bsandoz_core.encryption_key')]);
    $services->set(CleChiffrementCommand::class);

    // Notification : mails Twig envoyés par Symfony Mailer (LogNotifier reste disponible pour écrire les mails dans le journal)
    $services->set(LogNotifier::class);
    $services->set(SymfonyMailerNotifier::class)->args([
        service('mailer'),
        param('bsandoz_core.mail.from_email'),
        param('bsandoz_core.mail.from_name'),
        param('bsandoz_core.mail.brand'),
        param('bsandoz_core.mail.front_url'),
        param('bsandoz_core.timezone'),
        '%kernel.project_dir%/templates/bsandoz/emails',
        service('logger')->nullOnInvalid(),
    ]);
    $services->alias(Notifier::class, SymfonyMailerNotifier::class);
    $services->set(IcsGenerator::class);
    $services->set(DoctrineJournalNotifications::class);
    $services->alias(JournalNotifications::class, DoctrineJournalNotifications::class);
    $services->set(EnvoyerRappels::class);
    $services->set(FluxAgendaPro::class)->arg('$brand', param('bsandoz_core.mail.brand'));
    $services->set(AgendaController::class)->public()->tag('controller.service_arguments')
        ->arg('$secret', param('bsandoz_core.ical_secret'));
    $services->set(SendNotificationsCommand::class);
    $services->set(NotificationsReservation::class)
        ->arg('$brand', param('bsandoz_core.mail.brand'))
        ->arg('$proEmail', param('bsandoz_core.mail.pro_email'))
        ->arg('$push', service(NotifierProParPush::class))
        ->arg('$timezone', param('bsandoz_core.timezone'));
    $services->set(WebPushEnvoi::class)->args([
        param('bsandoz_core.push.vapid_public_key'),
        param('bsandoz_core.push.vapid_private_key'),
        param('bsandoz_core.push.subject'),
        service('logger')->nullOnInvalid(),
    ]);
    $services->alias(EnvoiPush::class, WebPushEnvoi::class);
    $services->set(DoctrineAbonnementsPush::class);
    $services->alias(AbonnementsPush::class, DoctrineAbonnementsPush::class);
    $services->set(GererAbonnementsPush::class);
    $services->set(NotifierProParPush::class);
    $services->set(PushController::class)->public()->tag('controller.service_arguments');
    $services->set(ClesPushCommand::class);

    // Auth (comptes et liens envoyés par mail)
    $services->set(DoctrineUserRepository::class);
    $services->alias(UserRepository::class, DoctrineUserRepository::class);
    $services->set(DoctrineTokenService::class);
    $services->alias(TokenService::class, DoctrineTokenService::class);
    $services->set(NativePasswordHasherAdapter::class);
    $services->alias(PasswordHasher::class, NativePasswordHasherAdapter::class);
    $services->set(PolitiqueMotDePasse::class);
    $services->set(CreerCompteDepuisReservation::class);
    $services->set(ActiverCompte::class);
    $services->set(DemanderReinitialisation::class);
    $services->set(ReinitialiserMotDePasse::class);
    $services->set(SeConnecter::class);
    $services->set(RenouvelerSession::class);
    $services->set(SeDeconnecter::class);
    $services->set(ExporterDonnees::class);
    $services->set(SupprimerCompte::class);
    $services->set(MesReservations::class);
    $services->set(SecurityUserProvider::class);
    $services->set(SessionController::class)->public()->tag('controller.service_arguments')
        ->arg('$loginLimiter', service('limiter.bsandoz_login'))
        ->arg('$accessTokenTtl', param('lexik_jwt_authentication.token_ttl'));
    $services->set(MeController::class)->public()->tag('controller.service_arguments');
    $services->set(AuthController::class)->public()->tag('controller.service_arguments')
        ->arg('$activationLimiter', service('limiter.bsandoz_activation'))
        ->arg('$forgotLimiter', service('limiter.bsandoz_forgot'));
    $services->set(ProblemJsonListener::class)
        ->tag('kernel.event_listener', ['event' => 'kernel.exception', 'priority' => 10]);

    // Booking (réglages et zone)
    $services->set(ZoneCalculator::class);
    $services->set(ConfiguredSettingsProvider::class)
        ->args([param('bsandoz_core.rules'), param('bsandoz_core.zone'), param('bsandoz_core.timezone')]);
    // Réglages du pro en base (table setting), repli sur la configuration
    $services->set(DoctrineSettingRepository::class);
    $services->alias(SettingRepository::class, DoctrineSettingRepository::class);
    $services->set(DatabaseSettingsProvider::class);
    $services->alias(SettingsProvider::class, DatabaseSettingsProvider::class);
    $services->set(GererReglages::class);

    // Booking (créneaux)
    $services->set(CreneauCalculator::class);
    $services->set(DoctrineReservationRepository::class);
    $services->alias(ReservationRepository::class, DoctrineReservationRepository::class);
    $services->set(DoctrineAvailabilityRepository::class);
    $services->alias(AvailabilityRepository::class, DoctrineAvailabilityRepository::class);
    $services->set(Trajet::class);
    $services->set(EstimerDeplacement::class);
    $services->set(Occupations::class);
    $services->set(ListerCreneaux::class);
    $services->set(ListerJoursDisponibles::class);
    $services->set(GererDisponibilites::class);
    $services->set(GererRendezVousPro::class);
    $services->set(TableauDeBord::class);
    $services->set(CreerComptePro::class);
    $services->set(CreerCompteProCommand::class);
    $services->set(AdminController::class)->public()->tag('controller.service_arguments');
    // Contenu modifiable du site et photos (dossier servi par le serveur web)
    $services->set(GererContenuSite::class);
    $services->set(DossierMedias::class)->args([param('bsandoz_core.medias_dir')]);
    $services->alias(StockageMedias::class, DossierMedias::class);
    $services->set(GererMedias::class);
    $services->set(SiteController::class)->public()->tag('controller.service_arguments');

    // Fidélité (tampons, remise sur la réservation suivante)
    $services->set(DoctrineCartesFidelite::class);
    $services->alias(CartesFidelite::class, DoctrineCartesFidelite::class);
    $services->set(GererFidelite::class)
        ->arg('$actifParDefaut', param('bsandoz_core.fidelite.actif'))
        ->arg('$tamponsRequisParDefaut', param('bsandoz_core.fidelite.tampons_requis'))
        ->arg('$remisePercentParDefaut', param('bsandoz_core.fidelite.remise_percent'));
    $services->set(FideliteController::class)->public()->tag('controller.service_arguments');
    $services->set(AdminCatalogueController::class)->public()->tag('controller.service_arguments');
    $services->set(AdminAgendaController::class)->public()->tag('controller.service_arguments');
    $services->set(CreneauxController::class)->public()->tag('controller.service_arguments');

    // Booking (réservations)
    $services->set(ReserverCreneau::class);
    $services->set(AnnulerReservation::class);
    $services->set(DeplacerReservation::class);
    $services->set(ExpirerReservationsNonPayees::class);
    $services->set(ReservationParJeton::class);
    // Payment : acompte Stripe Checkout
    $services->set(StripeGateway::class)->args([param('bsandoz_core.payment.stripe_secret_key'), param('bsandoz_core.payment.stripe_webhook_secret')]);
    $services->alias(PaymentGateway::class, StripeGateway::class);
    $services->set(DoctrinePaymentRepository::class);
    $services->alias(PaymentRepository::class, DoctrinePaymentRepository::class);
    $services->set(CreerSessionAcompte::class)
        ->arg('$successUrl', param('bsandoz_core.payment.success_url'))
        ->arg('$cancelUrl', param('bsandoz_core.payment.cancel_url'));
    $services->set(ConfirmerPaiement::class);
    $services->set(\Bsandoz\Core\Payment\Application\ReprendrePaiement::class);
    $services->set(RembourserAcompte::class);
    $services->set(PaymentController::class)->public()->tag('controller.service_arguments');

    $services->set(BookingController::class)->public()->tag('controller.service_arguments')
        ->arg('$reservationLimiter', service('limiter.bsandoz_reservation'));
    $services->set(ManageController::class)->public()->tag('controller.service_arguments')
        ->arg('$manageLimiter', service('limiter.bsandoz_manage'));

    // Booking (adresses) : Base Adresse Nationale, gratuite
    $services->set(ApiAdresseGeocoder::class);
    $services->alias(Geocoder::class, ApiAdresseGeocoder::class);
    $services->set(RechercherAdresse::class);
    $services->set(GeoController::class)->public()->tag('controller.service_arguments');
    $services->set(ZoneController::class)->public()->tag('controller.service_arguments');
    $services->set(ExpirerReservationsCommand::class);

    // Catalog
    $services->set(PrixCalculator::class);
    $services->set(SansVarianteResolver::class);
    $services->alias(VarianteResolver::class, SansVarianteResolver::class);
    $services->set(DoctrinePrestationRepository::class);
    $services->alias(PrestationRepository::class, DoctrinePrestationRepository::class);
    $services->set(DoctrineOptionRepository::class);
    $services->alias(OptionRepository::class, DoctrineOptionRepository::class);
    $services->set(DoctrineProduitRepository::class);
    $services->alias(ProduitRepository::class, DoctrineProduitRepository::class);
    $services->set(StockProduits::class);
    $services->set(ListerCatalogue::class);
    $services->set(CalculerDevis::class);
    $services->set(GererCatalogue::class);
    $services->set(CatalogController::class)->public()->tag('controller.service_arguments');
};
