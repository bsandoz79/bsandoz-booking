<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Model;

/** Notification affichée sur l'appareil : titre, texte, page ouverte au clic, étiquette (remplace la précédente de même étiquette). */
final class MessagePush
{
    public function __construct(
        public readonly string $title,
        public readonly string $body,
        public readonly string $url = '/pro',
        public readonly ?string $tag = null,
    ) {
    }

    public function json(): string
    {
        return json_encode(['title' => $this->title, 'body' => $this->body, 'url' => $this->url, 'tag' => $this->tag], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
