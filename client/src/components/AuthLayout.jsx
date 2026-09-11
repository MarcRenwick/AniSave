import background from "../assets/background.jpg";

export default function AuthLayout({ children, maxWidth = "max-w-sm" }) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-10"
      style={{ backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-white/40" />
      <div className={`relative w-full rounded-xl bg-white p-8 shadow-xl ${maxWidth}`}>{children}</div>
    </div>
  );
}
