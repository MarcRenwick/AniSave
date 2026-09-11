import background from "../assets/background.jpg";

export default function AuthLayout({ header, children, maxWidth = "max-w-[26rem]" }) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10"
      style={{ backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-white/10" />
      {header && <div className={`relative w-full text-center ${maxWidth}`}>{header}</div>}
      <div className={`relative w-full rounded-xl bg-[#54b04f] p-8 shadow-xl ${maxWidth}`}>{children}</div>
    </div>
  );
}
