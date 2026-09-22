import marketPhoto from "../../assets/Marketplace_background.jpg";

// One still banner across the top of the marketplace: what AniSave is, and a
// way straight to the produce. No carousel and no tiles beside it - the filter
// row below leads everywhere those tiles did.
//
// The photo sits at its own size on the right rather than being stretched
// across the whole width, because it is a small picture and blowing it up
// would only make it soft.
export default function HomeBanner({ onShop }) {
  return (
    <div className="relative flex h-72 overflow-hidden rounded-2xl bg-gradient-to-r from-[#1f5c42] via-[#2f8f66] to-[#35a074]">
      <div className="flex flex-1 flex-col justify-center px-10 py-8 text-white">
        <h2 className="text-3xl font-bold leading-tight">
          Fresh Crops.
          <br />
          Direct Access.
          <br />
          <span className="text-yellow-300">Honest Prices.</span>
        </h2>
        <p className="mt-3 max-w-md text-sm text-white/90">
          Order 100% locally-grown produce straight from verified farmers, with no middleman
          markup.
        </p>
        <button
          type="button"
          onClick={onShop}
          className="mt-5 w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#2f8f66] hover:bg-green-50"
        >
          Shop Fresh Produce Now
        </button>
      </div>

      <div className="relative hidden w-[26rem] shrink-0 md:block">
        <img
          src={marketPhoto}
          alt="A farmer holding a basket of freshly picked vegetables"
          className="h-full w-full object-cover"
        />
        {/* Feathers the photo into the green rather than leaving a hard seam. */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#35a074] to-transparent" />
      </div>
    </div>
  );
}
