import LegalPage, { Bullets, Section } from "../components/LegalPage";

export default function Terms() {
  return (
    <LegalPage title="Terms of Use" updated="19 September 2026">
      <p className="mt-6 text-sm leading-6 text-gray-600">
        These terms apply to everyone who uses AniSave, a farm-to-buyer marketplace built as a school
        project. By creating an account you agree to them and to the Privacy Policy.
      </p>

      <Section title="Your account">
        <Bullets
          items={[
            "Give accurate information, and keep it up to date.",
            "You are responsible for your password and for what happens under your account. Tell an administrator if you think someone else has it - and change it straight away.",
            "One person, one account. Don't use someone else's identity or documents.",
          ]}
        />
      </Section>

      <Section title="Farmers">
        <Bullets
          items={[
            "You can sell only after an administrator approves your ID and farm documents, and the documents must be genuine.",
            "Describe your products, prices and stock honestly, and keep them current.",
            "Accept, prepare and complete the orders you take, or decline them promptly.",
          ]}
        />
      </Section>

      <Section title="Buyers">
        <Bullets
          items={[
            "An order is a request to a farmer, who may accept it or not. Arrange pick-up or delivery with the farmer.",
            "Only rate products you have actually received, and keep ratings honest and respectful.",
            "Use “Report this user” on a farmer's shop only for a real problem, with an honest description. Knowingly false reports can lead to action against your account.",
          ]}
        />
      </Section>

      <Section title="Acceptable use">
        <p>
          Don&apos;t try to break, overload or get around AniSave&apos;s security, collect other
          people&apos;s information, or post anything unlawful, misleading or abusive.
        </p>
      </Section>

      <Section title="Moderation">
        <p>
          Administrators may reject a farmer&apos;s verification, or ban or suspend an account that breaks
          these terms - for example after reviewing a report. A banned or suspended account can&apos;t
          log in, and a suspended farmer&apos;s shop and products are hidden from buyers.
        </p>
      </Section>

      <Section title="No guarantees">
        <p>
          AniSave is a school project provided as it is. We do our best to keep it working and secure,
          but we can&apos;t promise it will always be available or error-free.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If these terms change in a way that matters, the date above changes.
        </p>
      </Section>
    </LegalPage>
  );
}
