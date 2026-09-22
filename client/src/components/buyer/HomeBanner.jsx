import marketPhoto from "../../assets/Marketplace_background.jpg";

// One still banner across the top of the marketplace: what AniSave is, and a
// way straight to the produce. No carousel and no tiles beside it - the filter
// row below leads everywhere those tiles did.
//
// It is held to a readable width instead of being stretched the full width of
// the product grid. Stretched, it came out a letterbox strip six times wider
// than it was tall, which left the farmer the size of a thumbnail at one end.
// Narrower and taller hands the photo about half the banner at its full
// height, and the banner keeps a shape worth looking at.
export default function HomeBanner({ onShop }) {
  return (
    <div className="mx-auto flex min-h-[18rem] w-full max-w-5xl overflow-hidden rounded-2xl bg-gradient-to-r from-[#1f5c42] via-[#2f8f66] to-[#35a074] md:h-96">
      <div className="flex flex-1 flex-col justify-center px-10 py-10 text-white">
        <h2 className="text-3xl font-bold leading-tight lg:text-4xl">
          Fresh Crops.
          <br />
          Direct Access.
          <br />
          <span className="text-yellow-300">Honest Prices.</span>
        </h2>
        <p className="mt-4 max-w-sm text-sm text-white/90">
          Order 100% locally-grown produce straight from verified farmers, with no middleman
          markup.
        </p>
        <button
          type="button"
          onClick={onShop}
          className="mt-6 w-fit rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#2f8f66] hover:bg-green-50"
        >
          Shop Fresh Produce Now
        </button>
      </div>

      {/* Anchored right so what gets cropped is the empty field down the left
          of the photo, leaving the farmer and his basket filling the panel. */}
      <div className="relative hidden w-[28rem] shrink-0 md:block">
        <img
          src={marketPhoto}
          alt="A farmer holding a basket of freshly picked vegetables"
          className="h-full w-full object-cover object-right"
        />
        {/* Feathers the photo into the green rather than leaving a hard seam.
            #2f8f66 is what the banner gradient has reached by the seam; a
            lighter shade shows up as a pale band down the join. */}
        <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#2f8f66] to-transparent" />
      </div>
    </div>
  );
}
