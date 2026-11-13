# SlotPicker

Créneaux d'un jour, issus de `GET /booking/slots`.

```tsx
<SlotPicker title="Mardi 17 novembre" slots={slots} selected={start} onSelect={setStart} />
```

Mise en avant (ex. créneaux qui suivent ou précèdent un rendez-vous déjà prévu) : `highlighted: true` sur le créneau, et `highlightLabel` (pastille, lue par les lecteurs d'écran) ; `highlightHint` ajoute une phrase d'explication sous la grille.

```tsx
<SlotPicker slots={slots} onSelect={setStart} highlightLabel="Conseillé" highlightHint="Conseillé : juste avant ou après un autre rendez-vous." />
```
