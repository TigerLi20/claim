import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import ItemForm from "../components/ItemForm";
import { trackEvent } from "../analytics";
export default function PostItem() { const navigate = useNavigate(); return <main className="content"><div className="section-label">SELL AN ITEM</div><h1 className="page-title">Create a listing</h1><ItemForm onSave={async payload => { const item = await api.postItem(payload); trackEvent("listing-posted"); navigate(`/items/${item.id}`); }} /></main>; }
