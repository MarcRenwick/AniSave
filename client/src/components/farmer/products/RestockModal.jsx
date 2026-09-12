import { useState } from "react";
import Modal from "../../Modal";

const presets = [10, 25, 50, 100, 200, 500];

export default function RestockModal({ product, onClose, onConfirm }) {
  const [selected, setSelected] = useState(100);
  const [custom, setCustom] = useState("");

  const amount = custom !== "" ? Number(custom) : selected;

  const handleConfirm = () => {
    if (!amount || amount <= 0) return;
    onConfirm(amount);
  };

  return (
    <Modal title="Restock Quantity" onClose={onClose}>
      <p className="text-sm text-gray-600">How much would you like to add to your stock?</p>

      <div className="mt-4 space-y-2">
        {presets.map((kg) => (
          <label key={kg} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name="restock-amount"
              checked={custom === "" && selected === kg}
              onChange={() => {
                setSelected(kg);
                setCustom("");
              }}
              className="h-4 w-4 accent-[#2f8f66]"
            />
            {kg} kg
          </label>
        ))}

        <label className="flex items-center gap-2 text-sm text-gray-800">
          <span>Custom quantity</span>
          <input
            type="number"
            min="1"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
          />
          <span>kg</span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        className="mt-5 w-full rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white transition hover:bg-[#267a56]"
      >
        Confirm Restock ({product.title})
      </button>
    </Modal>
  );
}
