import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Check,
  Lock,
  Mail,
  MapPin,
  ShoppingBasket,
  Sprout,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import VerificationDocumentFields from "../components/verification/VerificationDocumentFields";
import { submitVerification } from "../services/api";
import { getPasswordError } from "../utils/password";
import logo from "../assets/logo.png";
import sidePhoto from "../assets/loginbackground.jpg";

const initialForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  location: "",
  farmName: "",
  farmDescription: "",
};

const underlineInput =
  "w-full rounded-none border-0 border-b border-gray-300 bg-transparent px-7 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2f8f66] focus:outline-none focus:ring-0";

function Field({ icon: Icon, valid, children }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      {children}
      {valid && (
        <Check className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2f8f66]" />
      )}
    </div>
  );
}

function Rule({ met, children }) {
  return (
    <li className={`flex items-center gap-1.5 ${met ? "text-[#2f8f66]" : "text-gray-400"}`}>
      <Check className="h-3 w-3" />
      {children}
    </li>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [governmentId, setGovernmentId] = useState(null);
  const [farmDocuments, setFarmDocuments] = useState([]);
  const [accountCreated, setAccountCreated] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const rules = {
    length: form.password.length >= 6 && form.password.length <= 12,
    capital: /[A-Z]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };
  const passwordOk = rules.length && rules.capital && rules.special;
  const confirmOk = form.confirmPassword.length > 0 && form.password === form.confirmPassword;

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

  const backFromDetails = () => {
    setRole(null);
    setForm(initialForm);
    setError("");
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

    if (role === "farmer") {
      setStep(3);
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
    submitRegistration();
  };

  // Kept as two phases so a failed document upload can be retried without
  // trying to create the account a second time.
  const submitRegistration = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (!accountCreated) {
        const { confirmPassword: _confirmPassword, ...payload } = form;
        await register({ ...payload, role });
        setAccountCreated(true);
      }

      if (role === "farmer") {
        const data = new FormData();
        data.append("governmentId", governmentId);
        farmDocuments.forEach((file) => data.append("farmDocuments", file));
        await submitVerification(data);
        navigate("/farmer/dashboard");
      } else {
        navigate("/buyer/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 lg:block">
        <img src={sidePhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <h2 className="text-2xl font-bold">Join AniSave</h2>
          <p className="mt-1 text-sm text-white/80">
            {role === "farmer"
              ? "Sell your harvest directly to buyers near you."
              : "Buy produce straight from the farms around you."}
          </p>

          <ol className="mt-6 space-y-3">
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
                  <span className={`text-sm ${current ? "font-semibold" : "text-white/75"}`}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-8 sm:px-10 lg:w-1/2 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
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
                onClick={() => (step === 3 ? setStep(2) : backFromDetails())}
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

          <div className="mt-8 flex items-center gap-2.5">
            <img src={logo} alt="AniSave" className="h-9 w-9 rounded-full" />
            <span className="text-lg font-bold text-gray-900">AniSave</span>
          </div>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">Sign Up</h1>
          <p className="mt-1 text-sm text-gray-500">
            {step === 1 && "How will you use AniSave?"}
            {step === 2 && "Tell us a little about yourself."}
            {step === 3 && "Upload the documents an administrator will review."}
          </p>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
              {accountCreated && (
                <span className="mt-1 block text-xs text-red-500">
                  Your account was created - you can also finish this later from your Profile.
                </span>
              )}
            </div>
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
            <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-5">
              <Field icon={UserIcon} valid={form.name.trim().length > 1}>
                <input
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  aria-label="Full name"
                  className={underlineInput}
                />
              </Field>

              <Field icon={AtSign} valid={form.username.trim().length >= 3}>
                <input
                  name="username"
                  required
                  minLength={3}
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Username"
                  aria-label="Username"
                  className={underlineInput}
                />
              </Field>

              <div>
                <Field icon={Mail} valid={/^\S+@\S+\.\S+$/.test(form.email)}>
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    aria-label="Email"
                    className={underlineInput}
                  />
                </Field>
                <p className="mt-1 pl-7 text-xs text-gray-400">
                  Used for account recovery and login codes, not for logging in with a password.
                </p>
              </div>

              <div>
                <Field icon={Lock}>
                  <PasswordInput
                    name="password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    aria-label="Password"
                    className={underlineInput}
                  />
                </Field>
                <ul className="mt-2 space-y-1 pl-7 text-xs">
                  <Rule met={rules.length}>6-12 characters</Rule>
                  <Rule met={rules.capital}>At least one capital letter (A-Z)</Rule>
                  <Rule met={rules.special}>At least one special character</Rule>
                </ul>
              </div>

              <Field icon={Lock} valid={confirmOk}>
                <PasswordInput
                  name="confirmPassword"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-type password"
                  aria-label="Re-type password"
                  className={underlineInput}
                />
              </Field>

              <Field icon={MapPin} valid={form.location.trim().length > 2}>
                <input
                  name="location"
                  required
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Address (e.g. Dagupan City)"
                  aria-label="Address"
                  className={underlineInput}
                />
              </Field>

              {role === "farmer" && (
                <>
                  <Field icon={Sprout} valid={form.farmName.trim().length > 1}>
                    <input
                      name="farmName"
                      required
                      value={form.farmName}
                      onChange={handleChange}
                      placeholder="Farm name"
                      aria-label="Farm name"
                      className={underlineInput}
                    />
                  </Field>

                  <textarea
                    name="farmDescription"
                    rows={2}
                    value={form.farmDescription}
                    onChange={handleChange}
                    placeholder="Farm details - crops you grow, farm size, etc. (optional)"
                    aria-label="Farm details"
                    className={`${underlineInput} px-0`}
                  />
                </>
              )}

              <button
                type="submit"
                disabled={submitting || !passwordOk || !confirmOk}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
              >
                {submitting ? "Creating account..." : role === "farmer" ? "Continue" : "Sign Up"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleDocumentsSubmit} className="mt-6 space-y-6">
              <VerificationDocumentFields
                governmentId={governmentId}
                farmDocuments={farmDocuments}
                onGovernmentIdChange={setGovernmentId}
                onFarmDocumentsChange={setFarmDocuments}
              />

              <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-[#1f5c42]">
                After you submit, your account sits at <strong>Pending Verification</strong> until an
                administrator reviews these documents. You can list products once approved.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Registration"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
