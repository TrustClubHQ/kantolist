'use client'

import { useState } from 'react'
import { Plate, PlateHeader } from '@/components/ui'
import { TrustClubLink } from '@/components/TrustPoints'
import { useT } from '@/components/LanguageProvider'

interface AccountForm {
  trustclubId: string
  displayName: string
  phone: string
  phoneVerified: boolean
  facebookUrl: string
  viberNumber: string
  municipalityId: string
}

export function ProfileForm({
  account,
  municipalities,
}: {
  account: AccountForm
  municipalities: { id: string; name: string; province: string }[]
}) {
  const t = useT()
  const [form, setForm] = useState(account)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  function set<K extends keyof AccountForm>(key: K, value: AccountForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName,
          phone: form.phone || null,
          facebookUrl: form.facebookUrl || null,
          viberNumber: form.viberNumber || null,
          municipalityId: form.municipalityId || null,
        }),
      })
      const data: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ kind: 'error', text: data.error ?? t('profile.failed') })
        return
      }
      setMessage({ kind: 'ok', text: t('profile.saved') })
    } catch {
      setMessage({ kind: 'error', text: t('profile.offline') })
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-2xl px-4 py-5">
      <h1 className="font-display m-0 text-[30px] uppercase leading-none">{t('profile.title')}</h1>
      <div className="mt-2">
        <TrustClubLink trustclubId={form.trustclubId} />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <Plate>
          <PlateHeader>{t('profile.section.who')}</PlateHeader>
          <div className="flex flex-col gap-3.5 p-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">{t('profile.name')}</span>
              <input
                value={form.displayName}
                onChange={(e) => set('displayName', e.target.value)}
                maxLength={80}
                required
                placeholder={t('profile.namePlaceholder')}
              />
            </label>
            {/* Hidden entirely while we are in one town — asking a member to
                pick their town from a list of one is a question with no
                content. Their listings carry the town regardless. */}
            {municipalities.length > 1 ? (
              <label className="flex flex-col gap-1.5">
                <span className="label text-[15px] text-muted">{t('profile.town')}</span>
                <select value={form.municipalityId} onChange={(e) => set('municipalityId', e.target.value)}>
                  <option value="">{t('profile.townNotSet')}</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}, {m.province}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </Plate>

        <Plate>
          <PlateHeader right={form.phoneVerified ? t('profile.phoneVerified') : undefined}>
            {t('profile.section.reach')}
          </PlateHeader>
          <div className="flex flex-col gap-3.5 p-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">{t('profile.phone')}</span>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                inputMode="tel"
                placeholder={t('profile.phonePlaceholder')}
              />
              <span className="text-xs font-semibold text-muted">{t('profile.phoneHelp')}</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">{t('profile.viber')}</span>
              <input
                value={form.viberNumber}
                onChange={(e) => set('viberNumber', e.target.value)}
                inputMode="tel"
                placeholder={t('profile.phonePlaceholder')}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">{t('profile.facebook')}</span>
              <input
                value={form.facebookUrl}
                onChange={(e) => set('facebookUrl', e.target.value)}
                inputMode="url"
                placeholder={t('profile.facebookPlaceholder')}
              />
            </label>
          </div>
        </Plate>

        {message ? (
          <p
            className={`label m-0 border-[3px] border-ink px-3.5 py-2.5 text-[17px] ${
              message.kind === 'ok' ? 'bg-green text-ground' : 'bg-yellow text-ink'
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={signOut}
            className="label min-h-[54px] w-[130px] border-[3px] border-ink bg-panel text-[18px]"
          >
            {t('profile.logOut')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="font-display hard min-h-[54px] flex-1 border-[3px] border-ink bg-red text-[21px] uppercase text-ground disabled:opacity-60"
          >
            {busy ? t('profile.saving') : t('profile.save')}
          </button>
        </div>
      </div>
    </form>
  )
}
