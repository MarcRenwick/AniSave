import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ShoppingBasket, Sprout } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import { AuthAlert, SubmitButton, authInputCompact, authLabel, authLink } from "../components/auth/AuthParts";
import PasswordInput from "../components/PasswordInput";
import SmoothLink from "../components/SmoothLink";
import AddressPicker from "../components/AddressPicker";
import { useSmoothNavigate } from "../utils/pageTransition";
import VerificationDocumentFields from "../components/verification/VerificationDocumentFields";
import VerifyEmailForm from "../components/VerifyEmailForm";
import { getPasswordError } from "../utils/password";
import { getNameError, getUsernameError } from "../utils/accountRules";
import { emptyAddress, isAddressComplete } from "../utils/address";
import { EASE } from "../theme/harvest";
import buyer480 from "../assets/auth/role-buyer-market-480.webp";
import buyer800 from "../assets/auth/role-buyer-market-800.webp";
import farmer480 from "../assets/auth/role-farmer-carabao-480.webp";
import farmer800 from "../assets/auth/role-farmer-carabao-800.webp";

const initialForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  farmName: "",
  farmDescription: "",
};

const inputClass = authInputCompact;
const labelClass = authLabel;

// The two ways to use AniSave, as photo cards (credits: assets/PHOTO_CREDITS.md).
const ROLES = [
  {
    key: "buyer",
    title: "I'm a Buyer",
    text: "Browse and order fresh produce from local farmers",
    icon: ShoppingBasket,
    photo: [buyer480, buyer800],
    alt: "Shoppers choosing produce at a market stall",
  },
  {
    key: "farmer",
    title: "I'm a Farmer",
    text: "List your crops and sell directly to buyers",
    icon: Sprout,
    photo: [farmer480, farmer800],
    alt: "A farmer leading a carabao laden with sacks",
  },
];

// Each step slides in as the last slides out.
const swap = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.36, ease: EASE } },
  exit: { opacity: 0, x: -18, transition: { duration: 0.16 } },
};

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
        className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
      />
      <span>{children}</span>
    </label>
  );
}

