export const ITEM_CATEGORIES = [
  { id: "books", label: "Books" }, { id: "electronics", label: "Electronics" },
  { id: "furniture", label: "Furniture" }, { id: "clothing", label: "Clothing" },
  { id: "home", label: "Home" }, { id: "art", label: "Art & Unique Finds" },
  { id: "other", label: "Other" },
];
export const categoryLabel = category => ITEM_CATEGORIES.find(entry => entry.id === category)?.label || category;
export const formatPrice = price => `$${Number(price).toFixed(2)}`;
