<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Domain;

/** Identifiants refusés ou session expirée (traduit en 401 par l'API). */
final class NonAuthentifie extends DomainError
{
}
