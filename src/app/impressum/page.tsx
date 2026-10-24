import type { Metadata } from "next";
import Link from "next/link";
import {
  EmailLink,
  LegalList,
  LegalPage,
  LegalSection,
  OperatorDetails,
  legalLinkClass,
} from "@/components/legal/legal-page";

/*
 * Sources checked 2026-10-25:
 * - §5 DDG (Digitale-Dienste-Gesetz, replaced §5 TMG in May 2024) and §18 Abs. 2 MStV.
 * - EU ODR platform: Regulation (EU) 2024/3228 repealed Regulation 524/2013; the platform closed on
 *   20 July 2025, so no ODR link is required (iubenda.com blog on the ODR discontinuation;
 *   oeil.europarl.europa.eu summary id 1800145).
 * - §36 VSBG (consumer arbitration statement) only binds traders with more than 10 employees or
 *   with general terms; stated voluntarily here.
 */

const title = "Impressum / Legal notice";
const description = "Who runs the FAU PSA Forum and how to reach them.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title,
    description,
    openGraph: { siteName: "FAU PSA Forum", title, description, url: "/impressum" },
  };
}

export default function ImpressumPage() {
  return (
    <LegalPage title={title} description={description}>
      <LegalSection title="Information according to § 5 DDG">
        <OperatorDetails />
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Email: <EmailLink />
        </p>
        <p>We usually answer within a few days.</p>
      </LegalSection>

      <LegalSection title="Responsible for the content according to § 18 (2) MStV">
        <OperatorDetails nameOnly />
      </LegalSection>

      <LegalSection title="About this project">
        <p>
          The FAU PSA Forum is a free, non-commercial community project by and for Pakistani students
          in and around FAU Erlangen-Nürnberg. It has no advertising, sells nothing and is run by
          volunteers in their free time. It is not an official service of Friedrich-Alexander-Universität
          Erlangen-Nürnberg.
        </p>
      </LegalSection>

      <LegalSection title="Liability for content">
        <p>
          We write and curate the guides and announcements with care, but we cannot guarantee that they
          are complete, correct or up to date. Rules for visas, residence permits, universities and
          authorities change often: always check with the official source before you act. Nothing on this
          site is legal, tax or immigration advice.
        </p>
      </LegalSection>

      <LegalSection title="Posts by users">
        <p>
          Threads, comments and replies are written by members and reflect their own views. Moderators
          review new threads before they are published, but we do not check every comment in advance and
          are not obliged to monitor what users post.
        </p>
        <p>As soon as we learn of unlawful content, we remove it. You can tell us in two ways:</p>
        <LegalList>
          <li>use the Report option on the thread or comment, or</li>
          <li>
            email <EmailLink /> with the link to the post and what is wrong with it.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Links to other websites">
        <p>
          Posts and guides link to websites of other providers. We have no influence on their content,
          and their providers alone are responsible for it. We checked linked pages for obvious legal
          problems when the link was added; if we learn that a linked page is unlawful, we remove the
          link.
        </p>
      </LegalSection>

      <LegalSection title="Dispute resolution">
        <p>
          We are not a business and sell nothing, so consumer dispute resolution does not apply. We are
          neither obliged nor willing to take part in dispute resolution proceedings before a consumer
          arbitration board.
        </p>
      </LegalSection>

      <LegalSection title="Privacy">
        <p>
          How we handle your data is described in our{" "}
          <Link href="/privacy" className={legalLinkClass}>
            privacy policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
