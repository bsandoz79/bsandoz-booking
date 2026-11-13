/** Stock tel que le client le voit : épuisé, « il en reste N » (5 ou moins), en stock. */
export const etatStock = (stock: number) => (stock === 0 ? 'Épuisé' : stock <= 5 ? `Il en reste ${stock}` : 'En stock');
