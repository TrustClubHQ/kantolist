import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = { title: 'Privacy' }

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
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
            Deleting a listing removes it and its contact records. To remove your account, contact
            staff.
          </Section>
          <p className="m-0 text-muted">
            [PLACEHOLDER — this page needs review against the Data Privacy Act before launch,
            including retention periods and the contact details of the data protection officer.]
          </p>
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
