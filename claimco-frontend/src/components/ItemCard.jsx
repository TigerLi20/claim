import { Link } from "react-router-dom";
import { formatPrice } from "../itemCategories";
export default function ItemCard({ item }) {
  return <Link className="item-card" to={`/items/${item.id}`}>
    {item.images?.[0] ? <img className="item-card-image" src={item.images[0]} alt={item.title} /> : <div className="item-card-image item-card-placeholder">No photo</div>}
    <div className="item-card-body"><div className="item-card-top"><strong>{item.title}</strong><strong>{formatPrice(item.price)}</strong></div>
      <span>{item.seller.name} · {item.condition.replace("-", " ")}</span>
      {item.status !== "available" && <span className="item-status">{item.status}</span>}
    </div>
  </Link>;
}
