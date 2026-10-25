import type { Metadata } from "next";
import Link from "next/link";
import {
  EmailLink,
  LegalList,
  LegalPage,
  LegalSection,
  LegalSubsection,
  OperatorDetails,
  legalLinkClass,
} from "@/components/legal/legal-page";

/*
 * Sources checked 2026-10-25 (update this page and `lastUpdated` when one of them changes):
 * - Vercel: vercel.com/legal/privacy-policy (updated 1 June 2026) states certification under the
 *   EU-US DPF, UK Extension and Swiss-US DPF; vercel.com/legal/dpa includes the 2021 SCCs and a UK
 *   addendum; address from DPA Schedule 5. The entry on dataprivacyframework.gov was NOT checked.
 * - Supabase: supabase.com/privacy and supabase.com/legal/dpa (2021 SCCs, contracting party
 *   Supabase Pte. Ltd., Singapore). No DPF certification found, so only SCCs are named.
 * - UK adequacy: the Commission renewed the GDPR adequacy decision for the UK on 19 December 2025,
 *   valid until 27 December 2031 (eucrim.eu, hunton.com; official Commission page not fetched).
 * - BayLDA: lda.bayern.de/de/kontakt.html (Promenade 18, 91522 Ansbach; Postfach 1349, 91504
 *   Ansbach) and lda.bayern.de/de/beschwerde.html; competent for non-public bodies in Bavaria
 *   (Art. 18 BayDSG, § 40 BDSG).
 * - Policies: policies.google.com/privacy, GitHub General Privacy Statement on docs.github.com.
 * - Cookie names and storage keys: src/lib/supabase/*, src/components/member-view/actions.ts,
 *   src/app/account/export/route.ts, next-themes, src/components/announcements/unseen-store.ts,
 *   src/components/guides/guide-progress.tsx.
 * - Sign-in emails go through Supabase's mailer; add the SMTP provider here once one is set up.
 */

const title = "Privacy policy / Datenschutzerklärung";
const description = "What data the PSA FAU Community Forum processes, why, and what your rights are.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title,
    description,
    openGraph: { siteName: "PSA FAU Community Forum", title, description, url: "/privacy" },
  };
}