const legalLink = authLink;

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
  const { register, setSession } = useAuth();
  const navigate = useSmoothNavigate();

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
  // Set once the account is made: whose it is and where its code went.
  const [verification, setVerification] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const flow =
    role === "farmer"
      ? [
          "Choose account type",
          "Personal information",
          "Government ID & farm documents",
          "Verify your email",
          "Administrator reviews your documents",
        ]
      : ["Choose account type", "Personal information", "Verify your email"];
  const verifyStep = flow.indexOf("Verify your email") + 1;

  const chooseRole = (next) => {
    setRole(next);
    setError("");
    setStep(2);
  };

  // Going back from the code step to fix a detail (a mistyped email) and
  // signing up again replaces the account that was never verified.
  const goBack = () => {
    setError("");
    if (step > 2) {
      setVerification(null);
      setStep(step - 1);
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

    // Checked in the order they are asked for, so the message points at the
    // first field that needs attention rather than the last.
    const fieldError =
      getNameError("First name", form.firstName) ||
      getNameError("Last name", form.lastName) ||
      getUsernameError(form.username);
    if (fieldError) {
      setError(fieldError);
      return;
    }

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
      setError("Choose your municipality/city.");
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
    let created;
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
        created = await register(data);
      } else {
        created = await register({ ...details, role });
      }
      // No session yet: the code just emailed is what signs them in.
      setVerification({
        username: created.username,
        email: form.email.trim(),
        emailSent: created.emailSent,
        message: created.message,
      });
      setStep(verifyStep);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerified = (session) => {
    setSession(session);
    navigate(session.role === "farmer" ? "/farmer/dashboard" : "/buyer/home");
  };

  // The steps, on the photo (wide screens): done in gold, the current one
  // cream with a ring that moves on to the next.
  const steps = (
    <ol className="mt-8 space-y-2.5" data-testid="register-steps">
      {flow.map((label, i) => {
        const done = i + 1 < step;
        const current = i + 1 === step;
        return (
          <li key={label} className="relative flex items-center gap-3">
            <span
              className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${
                done
                  ? "bg-gold-300 text-night"
                  : current
                    ? "bg-cream text-night"
                    : "bg-cream/10 text-cream/70 ring-1 ring-cream/25"
              }`}
            >
              {current && (
                <motion.span
                  layoutId="register-step-ring"
                  className="absolute -inset-1 rounded-full ring-2 ring-gold-300/70"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className={`text-sm ${current ? "font-semibold text-cream" : "text-cream/75"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );

  // The same steps, small, on the card itself (narrower screens, where the
  // photo is only a header).
  const progress = (
    <div className="mt-5 lg:hidden" data-testid="register-progress">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-bold uppercase tracking-[0.16em] text-clay-500">
          Step {step} of {flow.length}
        </span>
        <span className="truncate font-medium text-gray-500">{flow[step - 1]}</span>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {flow.map((label, i) => (
          <span key={label} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
            <motion.span
              className="absolute inset-0 origin-left rounded-full bg-brand"
              initial={false}
              animate={{ scaleX: i + 1 <= step ? 1 : 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: i + 1 === step ? 0.1 : 0 }}
            />
          </span>
        ))}
      </div>
    </div>
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
      photo="register"
      wide
    >
      <div className="flex items-center justify-between">
        {step === 1 ? (
          <SmoothLink
            to="/"
            aria-label="Back to home"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 lg:h-9 lg:w-9 text-gray-600 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
          >
            <ArrowLeft className="h-4 w-4" />
          </SmoothLink>
        ) : (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back a step"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 lg:h-9 lg:w-9 text-gray-600 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        <p className="text-sm text-gray-500">
          Already member?{" "}
          <SmoothLink to="/login" className={authLink}>
            Sign in
          </SmoothLink>
        </p>
      </div>

      {progress}

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-clay-500 lg:mt-4">
        {step === 1 && "How will you use AniSave?"}
        {step === 2 && "Tell us a little about yourself"}
        {step === 3 && role === "farmer" && "Documents an administrator will review"}
        {step === verifyStep && "One last step - check your email"}
      </p>
      <h1 className="mt-1.5 text-[1.9rem] font-semibold leading-tight text-gray-900 lg:mt-1 lg:text-[1.75rem]">{step === verifyStep ? "Verify Your Email" : "Sign Up"}</h1>

      <AuthAlert>{error}</AuthAlert>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} {...swap}>
          {step === 1 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2" data-testid="role-cards">
              {ROLES.map(({ key, title, text, icon: Icon, photo, alt }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseRole(key)}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-soft ring-1 ring-gray-200 transition-[box-shadow] duration-300 hover:shadow-lift hover:ring-brand/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
                  data-role={key}
                >
                  <span className="relative block h-28 overflow-hidden sm:h-40">
                    <img
                      src={photo[1]}
                      srcSet={`${photo[0]} 480w, ${photo[1]} 800w`}
                      sizes="(min-width: 640px) 18rem, 90vw"
                      alt={alt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 ease-harvest group-hover:scale-[1.06]"
                    />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/55 via-night/5 to-transparent" />
                    <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-cream text-brand shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                  </span>
                  <span className="flex flex-1 items-start justify-between gap-3 p-4">
                    <span>
                      <span className="block font-semibold text-gray-900">{title}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-gray-500">{text}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-400 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-brand" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleDetailsSubmit} className="mt-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="group">
                  <label htmlFor="firstName" className={labelClass}>
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    required
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Your first name"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>

                <div className="group">
                  <label htmlFor="lastName" className={labelClass}>
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    required
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Your last name"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>

                <div className="group">
                  <label htmlFor="username" className={labelClass}>
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Letters and numbers, 7 or more"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>

                <div className="group">
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

                {/* The two farm fields share a row, so splitting the name in two
                    leaves a farmer's step exactly as tall as it was. */}
                {role === "farmer" && (
                  <div className="group">
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

                {role === "farmer" && (
                  <div className="group">
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

                <div className="group">
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

                <div className="group">
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

              </div>

              {/* A farmer agrees on the last step, once they've seen what they're handing over. */}
              {role === "buyer" && (
                <div className="mt-4">
                  <TermsConsent checked={acceptedTerms} onChange={setAcceptedTerms} />
                </div>
              )}

              <SubmitButton busy={submitting} busyLabel="Creating account..." compact className={role === "buyer" ? "mt-4" : "mt-5"}>
                {role === "farmer" ? "Continue" : "Sign Up"}
              </SubmitButton>
            </form>
          )}

          {step === verifyStep && verification && (
            <VerifyEmailForm
              username={verification.username}
              email={verification.email}
              emailSent={verification.emailSent}
              message={verification.message}
              onVerified={handleVerified}
              footer={
                <button type="button" onClick={goBack} className="hover:text-brand hover:underline">
                  Wrong email? Go back and change it
                </button>
              }
            />
          )}

          {step === 3 && role === "farmer" && (
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

              <p className="rounded-xl bg-brand-soft px-3.5 py-2.5 text-xs text-brand-dark ring-1 ring-green-100">
                Your account stays <strong>Pending Verification</strong> until an administrator approves these
                documents.
              </p>

              <SubmitButton busy={submitting} busyLabel="Submitting..." compact>
                Submit Registration
              </SubmitButton>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
