import { useParams } from "react-router-dom";
import EditAdForm from "@/components/EditAdForm";

const EditAd = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>ID do anúncio não encontrado.</div>;
  }

  return <EditAdForm adId={id} userType="admin" />;
};

export default EditAd;