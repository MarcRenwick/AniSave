import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { startConversation } from "../../services/api";

// Opens this buyer's conversation with a farmer - the one they already have,
// or a new one - on the Messages page. A guest is sent to log in first;
// farmers and admins don't see it.
export default function MessageFarmerButton({ farmerId, className = "" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  if (user && user.role !== "buyer") return null;

  const open = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setError("");
    setOpening(true);
    try {
      const { data } = await startConversation(farmerId);
      navigate(`/buyer/messages/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not open the chat. Please try again.");
      setOpening(false);
    }
  };

  return (
    <>
      <button type="button" onClick={open} disabled={opening} className={className}>
        <MessageCircle className="h-4 w-4" />
        {opening ? "Opening..." : "Message Farmer"}
      </button>
      {error && (
        <p role="alert" className="mt-1 w-full text-xs text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
