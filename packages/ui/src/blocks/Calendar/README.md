# Calendar

Calendrier mensuel réutilisable (semaine commençant le lundi).

```tsx
<Calendar month="2026-11" availableDays={['2026-11-17']} selected={day} onSelect={setDay} onMonthChange={setMonth} />
```
Les jours disponibles viennent de l'API (`GET /booking/days`). Thème via les variables `--bs-*`.
