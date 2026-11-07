<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Domain;

/** Génère les identifiants des nouvelles entités (UUID en production, suite prévisible dans les tests). */
interface IdGenerator
{
    public function generate(): string;
}
