-- Launch content reset (owner request, 2026-10-25): removes the pre-launch test threads,
-- announcements and guides, then publishes the verified starter threads and guides from
-- docs/content. Mirrors supabase/seed/cleanup_test_content.sql and initial_content.sql; on databases
-- without the owner account (local, CI) the content step is skipped.

create temp table cleanup_targets on commit drop as
with cutoff as (select timestamptz '2026-10-25 00:00:00+00' as at)
select 'thread'::text as kind, t.id
from public.threads t, cutoff where t.created_at < cutoff.at and t.title not in ('How do I register my address (Anmeldung) in Erlangen or Nuremberg?', 'How do I get or extend my student residence permit in Erlangen or Nuremberg?', 'How much money do I need in a blocked account (Sperrkonto) for a German student visa from Pakistan?', 'Which health insurance do I need to enrol at FAU: public or private?', 'Is there a semester ticket at FAU? How the discounted Deutschlandticket for students works', 'How much can non-EU students work in Germany (140 days rule), and what is a Werkstudent job?', 'How do I find a room in Erlangen or Nuremberg without getting scammed?', 'Do students have to pay the Rundfunkbeitrag (broadcasting fee)?')
union all
select 'announcement', a.id
from public.announcements a, cutoff where a.created_at < cutoff.at
union all
select 'guide', g.id
from public.guides g, cutoff where g.created_at < cutoff.at and g.slug not in ('first-weeks-in-erlangen', 'first-weeks-in-nuremberg');

-- Optional: also drop the moderation log entries about the deleted content. Must run before the
-- deletes, while thread_id still points at the threads.
-- delete from public.moderation_log l
-- using cleanup_targets c
-- where (c.kind = 'thread' and l.thread_id = c.id)
--    or (c.kind = 'announcement' and l.details ->> 'announcement_id' = c.id::text)
--    or (c.kind = 'guide' and l.details ->> 'guide_id' = c.id::text);

-- Guides first, so their steps are gone before the threads they link to.
delete from public.guides g
using cleanup_targets c
where c.kind = 'guide' and g.id = c.id;

delete from public.announcements a
using cleanup_targets c
where c.kind = 'announcement' and a.id = c.id;

delete from public.threads t
using cleanup_targets c
where c.kind = 'thread' and t.id = c.id;

-- The cascades already keep the cached totals in step with the ledger; recomputing them from the
-- ledger (same formula as reputation_events_apply) also repairs any earlier drift.
update public.profiles p
set reputation = r.reputation,
    best_answer_count = r.best_answer_count
from (
  select p2.id,
    coalesce(sum(e.points), 0)::int as reputation,
    coalesce(sum(case when e.reason = 'best_answer' then sign(e.points)::int else 0 end), 0)::int
      as best_answer_count
  from public.profiles p2
  left join public.reputation_events e on e.user_id = p2.id
  group by p2.id
) r
where r.id = p.id
  and (p.reputation, p.best_answer_count) is distinct from (r.reputation, r.best_answer_count);


do $seed$
declare
  author uuid;
  guide bigint;
begin
  select u.id into author
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower('mahadzx@gmail.com');

  if author is null then
    -- Fresh local or CI databases have no owner account: leave them without starter content.
    return;
  end if;

  insert into public.threads (title, body, category_id, city, author_id, status, reviewed_by, reviewed_at)
  select 'How do I register my address (Anmeldung) in Erlangen or Nuremberg?',
    $body$Everyone who moves into a flat or dorm room in Germany has to register the address with the city (Anmeldung). You need the registration confirmation for later steps such as the residence permit. Here is how it works in Erlangen and Nuremberg.

## The rule

- Register **within two weeks after moving in** (§ 17 Bundesmeldegesetz). In Nuremberg you can register at the earliest on the day you move in.
- Your landlord (or the dorm administration) must give you a **Wohnungsgeberbestätigung**, a written confirmation that you moved in (§ 19 Bundesmeldegesetz). If they refuse or are late, tell the registration office.
- A hostel or boarding house does not count. FAU points out that you can only register with a permanent address.
- Registration is **free** in both cities.

## Erlangen

1. Office: Bürgerservice (Meldewesen), ground floor of the Rathaus, Rathausplatz 1, 91052 Erlangen.
2. Book an appointment online (link below) and check the opening hours on the city page before you go.
3. Bring the documents listed below. The registration form (Meldeschein) is available at the office.
4. Online registration is currently only possible for German citizens and EU citizens with an eID card, so as a Pakistani citizen you register in person.

## Nuremberg

