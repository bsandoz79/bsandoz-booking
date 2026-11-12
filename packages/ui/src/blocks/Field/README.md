# Field

Champ de formulaire : `label`, `hint` (aide), `error` (message d'erreur annoncé, champ `aria-invalid`), `required` (mention « obligatoire », texte réglable par `requiredLabel`), `multiline` pour une zone de texte. Les autres attributs vont au champ.

```tsx
<Field label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={erreurEmail} />
```
