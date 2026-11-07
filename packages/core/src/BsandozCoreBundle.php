<?php

declare(strict_types=1);

namespace Bsandoz\Core;

use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

/**
 * Point d'entrée du kit. Enregistre les services, routes et mappings Doctrine des modules.
 *
 * @todo Charger config/services.php, config/routes.php et les mappings XML de chaque module.
 */
final class BsandozCoreBundle extends AbstractBundle
{
}
