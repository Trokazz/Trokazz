export const formatPrice = (price: number | string | null) => {
  if (price === null) return "N/A";
  if (typeof price === 'string') return price;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};