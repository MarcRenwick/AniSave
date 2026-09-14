import { useState } from "react";
import { Star } from "lucide-react";
import Modal from "../Modal";
import { createRating } from "../../services/api";

export default function RateProductModal({ order, onClose, onSubmitted }) {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!stars) {
      setError("Please select a star rating");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await createRating(order._id, stars, comment.trim());
      onSubmitted(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit your rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Rate this Product" onClose={onClose}>
      <p className="text-sm text-gray-600">
        How was <span className="font-medium">{order.productTitle}</span> from{" "}
        {order.farmer?.farmName || order.farmer?.name}?
      </p>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStars(value)}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              className="p-1"
            >
              <Star
                className={`h-8 w-8 ${
                  value <= (hovered || stars) ? "fill-amber-400 text-amber-400" : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
            Comment (optional)
          </label>
          <textarea
            id="comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56] disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
