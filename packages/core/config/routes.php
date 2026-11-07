<?php

declare(strict_types=1);

use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;

/*
 * Routes du kit. Dans l'application : config/routes/bsandoz_core.yaml
 *   bsandoz_core:
 *       resource: '@BsandozCoreBundle/config/routes.php'
 */
return static function (RoutingConfigurator $routes): void {
    $routes->import('../src/Catalog/Infrastructure/Http/', 'attribute');
    // Réservation : calendrier public. BookingController (réserver, gérer) sera importé avec feature/core-booking-reservation.
    $routes->import('../src/Booking/Infrastructure/Http/CreneauxController.php', 'attribute');
};
