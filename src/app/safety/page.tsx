import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Plate, SafetyNote } from '@/components/ui'

export const metadata = { title: 'Safety tips' }

const TIPS = [
  {
    title: 'Meet in a public place',
    body: 'A market, a plaza, a busy street corner in daylight. Bring someone with you if the amount is large.',
  },
  {
    title: 'Inspect before you pay',
    body: 'Start the engine. Check the papers against the unit. Count what is in the box. Pay only once you have seen it.',
  },
  {
    title: 'Be careful with deposits',
    body: 'A deposit sent before you meet is the most common way people lose money here. Anyone who insists on one before you have seen the item deserves your suspicion.',
  },
  {
    title: 'Check the trust path',
    body: 'The badge on every listing shows how strongly your own TrustClub network vouches for that member. "No trust path" is not proof of anything bad — it means you have no way to check, so take more care.',
  },
  {
    title: 'Keep the conversation where you can see it',
    body: 'KantoList does not carry your messages. Agreements made by call or chat are between you and the other person.',
  },
  {
    title: 'Report what looks wrong',
    body: 'Every listing has a report link. Staff read the queue and can remove a listing.',
  },
]

export default function SafetyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <h1 className="font-display m-0 text-[34px] uppercase leading-none">Staying safe</h1>
        <p className="mt-2 text-[15px] font-semibold leading-snug text-muted-2">
          KantoList is a place to find people, not a place to pay them. The transaction is between
          you and the other person, so these are worth reading once.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          {TIPS.map((t) => (
            <Plate key={t.title} className="p-3.5">
              <h2 className="font-display m-0 text-[20px] uppercase">{t.title}</h2>
              <p className="m-0 mt-1.5 text-[14px] leading-relaxed text-body">{t.body}</p>
            </Plate>
          ))}
        </div>

        <div className="mt-5">
          <SafetyNote>
            KantoList never asks for your password, your PIN, or an OTP. Nobody from KantoList will
            message you asking to move a deal off the platform or to send money.
          </SafetyNote>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
