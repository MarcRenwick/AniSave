import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

// The plain frame shared by the Privacy Policy and Terms of Use pages.
export default function LegalPage({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="AniSave" className="h-9 w-9 rounded-full" />
            <span className="text-lg font-bold text-[#2f8f66]">AniSave</span>
          </Link>
          <Link to="/login" className="text-sm font-semibold text-[#2f8f66] hover:underline">
            Log in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">Last updated {updated}</p>
        {children}

        <p className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-500">
          <Link to="/terms" className="font-medium text-[#2f8f66] hover:underline">
            Terms of Use
          </Link>
          {" · "}
          <Link to="/privacy" className="font-medium text-[#2f8f66] hover:underline">
            Privacy Policy
          </Link>
        </p>
      </main>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-6 text-gray-600">{children}</div>
    </section>
  );
}

export function Bullets({ items }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
