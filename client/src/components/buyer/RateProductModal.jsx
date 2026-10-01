import { useState } from "react";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import { AuthAlert } from "../auth/AuthParts";
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

      <AuthAlert>{error}</AuthAlert>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <motion.button
              key={value}
              type="button"
              onClick={() => setStars(value)}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              aria-pressed={value <= stars}
              className="rounded-full p-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-300/50"
              whileHover={{ scale: 1.18, y: -2 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
            >
              {/* The stars up to the one chosen pop in turn as it is chosen. */}
              <motion.span
                key={value <= stars ? `on-${stars}` : "off"}
                className="block"
                initial={value <= stars ? { scale: 0.6, rotate: -20 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 14, delay: value * 0.04 }}
              >
                <Star
                  className={`h-9 w-9 transition-colors duration-150 ${
                    value <= (hovered || stars) ? "fill-gold-400 text-gold-500" : "text-gray-300"
                  }`}
                />
              </motion.span>
            </motion.button>
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
            className="mt-1 w-full rounded-xl border border-gray-300 bg-paper px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
