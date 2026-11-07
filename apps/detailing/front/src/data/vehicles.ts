/** Suggestion du type de véhicule à partir du modèle (même logique que DetailingVarianteResolver côté API). */
const MODELS: Record<string, string> = {
  'renault|clio': 'citadine', 'peugeot|208': 'citadine', 'volkswagen|polo': 'citadine', 'toyota|yaris': 'citadine', 'citroen|c3': 'citadine',
  'peugeot|308': 'berline_break', 'renault|megane': 'berline_break', 'volkswagen|golf': 'berline_break', 'skoda|octavia': 'berline_break', 'bmw|serie3': 'berline_break',
  'peugeot|3008': 'suv', 'peugeot|5008': 'suv', 'renault|captur': 'suv', 'dacia|duster': 'suv', 'tesla|modely': 'suv',
  'renault|kangoo': 'utilitaire', 'citroen|berlingo': 'utilitaire', 'ford|transit': 'utilitaire',
};

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function suggestVehicleType(brand: string, model: string): string | undefined {
  return MODELS[`${normalize(brand)}|${normalize(model)}`];
}
