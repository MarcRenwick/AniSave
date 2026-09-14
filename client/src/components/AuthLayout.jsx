import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import background from "../assets/background.jpg";

export default function AuthLayout({ header, children, maxWidth = "max-w-[26rem]" }) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10"
      style={{ backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-white/10" />
      <Link
        to="/"
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition duration-150 hover:bg-black/30 active:scale-95 sm:left-8 sm:top-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
      {header && <div className={`relative w-full text-center ${maxWidth}`}>{header}</div>}
      <div className={`relative w-full rounded-xl bg-[#54b04f] p-8 shadow-xl ${maxWidth}`}>{children}</div>
    </div>
  );
}
