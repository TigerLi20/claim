export const ITEM_CATEGORIES = [
  { id: "books", label: "Books" }, { id: "electronics", label: "Electronics" },
  { id: "furniture", label: "Furniture" }, { id: "clothing", label: "Clothing" },
  { id: "home", label: "Home" }, { id: "other", label: "Other" },
];
export const formatPrice = price => `$${Number(price).toFixed(2)}`;
