import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ShoppingBasket, Sprout } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";
import AddressPicker from "../components/AddressPicker";
import VerificationDocumentFields from "../components/verification/VerificationDocumentFields";
import { getPasswordError } from "../utils/password";
import { emptyAddress, isAddressComplete } from "../utils/address";

const initialForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  farmName: "",
  farmDescription: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

const labelClass = "block text-sm font-medium text-gray-700";

// One tick-box with its wording. Ticking is required, and the server enforces
// it as well - the form is not the only thing standing between someone and an
// account they never agreed to.
function ConsentRow({ id, checked, onChange, children }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 text-xs leading-5 text-gray-600">
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#2f8f66]"
      />
      <span>{children}</span>
    </label>
  );
}

const legalLink = "font-semibold text-[#2f8f66] hover:underline";

const TermsConsent = ({ checked, onChange }) => (
  <ConsentRow id="acceptTerms" checked={checked} onChange={onChange}>
    I agree to the{" "}
    <Link to="/terms" target="_blank" rel="noopener noreferrer" className={legalLink}>
      Terms of Use
    </Link>{" "}
    and{" "}
    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className={legalLink}>
      Privacy Policy
    </Link>
    .
  </ConsentRow>
);

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  // Picked from the Province > Municipality/City lists; the server works out
  // the coordinates from these codes.
  const [address, setAddress] = useState(emptyAddress);
  const [governmentId, setGovernmentId] = useState(null);
  const [farmDocuments, setFarmDocuments] = useState([]);
  // Agreed to the Terms and Privacy Policy; and (farmers) to their documents
  // being kept and reviewed. Both are sent to the server, which insists on them.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [consentDocuments, setConsentDocuments] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const flow =
    role === "farmer"
      ? [
          "Choose account type",
          "Personal information",
          "Government ID & farm documents",
          "Administrator reviews your documents",
        ]
      : ["Choose account type", "Personal information"];

  const chooseRole = (next) => {
    setRole(next);
    setError("");
    setStep(2);
  };

  const goBack = () => {
    setError("");
    if (step === 3) {
      setStep(2);
      return;
    }
    setRole(null);
    setForm(initialForm);
    setAddress(emptyAddress);
    setAcceptedTerms(false);
    setConsentDocuments(false);
    setStep(1);
  };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    setError("");

    const passwordError = getPasswordError(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!isAddressComplete(address)) {
      setError("Choose your province and municipality/city.");
      return;
    }

    if (role === "farmer") {
      setStep(3);
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the Terms of Use and Privacy Policy to create an account.");
      return;
    }
    submitRegistration();
  };

  const handleDocumentsSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!governmentId) {
      setError("A photo of a valid government-issued ID is required.");
      return;
    }
    if (farmDocuments.length === 0) {
      setError("Add at least one farm-related document.");
      return;
    }
    if (!acceptedTerms || !consentDocuments) {
      setError("Please tick both boxes to agree before you submit.");
      return;
    }
    submitRegistration();
  };

  const submitRegistration = async () => {
    setSubmitting(true);
    setError("");
    try {
      const { confirmPassword: _confirmPassword, ...rest } = form;
      const details = { ...rest, ...address, acceptTerms: acceptedTerms };

      if (role === "farmer") {
        // One request, so the account only exists if its documents were
        // accepted too - a refused upload leaves nothing half-created.
        const data = new FormData();
        Object.entries({ ...details, role, consentDocuments }).forEach(([key, value]) => data.append(key, value));
        data.append("governmentId", governmentId);
        farmDocuments.forEach((file) => data.append("farmDocuments", file));
        await register(data);
        navigate("/farmer/dashboard");
      } else {
        await register({ ...details, role });
        navigate("/buyer/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const steps = (
    <ol className="mt-10 space-y-3">
      {flow.map((label, i) => {
        const done = i + 1 < step;
        const current = i + 1 === step;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? "bg-[#8ee6b0] text-[#1f5c42]"
                  : current
                    ? "bg-white text-[#1f5c42]"
                    : "bg-white/20 text-white/70"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-sm ${current ? "font-semibold" : "text-white/75"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <AuthShell
      tagline={
        role === "farmer" ? "Sell your harvest directly." : "Fresh food, straight from the farm."
      }
      blurb={
        role === "farmer"
          ? "List your crops and reach buyers near you, with no middlemen taking a cut."
          : "Create an account to order produce directly from the farms around you."
      }
      aside={steps}
      wide
    >
      <div className="flex items-center justify-between">
        {step === 1 ? (
          <Link
            to="/"
            aria-label="Back to home"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back a step"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        <p className="text-sm text-gray-500">
          Already member?{" "}
          <Link to="/login" className="font-semibold text-[#2f8f66] hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        {step === 1 && "How will you use AniSave?"}
        {step === 2 && "Tell us a little about yourself"}
        {step === 3 && "Documents an administrator will review"}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Sign Up</h1>

      {error && (
        <div className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {step === 1 && (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => chooseRole("buyer")}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-300 p-4 text-left transition hover:border-[#2f8f66] hover:bg-green-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-[#2f8f66]">
              <ShoppingBasket className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-gray-900">I&apos;m a Buyer</span>
              <span className="block text-sm text-gray-500">
                Browse and order fresh produce from local farmers
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => chooseRole("farmer")}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-300 p-4 text-left transition hover:border-[#2f8f66] hover:bg-green-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-[#2f8f66]">
              <Sprout className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-gray-900">I&apos;m a Farmer</span>
              <span className="block text-sm text-gray-500">
                List your crops and sell directly to buyers
              </span>
            </span>
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleDetailsSubmit} className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClass}>
                Full Name
              </label>
              <input
                id="name"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                className={`mt-1 ${inputClass}`}
              />
            </div>

            <div>
              <label htmlFor="username" className={labelClass}>
                Username
              </label>
              <input
                id="username"
                name="username"
                required
                minLength={3}
                value={form.username}
                onChange={handleChange}
                placeholder="Your username"
                className={`mt-1 ${inputClass}`}
              />
            </div>

            {/* A buyer has nothing to pair the email with, so it takes the row. */}
            <div className={role === "farmer" ? "" : "sm:col-span-2"}>
              <label htmlFor="email" className={labelClass}>
                Your Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="Your email"
                className={`mt-1 ${inputClass}`}
              />
            </div>

            {role === "farmer" && (
              <div>
                <label htmlFor="farmName" className={labelClass}>
                  Farm Name
                </label>
                <input
                  id="farmName"
                  name="farmName"
                  required
                  value={form.farmName}
                  onChange={handleChange}
                  placeholder="Your farm name"
                  className={`mt-1 ${inputClass}`}
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <PasswordInput
                id="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="Your password"
                className={`mt-1 ${inputClass}`}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Re-type Password
              </label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-type your password"
                className={`mt-1 ${inputClass}`}
              />
            </div>

            {/* Where you are - the "nearest" lists are worked out from this. */}
            <div className="sm:col-span-2">
              <AddressPicker
                required
                value={address}
                onChange={setAddress}
                selectClass={inputClass}
                className="grid gap-3 sm:grid-cols-2"
              />
            </div>

            {role === "farmer" && (
              <div className="sm:col-span-2">
                <label htmlFor="farmDescription" className={labelClass}>
                  Farm Details
                </label>
                <input
                  id="farmDescription"
                  name="farmDescription"
                  value={form.farmDescription}
                  onChange={handleChange}
                  placeholder="Crops, farm size (optional)"
                  className={`mt-1 ${inputClass}`}
                />
              </div>
            )}
          </div>

          {/* A farmer agrees on the last step, once they've seen what they're handing over. */}
          {role === "buyer" && (
            <div className="mt-4">
              <TermsConsent checked={acceptedTerms} onChange={setAcceptedTerms} />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60 ${
              role === "buyer" ? "mt-4" : "mt-6"
            }`}
          >
            {submitting ? "Creating account..." : role === "farmer" ? "Continue" : "Sign Up"}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleDocumentsSubmit} className="mt-4 space-y-3">
          <VerificationDocumentFields
            governmentId={governmentId}
            farmDocuments={farmDocuments}
            onGovernmentIdChange={setGovernmentId}
            onFarmDocumentsChange={setFarmDocuments}
          />

          <div className="space-y-2">
            <TermsConsent checked={acceptedTerms} onChange={setAcceptedTerms} />
            <ConsentRow id="consentDocuments" checked={consentDocuments} onChange={setConsentDocuments}>
              I consent to my ID and farm documents being kept and reviewed to verify me.
            </ConsentRow>
          </div>

          <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-[#1f5c42]">
            Your account stays <strong>Pending Verification</strong> until an administrator approves these
            documents.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Registration"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
