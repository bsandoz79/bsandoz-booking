<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Domain;

/** L'état a changé entre-temps (ex. créneau repris par un autre client) : l'utilisateur doit refaire un choix (HTTP 409). */
class Conflit extends DomainError
{
}
