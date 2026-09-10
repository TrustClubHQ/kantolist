import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = { title: 'Terms' }

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <h1 className="font-display m-0 text-[34px] uppercase leading-none">Terms of use</h1>
        <div className="mt-4 flex flex-col gap-4 text-[14px] leading-relaxed text-body">
          <p className="m-0">
            KantoList is a listings board. It shows what members post and helps a buyer reach a
            seller. It is not a party to anything you agree with another member.
          </p>
          <Section title="What we do not do">
            We do not take payment, hold money in escrow, arrange delivery, inspect goods, or
            guarantee that anything listed exists or is as described. Every transaction is between
            the two people involved.
          </Section>
          <Section title="Trust points">
            Trust points come from TrustClub and describe how the people you trust relate to another
            member. They are a signal, not a warranty, and a high number is never a reason to skip
            inspecting what you are buying.
          </Section>
          <Section title="What you may post">
            Post only what you may lawfully sell, rent out, or offer. Weapons, prescription
            medicines, wildlife protected by law, counterfeit goods and adult services are not
            allowed. Staff may remove any listing and may block an account.
          </Section>
          <Section title="Your account">
            Your account is your TrustClub identity. Keep it to yourself — anything posted through
            it is treated as yours.
          </Section>
          <p className="m-0 text-muted">
            [PLACEHOLDER — this page needs review by counsel before launch, including governing law,
            liability limits and the dispute process.]
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