1. Offices: Bürgeramt Mitte (Äußere Laufer Gasse 25) plus the Bürgerämter Eberhardshof, Frankenstraße, Nord, Ost and Süd, and some Sparkasse branches.
2. You need an appointment. Bürgeramt Mitte also takes urgent cases without an appointment on Wednesdays from 8 to 12.
3. The online service requires a German ID card or an EU eID card, so plan to register in person.

## Documents you need

- Your passport (with visa)
- The Wohnungsgeberbestätigung from your landlord or dorm
- The signed registration form (Meldeschein), available at the office
- In Nuremberg, the city also lists birth or marriage certificates of everyone involved when moving to Nuremberg. Ask when you book if this applies to you.

## Common mistakes

- Waiting too long. Late registration is an administrative offence and can be fined.
- Moving in without asking the landlord for the Wohnungsgeberbestätigung. Ask for it when you sign the contract.
- Trying to register a hotel or short-term booking.
- Forgetting to deregister (Abmeldung) within two weeks when you leave Germany for good (§ 17 (2) Bundesmeldegesetz).

## Sources

- [Bundesmeldegesetz § 17 (deadline)](https://www.gesetze-im-internet.de/bmg/__17.html)
- [Bundesmeldegesetz § 19 (landlord confirmation)](https://www.gesetze-im-internet.de/bmg/__19.html)
- [City of Erlangen: Anmeldung](https://erlangen.de/service/365) and [appointment booking](https://erlangen.flexappoint.de/#/wizard/leistungen/4)
- [City of Nuremberg: Wohnungswechsel / Anmeldung](https://www.nuernberg.de/internet/stadtportal/behoerdenwegweiser/dienstleistung/wohnungswechsel.html)
- [FAU: Entry and visas (registering your address)](https://www.fau.eu/study/from-abroad/important-information/entry-and-visas/)

Last checked: October 2026
$body$,
    c.id, 'both'::public.city, author, 'published', author, now()
  from public.categories c
  where c.slug = 'accommodation'
    and not exists (select 1 from public.threads t where t.title = 'How do I register my address (Anmeldung) in Erlangen or Nuremberg?');

  insert into public.threads (title, body, category_id, city, author_id, status, reviewed_by, reviewed_at)
  select 'How do I get or extend my student residence permit in Erlangen or Nuremberg?',
    $body$Most Pakistani students enter Germany on a national (D) study visa. After arrival, the visa has to be converted into a residence permit for study purposes (§ 16b AufenthG) at the immigration office (Ausländerbehörde) of the place where you live. This is a summary of what the official pages say. For your individual case, the immigration office decides.

## Which office?

It depends on where you are registered, not where you study:

- **City of Erlangen:** Abteilung für Ausländerangelegenheiten und Einbürgerungen, Rathausplatz 1, 91052 Erlangen
- **District Erlangen-Höchstadt** (e.g. Herzogenaurach, Baiersdorf): the Landratsamt's immigration office, linked from FAU's page
- **City of Nuremberg:** Amt für Migration und Integration, Aufenthaltsbegleitung. Visitor address Regensburger Straße 231, 90478 Nuremberg. The city announces a move to **Stadthaus Q from Monday 30 November 2026**, so check the address before you go.

## Steps

1. Register your address (Anmeldung) and enrol at FAU first. You need the enrolment certificate and proof of health insurance.
2. Apply **well before your visa expires**. FAU recommends applying about three months before a visa or permit expires.
3. **Erlangen:** apply through the city's online contact form, by email or in person; the office then arranges the next step. The page lists phone numbers by the first letter of your family name.
4. **Nuremberg:** the residence permit can be applied for and extended online on nuernberg.de. The office contacts you by letter if an appointment is needed.
5. Go to the appointment with the original documents and pay the fee. Nuremberg accepts cash, Girocard, common debit and credit cards, Apple Pay and Google Pay.
6. For an extension, repeat the process with an updated enrolment certificate and proof of funds.

## How long and how much?

- The permit is usually granted for **two years**, and not less than one year; shorter if your programme ends sooner (§ 16b (2) AufenthG).
- Fees as of October 2026 (§ 45 AufenthV, also listed by Erlangen): **€100** for a new residence permit, **€93** for an extension of more than three months, **€96** for up to three months. Nuremberg says the fee is communicated during the application.

## Documents you need

- Passport with visa
- Current biometric photo
- Enrolment certificate (Immatrikulationsbescheinigung)
- Proof of health insurance (or exemption)
- Proof of funding, e.g. blocked account, scholarship or Verpflichtungserklärung
- Application form
- Nuremberg also lists your school-leaving or degree certificate and, if your programme requires it, proof of German skills

The offices say requirements can vary, so check the current list for your city.

## Common mistakes

- Waiting until the last weeks of your visa before applying.
- Applying in Erlangen while registered in Nuremberg (or the district), or the other way round.
- Bringing proof of funds that does not cover the coming period.
- Planning a trip home while your visa is about to expire and the application is still open. Ask the office before you book.

## Sources

- [City of Erlangen: residence permit for study](https://erlangen.de/service/210)
- [City of Nuremberg: Aufenthaltserlaubnis beantragen](https://www.nuernberg.de/internet/auslaenderbehoerde/dienstleistung/aufenthaltserlaubnis_beantragen.html)
- [City of Nuremberg: Aufenthaltstitel zum Studium](https://www.nuernberg.de/internet/auslaenderbehoerde/aufenthaltstitel_zum_studium.html)
- [FAU: Entry and visas](https://www.fau.eu/study/from-abroad/important-information/entry-and-visas/)
- [§ 16b AufenthG](https://www.gesetze-im-internet.de/aufenthg_2004/__16b.html), [§ 45 AufenthV (fees)](https://www.gesetze-im-internet.de/aufenthv/__45.html)

Last checked: October 2026
$body$,
    c.id, 'both'::public.city, author, 'published', author, now()
  from public.categories c
  where c.slug = 'rp-visa'
    and not exists (select 1 from public.threads t where t.title = 'How do I get or extend my student residence permit in Erlangen or Nuremberg?');

  insert into public.threads (title, body, category_id, city, author_id, status, reviewed_by, reviewed_at)
  select 'How much money do I need in a blocked account (Sperrkonto) for a German student visa from Pakistan?',
    $body$For a German study visa you have to show that you can pay your living costs. The most common way is a blocked account (Sperrkonto). Amounts change, so always check the embassy page on the day you transfer money.

## The amount (as of October 2026)

- The German Embassy Islamabad states **€992 per month, i.e. €11,904 per year**, as the amount to be paid into the blocked account when applying for a visa (page dated 27 November 2025).
- The Embassy and the Consulate General reserve the right to ask for a blocked amount covering **up to two years** in particular cases.
- The amount is based on the German student grant (BAföG) rates. If those rates change, the required amount can change too, so re-check before you transfer.

## How it works

1. Open a blocked account with a provider of your choice. The embassy requires that the provider gives the authorities a way to verify the account (for example a login code for authorities or a verification contact).
2. Transfer the full amount and get the confirmation for your visa application.
3. After arrival, activate the account with the provider and give them your German bank account for the payouts.
4. Each month only a fixed amount is released to you, so the money lasts for the whole period (Federal Foreign Office). With the standard amount this is about €992 a month; check your provider's terms for fees and the exact payout.
5. When you extend your residence permit, the immigration office asks again for proof of funds for the next period.

## Alternatives the embassy accepts

- **Verpflichtungserklärung** (formal obligation letter) from a sponsor living in Germany, signed at the sponsor's local immigration office. The sponsor has to prove sufficient income.
- **Scholarship:** the embassy states that a scholarship from a Pakistani university is not sufficient; only an **HEC** scholarship is accepted.

## Documents you need

- Passport (to open the account)
- The blocked account confirmation for the visa application
- After arrival: your German bank details for the monthly payouts

## Common mistakes

- Using an amount from an old blog post. Check the embassy page.
- Transferring from an account that is not in your name without checking the provider's rules.
- Not planning the first weeks: the rent deposit and first rent may be due before your first monthly payout.
- Assuming the blocked account covers the whole degree. Plan how you will prove funding for each extension.

## Sources

- [German Embassy Islamabad: blocked account amount](https://pakistan.diplo.de/pk-en/service/-/1995528)
- [Federal Foreign Office: Sperrkonto](https://www.auswaertiges-amt.de/de/sperrkonto/375488)
- [FAU: Entry and visas (proof of funding)](https://www.fau.eu/study/from-abroad/important-information/entry-and-visas/)

Last checked: October 2026
$body$,
    c.id, null, author, 'published', author, now()
  from public.categories c
  where c.slug = 'rp-visa'
    and not exists (select 1 from public.threads t where t.title = 'How much money do I need in a blocked account (Sperrkonto) for a German student visa from Pakistan?');

  insert into public.threads (title, body, category_id, city, author_id, status, reviewed_by, reviewed_at)
  select 'Which health insurance do I need to enrol at FAU: public or private?',
    $body$You cannot enrol at FAU without sorting out health insurance first. This summary covers the rules FAU and the law describe; the decision for your case is made by a German statutory insurer (gesetzliche Krankenkasse).

## The key rules

- **Enrolment needs an electronic notice.** FAU only enrols you once a German statutory insurer has sent the electronic insurance notice (M10) to the university. Paper letters and insurance cards are not accepted.
- **Private insurers do not take part** in this electronic procedure. Even with private insurance you need a statutory insurer to check your policy and send the notice of exemption.
- **Students are compulsorily insured** in statutory insurance up to the age of 30 (§ 5 (1) No. 9 SGB V). After 30, student insurance only continues if the type of education or family or personal reasons justify it.
- **Exemption is possible** (for example with private or recognised foreign insurance), but you must apply within **three months** after compulsory insurance begins, and the exemption **cannot be revoked** (§ 8 SGB V). It stays in place for your studies.

## Steps

1. Before enrolment, contact a German statutory insurer of your choice.
2. If you come from a country without a social security agreement with Germany, the insurer first checks whether your home cover is recognised. If it is not, you need German statutory or private insurance.
3. If you choose statutory insurance, the insurer sends the M10 notice to FAU (takes a few working days).
4. If you want private insurance, have a statutory insurer check the policy **before you sign** it; some policies do not meet the requirements.
5. Enrol at FAU, then use your insurance proof for the residence permit.

## What it costs (as of January 2026)

Statutory student insurance:

- Health insurance: **€87.38 per month**, plus the insurer's own additional contribution (Zusatzbeitrag), which differs between insurers.
- Long-term care insurance: **€35.91** per month if you are 23 or older without children, **€30.78** if you are under 23 or have one child.

Your monthly total is the sum of these plus the insurer's Zusatzbeitrag, so compare insurers before choosing.

## Documents to have ready

- Passport
- FAU admission letter
- Details of any existing (foreign or private) insurance policy, if you want an exemption checked

## Common mistakes

- Buying a cheap private policy online before a statutory insurer has checked it.
- Choosing exemption without thinking long-term: it cannot be revoked during your studies.
- Missing payments. The insurer reports contribution arrears to FAU, and re-enrolment is blocked until they are cleared.
- Changing insurer and forgetting that the new one has to send a new notice to FAU.

## Sources

- [FAU: Krankenversicherung (health insurance and enrolment)](https://fau.de/education/studentisches-leben/krankenversicherung)
- [§ 5 SGB V (compulsory insurance, age 30)](https://www.gesetze-im-internet.de/sgb_5/__5.html)
- [§ 8 SGB V (exemption, three months, irrevocable)](https://www.gesetze-im-internet.de/sgb_5/__8.html)
- [AOK: student contributions 2026](https://www.aok.de/pp/rechengroessen/kostenueberblick-studentischen-krankenversicherung/)

Last checked: October 2026
$body$,
    c.id, null, author, 'published', author, now()
  from public.categories c
  where c.slug = 'first-steps'
    and not exists (select 1 from public.threads t where t.title = 'Which health insurance do I need to enrol at FAU: public or private?');

  insert into public.threads (title, body, category_id, city, author_id, status, reviewed_by, reviewed_at)
  select 'Is there a semester ticket at FAU? How the discounted Deutschlandticket for students works',
    $body$Short answer: **FAU has no semester ticket any more.** Since the winter semester 2023/24, FAU students instead have the option to buy a discounted Deutschlandticket. It is not included in the semester fee, so you decide yourself whether you want it.

## What you get (as of October 2026)

- **Price: €43 per month** for students (FAU, March 2026). VGN lists it as €20 cheaper than the regular Deutschlandticket.
- **Who:** all students in Bavaria are eligible.
- **Where:** public local and regional transport throughout Germany: S-Bahn, U-Bahn, regional trains, trams and buses. So Erlangen–Nuremberg by regional train or S-Bahn is covered.
- **Not covered** (VGN): long-distance trains (IC, ICE, EC), FlixTrain, FlixBus and tourist or historic trains. Outside the VGN area it is valid in 2nd class.
- **Extras listed by FAU:** 600 free minutes on VAG_Rad bikes and 15 free minutes on VOI e-scooters.
- It is a **monthly subscription that can be cancelled monthly**.

## Steps

1. Enrol at FAU first; the discount is for students.
2. Order the ticket online in the VGN shop (shop.vgn.de/meinabo).
3. Install the **VGN "Fahrplan und Tickets"** app or the **NürnbergMOBIL** app and show the ticket there.
4. Keep proof of your student status valid each semester (re-register on time).
5. Cancel in the shop if you leave or no longer need it.

## The semester fee is separate

FAU's re-registration notice for the winter semester 2026/27 states a semester fee of **€82**. It does not contain a ticket, so the €43 per month is extra if you want the Deutschlandticket.

## Documents you need

- Your FAU student details for the discount (enrolment)
- A payment method accepted by the VGN shop
- A smartphone with the VGN or NürnbergMOBIL app

## Common mistakes

- Expecting a ticket to be included in the semester fee because other universities have one. At FAU it is optional and separate.
- Taking an ICE or IC between cities with the Deutschlandticket. You need a separate ticket for long-distance trains.
- Forgetting to cancel the subscription when you leave Germany.
- Mixing up the student price with the regular Deutschlandticket price.

## Sources

- [FAU: discounted Deutschlandticket for students (March 2026)](https://www.fau.eu/2026/03/news/study/deutschlandticket-ermaessigt-fuer-studierende/)
- [FAU: Instead of the semester ticket](https://www.fau.eu/education/student-life/semester-ticket/)
- [FAU: Re-registering (semester fee)](https://www.fau.eu/2026/07/news/study/re-registering/)
- [VGN: Deutschlandticket (validity and prices)](https://www.vgn.de/tickets/deutschlandticket/)

Last checked: October 2026
$body$,
    c.id, 'both'::public.city, author, 'published', author, now()
  from public.categories c
  where c.slug = 'first-steps'
    and not exists (select 1 from public.threads t where t.title = 'Is there a semester ticket at FAU? How the discounted Deutschlandticket for students works');

  insert into public.threads (title, body, category_id, city, author_id, status, reviewed_by, reviewed_at)
  select 'How much can non-EU students work in Germany (140 days rule), and what is a Werkstudent job?',
    $body$Many of us want to work next to our studies. As a non-EU student on a study residence permit (§ 16b AufenthG) you may work, but only within a yearly limit. This is a summary of the law and FAU's guidance; for your own case ask the immigration office or FAU's International Office.

## The 140-day rule

- Your permit allows employment of up to **140 working days per year** (§ 16b (3) AufenthG). FAU describes this as **140 full days or 280 half days**.
- A day with **up to four hours** of work counts as a **half day**; longer days count as full days.
- For part-time jobs there is a second way of counting: a whole calendar week counts as **2.5 working days**, during the lecture period if you work **up to 20 hours that week**, and during the semester break regardless of the hours. Whichever method is better for you is applied, week by week.
- **Student assistant jobs** (studentische Nebentätigkeit, e.g. HiWi jobs at the university) are **not counted** towards the 140 days.
- A **compulsory internship** that is part of your study regulations belongs to the purpose of study and does not count. FAU notes that voluntary internships count as normal work, paid or unpaid.
- The permit covers employment only. Ask the immigration office **before** any freelance or self-employed work.

## Werkstudent basics

- A Werkstudent is an enrolled student employed alongside their studies.
- If you work **no more than 20 hours per week** during the semester, you are exempt from health, long-term care and unemployment insurance contributions on that job (Deutsche Rentenversicherung). Jobs only during the semester break are exempt regardless of hours. Ask your employer how pension insurance applies.
- Remember: the social insurance rule and the 140-day rule are separate. Count your days for both.

## Useful numbers (as of January 2026)

- Statutory minimum wage: **€13.90 per hour**.
- Minijob earnings limit: **€603 per month**.

## Steps

1. Keep your own log of working days (date, hours) from your first job on.
2. Check whether a job is a university student assistant job; it does not count.
3. Before starting, have your Anmeldung done; your tax ID (Steuer-ID) is sent by letter and your employer needs it.
4. Get a written contract that states hours and pay.
5. If unsure whether a job fits your permit, ask the immigration office before you start.

## Documents you need

- Residence permit (check the work note on it)
- Enrolment certificate
- Tax ID, bank account, health insurance details

## Common mistakes

- Thinking "20 hours a week" is a separate unlimited allowance. Those weeks still use 2.5 of your 140 days.
- Not counting voluntary internships.
- Starting freelance work (e.g. online gigs for German clients) without asking.
- Relying on old figures (120/240 days, old minijob limits) from outdated pages.

## Sources

- [§ 16b AufenthG](https://www.gesetze-im-internet.de/aufenthg_2004/__16b.html)
- [FAU: Employment and internships during your studies](https://www.fau.eu/studying/international-students/everything-you-need-to-know-about-coming-to-fau/employment-and-internships-during-your-studies/)
- [Deutsche Rentenversicherung: Werkstudentenprivileg](https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/W/werkstudentenprivileg.html)
- [Deutsche Rentenversicherung: minimum wage and minijob limit 2026](https://www.deutsche-rentenversicherung.de/BadenWuerttemberg/DE/Presse/Pressemitteilungen/2025/251222_Minijob.html)
- [BZSt: tax identification number](https://www.bzst.de/DE/Privatpersonen/SteuerlicheIdentifikationsnummer/steuerlicheidentifikationsnummer_node.html)

Last checked: October 2026
$body$,
    c.id, null, author, 'published', author, now()
  from public.categories c
  where c.slug = 'jobs'
    and not exists (select 1 from public.threads t where t.title = 'How much can non-EU students work in Germany (140 days rule), and what is a Werkstudent job?');

  insert into public.threads (title, body, category_id, city, author_id, status, reviewed_by, reviewed_at)
  select 'How do I find a room in Erlangen or Nuremberg without getting scammed?',
    $body$Finding a room is often the hardest part of moving to Erlangen or Nuremberg. The Studierendenwerk (Student Services) itself says the search is regularly most difficult in the weeks before the winter semester. Start early and keep several options open.

## Where to look

1. **Studierendenwerk Erlangen-Nürnberg dorms.** It offers a little over 4,000 places of its own (single rooms, shared flats, apartments, family flats). Applications are **online only** through its housing portal. FAU says there is no guarantee of a place.
2. **Studierendenwerk private room service.** Free placement of offers from the private market in Erlangen and Nuremberg (Privatzimmervermittlung).
3. **Other dorms and private offers.** Ask the Studierendenwerk's housing team; they pass on contacts for other subsidised dorms.

## Dorm contracts (Studierendenwerk)

- First-time tenants who are new Bachelor or Staatsexamen students can get a contract for **six semesters**. The page does not state a first-contract length for Master's students, so ask the WohnService.
- Follow-on contracts are limited, and the request has to reach the WohnService **at least four months** before your contract ends.
- Students coming for up to 12 months (exchange) are admitted through a list from their university, with separate conditions.

## Deposit (Kaution)

- The deposit may be **at most three months' rent** (without operating costs), § 551 BGB.
- You may pay a cash deposit in **three monthly instalments**, the first at the start of the lease.

## Scam warning signs

The Verbraucherzentrale lists these signs of fake flat ads:

- The "landlord" is abroad and wants money (deposit, fee) **before a viewing** or offers to send the key.
- The rent is far below normal prices.
- No full name or address of the landlord; photos look like stock images; the same text appears on several portals.
- Payment or key handover "through" Airbnb, eBay or booking.com, or a foreign bank account.
- A request for a copy of your passport or ID before anything is signed.

Pay the deposit only **after** a contract is signed. If you have been scammed, ask your bank to reverse the transfer, report it to the police (online is possible) and to the portal.

## Documents to have ready

- Passport
- FAU admission letter or enrolment certificate
- Proof of funding (blocked account confirmation, scholarship), in case a landlord asks
- For the Anmeldung afterwards: the landlord's confirmation (Wohnungsgeberbestätigung)

## Common mistakes

- Waiting for the final admission letter before starting the search.
- Sending money or ID copies to someone you have never met for a flat you have not seen.
- Signing without reading which costs are included (heating, electricity, internet).
- Forgetting that a hostel or short-term booking cannot be used for the Anmeldung.

## Sources

- [Studierendenwerk Erlangen-Nürnberg: Wohnen](https://www.werkswelt.de/index.php?id=wohnen) and [online application](https://tl1host.eu/SWER/#home)
- [Studierendenwerk: Wohndauer (contract length)](https://www.werkswelt.de/index.php?id=wohndauer)
- [FAU: Applying for a place in student accommodation](https://www.fau.eu/glossary/applying-for-a-place-in-student-accommodation/)
- [Verbraucherzentrale: Fake flats on the internet](https://www.verbraucherzentrale.de/wissen/vertraege-reklamation/abzocke/fakewohnungen-im-internet-so-erkennen-sie-falsche-immobilienanzeigen-27576)
- [§ 551 BGB (deposit)](https://www.gesetze-im-internet.de/bgb/__551.html)

Last checked: October 2026
$body$,
    c.id, 'both'::public.city, author, 'published', author, now()
  from public.categories c
  where c.slug = 'accommodation'
    and not exists (select 1 from public.threads t where t.title = 'How do I find a room in Erlangen or Nuremberg without getting scammed?');

  insert into public.threads (title, body, category_id, city, author_id, status, reviewed_by, reviewed_at)
  select 'Do students have to pay the Rundfunkbeitrag (broadcasting fee)?',
    $body$If you get a letter from the "ARD ZDF Deutschlandradio Beitragsservice", it is about the Rundfunkbeitrag, the public broadcasting fee. It is a real, official contribution, and it applies to students too.

## The basics (as of October 2026)

- **€18.36 per month per dwelling** (€220.32 per year), no matter how many people live there or whether you own a TV or radio.
- It is charged **per dwelling, not per person.**

## Shared flat or dorm?

- **Shared flat (WG):** only **one adult per flat** has to be registered and pay. Agree among yourselves who registers and share the cost. Flatmates who are already registered can then deregister (online form on rundfunkbeitrag.de).
- **Student dorm:** a room that opens onto a **generally accessible corridor** counts as its own dwelling, even with its own bathroom or kitchen, so **each room pays** the full fee.
- **Dorm flat behind its own front door,** used like a WG: the shared-flat rule applies (one payment per flat).

## Steps

1. Check whether your flat already has a contribution account (ask your flatmates).
2. If not, register the flat online at rundfunkbeitrag.de.
3. Keep the contribution number (Beitragsnummer) from the confirmation letter; you need it for any change.
4. If someone else in the flat already pays, do not register a second account; answer the letter and say the flat is already registered. Ask the paying flatmate for the details the Beitragsservice asks for.
5. When you move out or leave Germany, use the deregistration form on rundfunkbeitrag.de.

## Exemption

- Students who **receive BAföG** and do not live with their parents can apply for exemption. It also covers a spouse or registered partner, but not flatmates.
- Most international students do not receive BAföG. The Beitragsservice states that a **hardship exemption is usually not possible** for international students, because they had to prove sufficient funds for their residence permit.
- Exemption is never automatic: you apply with the official form and proof.

## Documents you need

- Your address and move-in date
- For a WG: the details of the flatmate who already pays
- For an exemption: the official application form and your BAföG notice

## Common mistakes

- Ignoring the letters. Unpaid contributions keep adding up.
- Two or three flatmates each paying for the same flat.
- Assuming a dorm room is always shared with others: rooms off a common corridor pay individually.
- Forgetting to deregister when leaving.

## Sources

- [Rundfunkbeitrag: information for students](https://www.rundfunkbeitrag.de/buergerinnen-und-buerger/informationen/informationen-fuer-studierende)
- [Rundfunkbeitrag: forms (registration, exemption)](https://www.rundfunkbeitrag.de/buergerinnen_und_buerger/formulare/index_ger.html)

Last checked: October 2026
$body$,
    c.id, null, author, 'published', author, now()
  from public.categories c
  where c.slug = 'other'
    and not exists (select 1 from public.threads t where t.title = 'Do students have to pay the Rundfunkbeitrag (broadcasting fee)?');

  if not exists (select 1 from public.guides where slug = 'first-weeks-in-erlangen') then
    insert into public.guides (slug, title, summary, is_featured, sort_order, created_by)
    values ('first-weeks-in-erlangen', 'First weeks in Erlangen', 'The paperwork for your first weeks as a non-EU student living in Erlangen, in a sensible order, with a thread for each step.', true, 10, author)
    returning id into guide;

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 1, 'Find a room and get the landlord''s confirmation', $step$Apply online to the Studierendenwerk early and keep other options open. Never pay before you have seen the room and signed a contract. When you move in, ask for the Wohnungsgeberbestätigung; you need it for the next step.$step$,
      (select t.id from public.threads t where t.title = 'How do I find a room in Erlangen or Nuremberg without getting scammed?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 2, 'Register your address within two weeks', $step$Erlangen's Bürgerservice is on the ground floor of the Rathaus (Rathausplatz 1). Book an appointment online, bring your passport and the landlord's confirmation. Registration is free.$step$,
      (select t.id from public.threads t where t.title = 'How do I register my address (Anmeldung) in Erlangen or Nuremberg?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 3, 'Sort out health insurance, then enrol', $step$FAU enrols you only after a German statutory insurer has sent the electronic notice. If you want private insurance, have a statutory insurer check it before you sign.$step$,
      (select t.id from public.threads t where t.title = 'Which health insurance do I need to enrol at FAU: public or private?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 4, 'Activate your blocked account', $step$Activate the account with your provider so the monthly payouts start. Plan how you will pay the first rent and the deposit until the payouts arrive.$step$,
      (select t.id from public.threads t where t.title = 'How much money do I need in a blocked account (Sperrkonto) for a German student visa from Pakistan?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 5, 'Apply for your residence permit', $step$If you live in the city of Erlangen, apply at the Ausländerbehörde in the Rathaus well before your visa expires (online contact form, email or in person). If you live in the district Erlangen-Höchstadt, the Landratsamt is responsible.$step$,
      (select t.id from public.threads t where t.title = 'How do I get or extend my student residence permit in Erlangen or Nuremberg?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 6, 'Get the discounted Deutschlandticket', $step$There is no semester ticket at FAU. Students in Bavaria can subscribe to a discounted Deutschlandticket in the VGN shop.$step$,
      (select t.id from public.threads t where t.title = 'Is there a semester ticket at FAU? How the discounted Deutschlandticket for students works' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 7, 'Sort out the broadcasting fee', $step$One payment per flat; dorm rooms off a common corridor pay individually. Check with your flatmates before registering.$step$,
      (select t.id from public.threads t where t.title = 'Do students have to pay the Rundfunkbeitrag (broadcasting fee)?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 8, 'Before your first job: know the 140-day rule', $step$Keep a log of your working days from day one. University student assistant jobs do not count towards the 140 days.$step$,
      (select t.id from public.threads t where t.title = 'How much can non-EU students work in Germany (140 days rule), and what is a Werkstudent job?' order by t.id limit 1));
  end if;

  if not exists (select 1 from public.guides where slug = 'first-weeks-in-nuremberg') then
    insert into public.guides (slug, title, summary, is_featured, sort_order, created_by)
    values ('first-weeks-in-nuremberg', 'First weeks in Nuremberg', 'The paperwork for your first weeks as a non-EU FAU student living in Nuremberg, in a sensible order, with a thread for each step.', true, 20, author)
    returning id into guide;

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 1, 'Find a room and get the landlord''s confirmation', $step$Apply online to the Studierendenwerk early and look at its free private room service for Nuremberg. Never pay before you have seen the room and signed a contract. When you move in, ask for the Wohnungsgeberbestätigung.$step$,
      (select t.id from public.threads t where t.title = 'How do I find a room in Erlangen or Nuremberg without getting scammed?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 2, 'Book a Bürgeramt appointment and register', $step$Nuremberg's Bürgerämter work with appointments (Bürgeramt Mitte also takes urgent cases on Wednesday mornings without one). Register within two weeks of moving in. Registration is free.$step$,
      (select t.id from public.threads t where t.title = 'How do I register my address (Anmeldung) in Erlangen or Nuremberg?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 3, 'Sort out health insurance, then enrol', $step$FAU enrols you only after a German statutory insurer has sent the electronic notice. If you want private insurance, have a statutory insurer check it before you sign.$step$,
      (select t.id from public.threads t where t.title = 'Which health insurance do I need to enrol at FAU: public or private?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 4, 'Activate your blocked account', $step$Activate the account with your provider so the monthly payouts start. Plan how you will pay the first rent and the deposit until the payouts arrive.$step$,
      (select t.id from public.threads t where t.title = 'How much money do I need in a blocked account (Sperrkonto) for a German student visa from Pakistan?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 5, 'Apply for your residence permit online', $step$Nuremberg's Amt für Migration und Integration accepts residence permit applications and extensions online and contacts you by letter. The office moves to Stadthaus Q from 30 November 2026, so check the address on your letter.$step$,
      (select t.id from public.threads t where t.title = 'How do I get or extend my student residence permit in Erlangen or Nuremberg?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 6, 'Get the discounted Deutschlandticket', $step$There is no semester ticket at FAU. Students in Bavaria can subscribe to a discounted Deutschlandticket in the VGN shop and use it in the VGN or NürnbergMOBIL app.$step$,
      (select t.id from public.threads t where t.title = 'Is there a semester ticket at FAU? How the discounted Deutschlandticket for students works' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 7, 'Sort out the broadcasting fee', $step$One payment per flat; dorm rooms off a common corridor pay individually. Check with your flatmates before registering.$step$,
      (select t.id from public.threads t where t.title = 'Do students have to pay the Rundfunkbeitrag (broadcasting fee)?' order by t.id limit 1));

    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, 8, 'Before your first job: know the 140-day rule', $step$Keep a log of your working days from day one. University student assistant jobs do not count towards the 140 days.$step$,
      (select t.id from public.threads t where t.title = 'How much can non-EU students work in Germany (140 days rule), and what is a Werkstudent job?' order by t.id limit 1));
  end if;
end
$seed$;
