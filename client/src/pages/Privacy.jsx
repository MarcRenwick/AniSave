import LegalPage, { Bullets, Section } from "../components/LegalPage";

// Keep in step with what the app really does - and bump TERMS_VERSION in
// server/utils/privacy.js when this or the Terms change in a way that matters.
export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="19 September 2026">
      <p className="mt-6 text-sm leading-6 text-gray-600">
        AniSave is a farm-to-buyer marketplace built as a school project. This page explains what
        personal information it keeps about farmers, buyers and administrators, what it is used for,
        who can see it, and what you can do about it.
      </p>

      <Section title="What we collect">
        <Bullets
          items={[
            "Your account: full name, username, email address and password (kept only as a one-way hash - nobody, including us, can read it).",
            "Where you are: the province and municipality/city you pick when you sign up. We save that city's centre point so farms can be sorted by distance.",
            "Optional: a phone number and a profile photo.",
            "Farmers: farm name and description, a photo of a government-issued ID and one or more farm-related documents.",
            "What you do on AniSave: products you list, orders you place or receive, and ratings you write.",
            "Reports: if you report a seller, the reason, your description and any photos you attach. If you report a review, the reason and - for “Other Violations” - your description.",
            "Blocked shops: if you block a seller, we keep that on your account so their shop stays hidden from you until you unblock them. No reason is asked for or stored.",
            "Security records: one-time codes we email you (stored hashed, expiring within minutes), failed sign-in counts, and the sign-in token kept in your browser.",
          ]}
        />
      </Section>

      <Section title="What we do not collect">
        <p>
          We never ask for, or read, your device&apos;s live (GPS) location, and you never type in
          coordinates. We do not use advertising trackers and we do not sell or share your information
          for marketing.
        </p>
        <p className="mt-3">
          So that farmers can see which crops are in demand, we count how often a product comes up in
          a search and how often it is opened. Those are counts kept against the product itself - we
          do not keep a record of what any one person searched for or looked at, and no farmer can
          see who was looking.
        </p>
      </Section>

      <Section title="Why we use it">
        <Bullets
          items={[
            "To run your account and the marketplace: showing farms and products, placing and tracking orders.",
            "To sort farms and products from nearest to farthest, using the city you chose.",
            "To verify farmers: an administrator reviews the ID and farm documents before a farmer can sell. They are used for nothing else.",
            "To keep the marketplace safe: an administrator reads the reports buyers send about sellers and decides whether to dismiss them or suspend the seller. Reports about reviews are read the same way: the administrator can dismiss them, remove the review or suspend whoever wrote it.",
            "To keep accounts secure: emailed sign-in and password-reset codes, two-step sign-in, and limits on repeated failed attempts.",
            "We only email you the codes and security messages you ask for - no marketing emails.",
          ]}
        />
      </Section>

      <Section title="Who can see what">
        <Bullets
          items={[
            "Everyone: a farmer's name, farm, town and province, their products and ratings.",
            "Signed-in users: a farmer's phone number, if they added one.",
            "The buyer and farmer on an order: each other's name, address and phone number, so the order can be arranged.",
            "Administrators: the account list (to moderate accounts) and a farmer's ID and farm documents while reviewing them.",
            "Your ID and farm documents are stored privately. Only you and an administrator can open them - they are never public.",
            "A report you send, and its photos, are seen only by you and administrators. The seller is not shown who reported them, and nobody is told who reported a review.",
            "Who you have blocked is yours alone: the seller is not told, and it is in no list an administrator can see. You can read it in your own data download.",
          ]}
        />
      </Section>

      <Section title="How long we keep it, and deleting it">
        <p>
          We keep your information for as long as your account exists. When you use{" "}
          <strong>Delete Account</strong> in your profile - farmers pick a reason and agree to the deletion
          terms first, and either way it is confirmed with a code emailed to you - your
          account, products, orders, ratings, profile photo, verification documents and the reports you
          sent (with their photos) are permanently removed. A seller who deletes their account also has
          the reports about them removed, and reports about a review are removed along with the review.
          A deleted seller is also taken out of the block lists of everyone who had blocked them.
        </p>
      </Section>

      <Section title="Your choices">
        <Bullets
          items={[
            "Access: use “Download my data” in your profile’s Privacy & Security to get a copy of what we hold about you.",
            "Correction: change your name, phone number, address and farm details with Edit Profile.",
            "Deletion and withdrawing consent: delete your account, as above.",
            "Extra protection: turn on two-step sign-in in Privacy & Security, so a password alone can’t open your account.",
          ]}
        />
      </Section>

      <Section title="How we protect it">
        <p>
          Passwords are hashed; one-time codes are hashed and expire; ID and farm documents are kept
          out of public folders; repeated wrong passwords or codes lock the attempt; and signing out,
          changing your password or being banned ends every session on the account.
        </p>
      </Section>

      <Section title="Your agreement and changes">
        <p>
          By creating an account you agree to this policy and the Terms of Use. Farmers separately
          consent to their ID and farm documents being kept and reviewed to verify them. If this policy
          changes in a way that matters, the date above changes.
        </p>
      </Section>
    </LegalPage>
  );
}
