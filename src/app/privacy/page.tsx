import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getT, getLanguage } from '@/lib/i18n-server'
import { SUPPORT_EMAIL } from '@/lib/contact'
import { translatedTitle } from '@/lib/page-title'

export const generateMetadata = translatedTitle('title.privacy')

/* NOTE FOR THE TEAM: this page still needs review against the Data Privacy Act
   before launch — retention periods and the data protection officer's details
   in particular. That note used to be printed on the page itself, where
   visitors read it as part of the policy.

   The legal text itself stays in English: a translated version would be a
   second set of terms, and which one governs is not a question a listings
   board should be asking. The page says so in the reader's language. */
export default async function PrivacyPage() {
  const [t, language] = await Promise.all([getT(), getLanguage()])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        {language === 'en' ? null : (
          <p className="label m-0 mb-3 border-[2.5px] border-dim-edge bg-dim px-3 py-2 text-[15px] text-muted">
            {t('legal.englishOnly')}
          </p>
        )}
        <h1 className="font-display m-0 text-[34px] uppercase leading-none">Privacy</h1>
        <div className="mt-4 flex flex-col gap-4 text-[14px] leading-relaxed text-body">
          <Section title="What we hold">
            Your TrustClub id, the display name and contact details you enter, your listings, and a
            record of which contact channel was tapped on a listing and when.
          </Section>
          <Section title="What we never hold">
            The messages and calls themselves. When you tap Call or Messenger, the conversation
            happens in your own phone or app — KantoList records only that a contact happened, so a
            seller can see interest and staff can spot abuse.
          </Section>
          <Section title="Your phone number">
            It is shown in full only to members who are logged in. Anonymous visitors see a masked
            form. This is deliberate: it makes harvesting numbers from listings much harder.
          </Section>
          <Section title="Trust lookups">
            To rank listings we ask TrustClub how your account relates to a poster&apos;s account, and
            cache the answer briefly. We send the two ids and nothing about what you were browsing.
          </Section>
          <Section title="Deleting things">
            Deleting a listing removes it, its photos and its contact records, and it cannot be
            undone. To remove your account, email {SUPPORT_EMAIL}.
          </Section>
          <Section title="Reaching us">
            Questions about any of this, or a request to remove your account, go to{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display m-0 text-[20px] uppercase">{title}</h2>
      <p className="m-0 mt-1.5">{children}</p>
    </section>
  )
}
