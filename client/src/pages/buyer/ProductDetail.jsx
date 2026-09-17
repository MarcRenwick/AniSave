import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Package, Star, ShoppingBasket } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import AddToCartModal from "../../components/buyer/AddToCartModal";
import CheckoutModal from "../../components/buyer/CheckoutModal";
import ProductGallery from "../../components/products/ProductGallery";
import Avatar from "../../components/Avatar";
import { getProduct, getFarmerProfile } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { activeAgo, timeAgo } from "../../utils/activity";

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-red-600">{value}</span>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [farmerStats, setFarmerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyMessage, setBuyMessage] = useState("");
  const [showAddToCart, setShowAddToCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then(({ data }) => {
        setProduct(data);
        return data.farmer?._id ? getFarmerProfile(data.farmer._id) : null;
      })
      .then((farmerRes) => {
        if (farmerRes) setFarmerStats(farmerRes.data);
      })
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirmAddToCart = (qty) => {
    addToCart(product, qty);
    setShowAddToCart(false);
    setBuyMessage(`Added ${qty}kg to cart!`);
  };

  const isPreOrder = product?.productType === "preorder";
  const soldOut = !isPreOrder && product?.stock === 0;

  const handleProceedToCheckout = (qty) => {
    setShowCheckout(false);
    navigate("/buyer/checkout", {
      state: {
        items: [
          {
            productId: product._id,
            title: product.title,
            price: product.price,
            image: product.image,
            farmerId: product.farmer?._id,
            farmerName: product.farmer?.farmName || product.farmer?.name || "Unknown Farmer",
            location: product.location || product.farmer?.location || "Address not set",
            quantity: qty,
            preorder: isPreOrder,
          },
        ],
        fromCart: false,
      },
    });
  };

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>
      </BuyerTopBar>

      <div className="p-8">
        {loading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && product && (
          <div className="grid grid-cols-2 gap-8 rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <ProductGallery key={product._id} product={product} />

              <Link
                to={`/buyer/products/${product._id}/ratings`}
                className="mx-auto mt-4 block w-fit rounded-md border-2 border-[#2f8f66] px-6 py-2 text-sm font-semibold text-[#2f8f66] transition hover:bg-green-50 active:scale-95"
              >
                View Ratings
              </Link>

              {buyMessage && (
                <div className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                  {buyMessage}
                </div>
              )}

              {user?.role === "buyer" ? (
                <div className="mt-4 flex gap-3">
                  {/* Pre-orders are placed one listing at a time, straight from here -
                      the cart checks out against live stock. */}
                  <button
                    type="button"
                    onClick={() => setShowAddToCart(true)}
                    disabled={product.stock === 0 || isPreOrder}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-[#2f8f66] py-3 text-sm font-semibold text-[#2f8f66] transition hover:bg-green-50 disabled:opacity-60"
                  >
                    <ShoppingBasket className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckout(true)}
                    disabled={soldOut}
                    className={`flex-1 rounded-md py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
                      isPreOrder ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {isPreOrder ? "Pre-Order" : soldOut ? "Out of Stock" : "Buy Now"}
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="mt-4 block w-full rounded-md bg-red-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Log in as a buyer to order
                </Link>
              )}
            </div>

            <div>
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-gray-900">
                {product.title}
                {isPreOrder && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Pre-Order
                  </span>
                )}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <Star
                  className={`h-4 w-4 ${product.ratingCount > 0 ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                />
                {product.ratingCount > 0
                  ? `${product.rating.toFixed(1)} (${product.ratingCount} rating${product.ratingCount === 1 ? "" : "s"})`
                  : "No ratings yet"}{" "}
                · Sold {product.sold || 0}
              </p>

              <div className="mt-4 rounded-md bg-[#2f8f66] px-4 py-2 text-lg font-semibold text-white">
                ₱{product.price} per kilo
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Sold by</dt>
                  <dd className="font-medium text-gray-900">
                    {product.farmer?._id ? (
                      <Link to={`/buyer/farmers/${product.farmer._id}`} className="hover:underline">
                        {product.farmer?.farmName || product.farmer?.name || "Unknown farmer"}
                      </Link>
                    ) : (
                      product.farmer?.farmName || product.farmer?.name || "Unknown farmer"
                    )}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <dt className="text-gray-500">Pick up</dt>
                  <dd className="font-medium text-gray-900">Ready for pickup</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Category</dt>
                  <dd className="font-medium capitalize text-gray-900">{product.category}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Address</dt>
                  <dd className="font-medium text-gray-900">
                    {product.location || product.farmer?.location || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Available Stock</dt>
                  <dd className="font-medium text-gray-900">{product.stock} kilos</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {!loading && !error && product && farmerStats && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-white p-7 shadow-sm">
            <div className="flex items-center gap-5">
              <Avatar
                src={farmerStats.avatar}
                alt={farmerStats.farmName || farmerStats.name}
                className="h-20 w-20 rounded-full bg-green-100 text-[#2f8f66]"
                iconClass="h-10 w-10"
              />
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {farmerStats.farmName || farmerStats.name}
                </p>
                {activeAgo(farmerStats.lastActiveAt) && (
                  <p className="text-sm text-gray-500">{activeAgo(farmerStats.lastActiveAt)}</p>
                )}
                <Link
                  to={`/buyer/farmers/${product.farmer._id}`}
                  className="mt-2 inline-block rounded-md border border-[#2f8f66] px-4 py-1.5 text-sm font-semibold text-[#2f8f66] transition duration-150 hover:bg-green-50 active:scale-95"
                >
                  View Seller
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
              <Stat label="Ratings" value={farmerStats.ratingCount} />
              <Stat label="Joined" value={timeAgo(farmerStats.createdAt)} />
              <Stat label="Products" value={farmerStats.productCount} />
            </div>
          </div>
        )}

        {!loading && !error && product && (
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="bg-[#2f8f66] px-6 py-3 font-semibold text-white">
              Product Description
            </div>
            <p className="whitespace-pre-line p-6 text-sm leading-relaxed text-gray-700">
              {product.description || "No description provided yet."}
            </p>
          </div>
        )}
      </div>

      {showAddToCart && product && (
        <AddToCartModal
          product={product}
          onClose={() => setShowAddToCart(false)}
          onConfirm={handleConfirmAddToCart}
        />
      )}

      {showCheckout && product && (
        <CheckoutModal
          product={product}
          preorder={isPreOrder}
          onClose={() => setShowCheckout(false)}
          onConfirm={handleProceedToCheckout}
        />
      )}
    </BuyerLayout>
  );
}
