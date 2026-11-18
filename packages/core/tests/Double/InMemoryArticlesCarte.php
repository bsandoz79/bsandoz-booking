<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Carte\Domain\Model\Article;
use Bsandoz\Core\Carte\Domain\Port\Articles;
use Bsandoz\Core\Shared\Domain\NotFound;

final class InMemoryArticlesCarte implements Articles
{
    /** @var array<string, Article> */
    private array $tous = [];

    public function get(string $id): Article
    {
        return $this->tous[$id] ?? throw new NotFound('Article introuvable.');
    }

    public function all(): array
    {
        return array_values($this->tous);
    }

    public function save(Article $article): void
    {
        $this->tous[$article->id()] = $article;
    }

    public function remove(Article $article): void
    {
        unset($this->tous[$article->id()]);
    }
}
