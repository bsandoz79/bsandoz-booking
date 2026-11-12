# AddressInput

Champ d'adresse avec autocomplétion (motif ARIA « combobox »). La recherche est fournie par l'application (`search`), par exemple `GET /api/v1/geo/search?q=` du kit back : aucun appel réseau dans le bloc.

```tsx
<AddressInput label="Adresse d'intervention" search={rechercherAdresse} value={adresse} onSelect={setAdresse} error={horsZone ? 'Adresse hors zone' : undefined} />
```

Recherche à partir de `minLength` caractères (3) après `debounceMs` (300 ms) ; les réponses arrivées dans le désordre sont ignorées. Clavier : flèches, Entrée, Échap. Textes réglables : `noResultsLabel`, `loadingLabel`, `placeholder`, `hint`.
