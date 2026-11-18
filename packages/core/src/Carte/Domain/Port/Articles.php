<?php

declare(strict_types=1);

namespace Bsandoz\Core\Carte\Domain\Port;

use Bsandoz\Core\Carte\Domain\Model\Article;
use Bsandoz\Core\Shared\Domain\NotFound;

interface Articles
{
    /** @throws NotFound */
    public function get(string $id): Article;

    /** @return list<Article> tous les articles, dans l'ordre */
    public function all(): array;

    public function save(Article $article): void;

    public function remove(Article $article): void;
}