const TOC = [
  { id: "controller", label: "Who is responsible" },
  { id: "summary", label: "In short" },
  { id: "data", label: "What we process and why" },
  { id: "legal-bases", label: "Legal bases" },
  { id: "recipients", label: "Service providers and recipients" },
  { id: "cookies", label: "Cookies and local storage" },
  { id: "retention", label: "How long we keep data" },
  { id: "rights", label: "Your rights" },
  { id: "complaints", label: "Right to complain" },
  { id: "automated", label: "No automated decisions" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact" },
] as const;

const STORAGE: { name: string; where: string; purpose: string; duration: string }[] = [
  {
    name: "sb-…-auth-token",
    where: "Cookie",
    purpose: "Keeps you signed in. Set by Supabase Auth when you sign in; large sessions are split into .0, .1, … parts.",
    duration: "Until you sign out, at most 400 days",
  },
  {
    name: "sb-…-auth-token-code-verifier",
    where: "Cookie",
    purpose: "Secures the sign-in link and Google sign-in against interception.",
    duration: "Removed when sign-in completes",
  },
  {
    name: "view_as_member",
    where: "Cookie",
    purpose: "Moderators only: remembers that they chose to see pages the way members see them.",
    duration: "Until switched off, at most 1 year",
  },
  {
    name: "export_at",
    where: "Cookie",
    purpose: "Limits “Download my data” to one download every 10 minutes.",
    duration: "10 minutes",
  },
  {
    name: "theme",
    where: "Local storage",
    purpose: "Your light or dark mode choice.",
    duration: "Until you clear your browser data",
  },
  {
    name: "psa-announcements-seen-at",
    where: "Local storage",
    purpose: "When you last saw the announcements, to mark new ones.",
    duration: "Until you clear your browser data",
  },
  {
    name: "psa-guide-progress:…",
    where: "Local storage",
    purpose: "Which guide steps you ticked while signed out.",
    duration: "Until you clear your browser data",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage title={title} description={description}>
      <nav aria-labelledby="toc-heading" className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <h2 id="toc-heading" className="mb-2 text-meta font-medium text-muted">
          Contents
        </h2>
        <ol className="gap-x-6 sm:columns-2">
          {TOC.map(({ id, label }, i) => (
            <li key={id} className="break-inside-avoid">
              <a
                href={`#${id}`}
                className="flex min-h-9 items-center gap-2 rounded-md text-small text-foreground transition-colors duration-150 hover:text-accent pointer-coarse:min-h-11"
              >
                <span className="w-5 shrink-0 text-meta tabular-nums text-subtle">{i + 1}.</span>
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <LegalSection id="controller" title="1. Who is responsible">
        <p>
          The joint controllers under the EU General Data Protection Regulation (GDPR) for this forum are
          the two people who run it:
        </p>
        <OperatorDetails />
        <p>
          Email: <EmailLink />. We have not appointed a data protection officer; we are not required to.
        </p>
      </LegalSection>

      <LegalSection id="summary" title="2. In short">
        <LegalList>
          <li>The PSA FAU Community Forum is a free, non-commercial community project run by volunteers.</li>
          <li>You can read everything without an account. You only need one to post, vote or save threads.</li>
          <li>We use your data only to run the forum. We do not sell it, show ads, or use analytics or tracking.</li>
          <li>
            You can download all your data or delete your account at any time on your{" "}
            <Link href="/account" className={legalLinkClass}>
              account page
            </Link>
            .
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="data" title="3. What we process and why">
        <LegalSubsection title="Visiting the site">
          <p>
            Every time you open a page, our host Vercel processes technical data needed to deliver it:
            your IP address, date and time, the page requested, browser and operating system (user
            agent) and the referring page. Vercel keeps these in short-lived request logs that we use
            only to find errors and stop abuse. We do not combine them with your account.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Your account">
          <p>
            Accounts are handled by Supabase Auth. When you sign in we store your email address, how
            you signed in (email link or Google), when the account was created and when you last
            signed in. Supabase keeps security logs of sign-ins that include your IP address. When you
            sign in with an email link, Supabase sends that email to you.
          </p>
          <p>
            If you choose “Continue with Google”, Google tells Supabase your name, email address, your
            Google account ID and the link to your profile picture. We use only your name, as the
            starting value of your display name, which you can change. We never show your Google
            picture.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Your profile">
          <p>
            Your display name, your @username, the optional affiliation badge you choose (for example
            student or graduate), your role (member, moderator or admin), your reputation points and
            the date you joined. These are shown publicly next to your posts and on your profile page.
          </p>
        </LegalSubsection>

        <LegalSubsection title="What you post and do">
          <LegalList>
            <li>
              <strong>Threads, comments and replies</strong>, including earlier versions of edited
              threads, which moderators review. Published posts are public, with your name.
            </li>
            <li>
              <strong>Votes</strong>: the totals are public; who voted is visible only to you.
            </li>
            <li>
              <strong>Bookmarks, followed threads and guide progress</strong>: visible only to you. If you
              ticked guide steps while signed out, they are copied to your account when you sign in.
            </li>
            <li>
              <strong>Reports, update requests and moderator applications</strong>, with the reason or
              text you entered. Moderators see them so they can act on them.
            </li>
            <li>
              <strong>Feedback</strong> you send with “Send feedback”: your message, your account and the
              page you sent it from.
            </li>
          </LegalList>
        </LegalSubsection>

        <LegalSubsection title="Notifications">
          <p>
            Notifications about replies, mentions, followed threads and moderation decisions, whether
            you have read them, and your notification settings (which types you muted and how often
            you want emails).
          </p>
        </LegalSubsection>

        <LegalSubsection title="Moderation and abuse prevention">
          <p>
            When moderators approve, reject or archive threads, hide comments, handle reports, or mute or
            ban an account, we keep a
            moderation log entry with who did it, to whom, and the reason. Restrictions on an account
            are stored with their reason. To limit spam, the forum counts how many posts, votes and
            reports an account made recently; this uses the posts themselves and stores nothing extra.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="legal-bases" title="4. Legal bases">
        <LegalList>
          <li>
            <strong>Art. 6(1)(b) GDPR</strong> (contract): providing the forum you signed up for, that is
            your account, profile, posts, votes, bookmarks, notifications, feedback and the data export.
          </li>
          <li>
            <strong>Art. 6(1)(f) GDPR</strong> (legitimate interests): keeping the site secure and
            available, preventing abuse and spam, rate limits, moderation, the server and sign-in logs,
            and keeping public discussions readable after an account is deleted. Our interest is a safe,
            useful forum for the community.
          </li>
          <li>
            <strong>Art. 6(1)(c) GDPR</strong> (legal obligation): where the law requires us to keep or
            hand over data, for example when we must answer a request from a public authority.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="recipients" title="5. Service providers and recipients">
        <p>
          We do not sell or share your data for marketing. These providers process data for us under
          data processing agreements, or independently where noted:
        </p>
        <LegalSubsection title="Supabase (database and sign-in)">
          <p>
            Supabase Pte. Ltd., 65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513. Our database
            and accounts are stored on Amazon Web Services in London, United Kingdom (region eu-west-2).
            The EU has recognised the UK as providing adequate data protection (adequacy decision under
            Art. 45 GDPR). Where Supabase staff or sub-processors outside the EU or UK access data, the
            EU Standard Contractual Clauses in Supabase’s data processing agreement apply.{" "}
            <a href="https://supabase.com/privacy" className={legalLinkClass}>
              Supabase privacy policy
            </a>
            .
          </p>
        </LegalSubsection>
        <LegalSubsection title="Vercel (hosting)">
          <p>
            Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. Vercel runs our server code in
            London (region lhr1) and delivers pages through its global content delivery network, so a
            request may be answered by the server nearest to you. Vercel is certified under the EU-US
            Data Privacy Framework (Art. 45 GDPR); its data processing agreement also includes the EU
            Standard Contractual Clauses.{" "}
            <a href="https://vercel.com/legal/privacy-policy" className={legalLinkClass}>
              Vercel privacy policy
            </a>
            .
          </p>
        </LegalSubsection>
        <LegalSubsection title="Cloudflare (backups)">
          <p>
            Cloudflare, Inc. stores our encrypted database backups in a private R2 bucket in the EU. It
            cannot read them, because they are encrypted before they are uploaded.
          </p>
        </LegalSubsection>
        <LegalSubsection title="Google (only if you choose “Continue with Google”)">
          <p>
            If you sign in with Google, you are sent to Google, which learns that you are signing in to
            this forum and then passes your name, email and profile picture link to Supabase. Google
            processes this as its own controller under its{" "}
            <a href="https://policies.google.com/privacy" className={legalLinkClass}>
              privacy policy
            </a>
            . Signing in with an email link involves no Google service.
          </p>
        </LegalSubsection>
        <LegalSubsection title="GitHub (Contributors page)">
          <p>
            The{" "}
            <Link href="/contributors" className={legalLinkClass}>
              Contributors
            </Link>{" "}
            page shows the public GitHub profiles of people who contributed code. Our server fetches
            that list from GitHub; it sends no data about you. When you open the page, your browser
            loads the profile pictures directly from GitHub, which then sees your IP address and
            browser, as described in the{" "}
            <a
              href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
              className={legalLinkClass}
            >
              GitHub privacy statement
            </a>
            . No other page loads anything from GitHub.
          </p>
        </LegalSubsection>
        <LegalSubsection title="Moderators and authorities">
          <p>
            Volunteer moderators see reports, update requests, applications, feedback and the moderation
            log so they can look after the forum. We disclose data to authorities only where the law
            obliges us to.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="cookies" title="6. Cookies and local storage">
        <p>
          We only store what the forum needs to work or what you chose yourself. There are no analytics,
          tracking or advertising cookies, and no third-party scripts. That is why there is no cookie
          banner: storage that is strictly necessary for a service you asked for needs no consent
          (§ 25(2) no. 2 TDDDG). The font is served from our own domain.
        </p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {STORAGE.map(({ name, where, purpose, duration }) => (
            <li key={name} className="space-y-1 p-3 sm:p-4">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <code className="break-all font-mono text-meta text-foreground">{name}</code>
                <span className="text-meta text-subtle">{where}</span>
              </p>
              <p>{purpose}</p>
              <p className="text-meta text-subtle">Kept: {duration}</p>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="retention" title="7. How long we keep data">
        <LegalList>
          <li>
            <strong>Account and profile</strong>: until you delete your account.
          </li>
          <li>
            <strong>When you delete your account</strong>, we immediately delete your sign-in data,
            profile, votes, bookmarks, followed threads, guide progress, notifications, notification
            settings, moderator applications, reputation and account restrictions. Your published
            threads and comments stay, so that answers others rely on and the replies to them still make
            sense, but they are no longer linked to you and show “Deleted user” instead of your name.
            Reports, update requests, feedback and moderation log entries are kept without the link to
            your account. If you also want posts removed, send us their links.
          </li>
          <li>
            <strong>Feedback</strong>: until we have dealt with it.
          </li>
          <li>
            <strong>Backups</strong>: we keep nightly encrypted copies of the database in a private
            Cloudflare R2 bucket in the EU, 7 daily and 4 weekly copies. Data you delete can therefore
            remain in these backups for up to 4 weeks, until the copy holding it is replaced.
          </li>
          <li>
            <strong>Server and sign-in logs</strong>: deleted automatically by Vercel and Supabase after
            their short retention periods.
          </li>
          <li>
            <strong>Local storage</strong>: until you clear it in your browser.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="rights" title="8. Your rights">
        <p>Under the GDPR you have the right to:</p>
        <LegalList>
          <li>access the data we hold about you (Art. 15),</li>
          <li>have incorrect data corrected (Art. 16),</li>
          <li>have your data deleted (Art. 17),</li>
          <li>restrict processing (Art. 18),</li>
          <li>receive your data in a machine-readable format (Art. 20),</li>
          <li>
            <strong>object</strong> at any time, on grounds relating to your situation, to processing
            based on legitimate interests (Art. 21).
          </li>
        </LegalList>
        <p>
          Most of this you can do yourself on your{" "}
          <Link href="/account" className={legalLinkClass}>
            account page
          </Link>
          : edit your profile, use “Download my data” for a copy of your data as a JSON file, or “Delete
          account”. For anything else, email <EmailLink />.
        </p>
      </LegalSection>

      <LegalSection id="complaints" title="9. Right to complain">
        <p>
          You can complain to any data protection supervisory authority, in particular the one where you
          live or work. The authority responsible for us is:
        </p>
        <address className="not-italic text-foreground">
          Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)
          <br />
          Promenade 18, 91522 Ansbach, Germany
          <br />
          Postal address: Postfach 1349, 91504 Ansbach
        </address>
        <p>
          <a href="https://www.lda.bayern.de/de/beschwerde.html" className={legalLinkClass}>
            Complaint form on lda.bayern.de
          </a>
        </p>
      </LegalSection>

      <LegalSection id="automated" title="10. No automated decisions">
        <p>
          We make no decisions about you based solely on automated processing, including profiling (Art.
          22 GDPR). Automatic rate limits only pause posting for a short while; moderation decisions
          are made by people.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes to this policy">
        <p>
          We update this policy when the forum or the services we use change. The date at the top shows
          the latest version.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
        <p>
          Questions about your data: <EmailLink />. See also our{" "}
          <Link href="/impressum" className={legalLinkClass}>
            Impressum
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
