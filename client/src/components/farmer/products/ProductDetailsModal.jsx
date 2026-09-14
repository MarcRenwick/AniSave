import Modal from "../../Modal";

export default function ProductDetailsModal({ product, onClose }) {
  return (
    <Modal title="Details" onClose={onClose}>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-gray-500">Title</dt>
          <dd className="font-medium text-gray-900">{product.title}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Kilos</dt>
          <dd className="font-medium text-gray-900">{product.stock} kg</dd>
        </div>
        <div>
          <dt className="text-gray-500">Price per kilo</dt>
          <dd className="font-medium text-gray-900">₱{product.price}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Category</dt>
          <dd className="font-medium capitalize text-gray-900">{product.category}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Location</dt>
          <dd className="font-medium text-gray-900">{product.location}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Description</dt>
          <dd className="whitespace-pre-line font-medium text-gray-900">
            {product.description || "No description provided yet."}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
