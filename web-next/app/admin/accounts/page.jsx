'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../../components/layout/AppShell'
import { apiFetch } from '../../../lib/api'
import { clearAuth, getAuthToken } from '../../../lib/auth'

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://envidicy-dash-client.onrender.com').replace(/\/$/, '')

function authHeaders() {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatMoney(value) {
  const num = Number(value || 0)
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatLiveBillingCell(liveBilling, fallbackCurrency) {
  if (!liveBilling) return '—'
  if (liveBilling.error) return 'Ошибка API'
  const currency = liveBilling.currency || fallbackCurrency || ''
  const spend = liveBilling.spend
  const limit = liveBilling.limit
  if (spend == null && limit == null) return 'Нет данных'
  if (spend != null && limit != null) return `${formatMoney(spend)} / ${formatMoney(limit)} ${currency}`
  if (spend != null) return `${formatMoney(spend)} ${currency}`
  return `${formatMoney(limit)} ${currency}`
}

function defaultCurrencyForPlatform(platform) {
  if (platform === 'yandex') return 'KZT'
  if (platform === 'telegram') return 'EUR'
  return 'USD'
}

function fundingSourceLabel(value) {
  if (value === 'topup') return 'Topup'
  if (value === 'admin_manual') return 'Ручное'
  if (value === 'admin_reversal') return 'Отмена'
  return value || '—'
}

export default function AdminAccountsPage() {
  const router = useRouter()
  const [rows, setRows] = useState([])
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('Загрузка аккаунтов...')
  const [bindStatus, setBindStatus] = useState('')
  const [fundingStatus, setFundingStatus] = useState('')
  const [fundingEvents, setFundingEvents] = useState([])
  const [fundingLoading, setFundingLoading] = useState(false)

  const [form, setForm] = useState({
    id: '',
    user_id: '',
    platform: 'meta',
    name: '',
    external_id: '',
    account_code: '',
    currency: 'USD',
    status: '',
  })
  const [fundingForm, setFundingForm] = useState({
    account_id: '',
    amount: '',
    currency: 'USD',
    occurred_at: '',
    note: '',
  })

  async function safeFetch(path, options = {}) {
    const res = await apiFetch(path, { ...options, headers: { ...(options.headers || {}), ...authHeaders() } })
    if (res.status === 401) {
      clearAuth()
      router.push('/login')
      throw new Error('Unauthorized')
    }
    if (res.status === 403) throw new Error('Нет доступа к админке.')
    return res
  }

  async function fetchAccounts() {
    try {
      const res = await safeFetch('/admin/accounts')
      if (!res.ok) throw new Error('Ошибка загрузки аккаунтов.')
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
      setStatus('')
    } catch (e) {
      setStatus(e?.message || 'Ошибка загрузки аккаунтов.')
    }
  }

  async function fetchUsers() {
    try {
      const [clientsRes, usersRes] = await Promise.all([safeFetch('/admin/clients'), safeFetch('/admin/users')])
      if (!clientsRes.ok || !usersRes.ok) throw new Error('Ошибка загрузки клиентов.')
      const [clients, usersRaw] = await Promise.all([clientsRes.json(), usersRes.json()])
      const merged = [...(Array.isArray(clients) ? clients : []), ...(Array.isArray(usersRaw) ? usersRaw : [])]
      const unique = new Map()
      merged.forEach((row) => {
        if (row?.id != null && row?.email) unique.set(String(row.id), { id: row.id, email: row.email })
      })
      const out = Array.from(unique.values()).sort((a, b) => String(a.email).localeCompare(String(b.email), 'ru'))
      setUsers(out)
      if (!form.user_id && out.length) setForm((s) => ({ ...s, user_id: String(out[0].id) }))
    } catch (e) {
      setBindStatus(e?.message || 'Ошибка загрузки клиентов.')
    }
  }

  async function loadFundingEvents(accountId) {
    if (!accountId) {
      setFundingEvents([])
      return
    }
    setFundingLoading(true)
    setFundingStatus('Загрузка истории пополнений...')
    try {
      const res = await safeFetch(`/admin/accounts/${accountId}/funding-events`)
      if (!res.ok) throw new Error('Не удалось загрузить историю пополнений.')
      const data = await res.json()
      setFundingEvents(Array.isArray(data) ? data : [])
      setFundingStatus('')
    } catch (e) {
      setFundingEvents([])
      setFundingStatus(e?.message || 'Не удалось загрузить историю пополнений.')
    } finally {
      setFundingLoading(false)
    }
  }

  function resetForm() {
    setForm((s) => ({
      ...s,
      id: '',
      platform: 'meta',
      name: '',
      external_id: '',
      account_code: '',
      currency: defaultCurrencyForPlatform('meta'),
      status: '',
    }))
    setBindStatus('')
  }

  function selectFundingAccount(row) {
    const accountId = String(row?.id || '')
    const currency = row?.platform === 'yandex' ? 'KZT' : (row?.currency || defaultCurrencyForPlatform(row?.platform || 'meta'))
    setFundingForm({
      account_id: accountId,
      amount: '',
      currency,
      occurred_at: '',
      note: '',
    })
    setFundingStatus('')
    loadFundingEvents(accountId)
  }

  async function saveBind() {
    if (!form.user_id || !form.name.trim()) {
      setBindStatus('Выберите клиента и укажите название аккаунта.')
      return
    }
    const payload = {
      user_id: Number(form.user_id),
      platform: form.platform,
      name: form.name.trim(),
      external_id: form.external_id.trim() || null,
      account_code: form.account_code.trim() || null,
      currency: form.platform === 'yandex' ? 'KZT' : form.currency || defaultCurrencyForPlatform(form.platform),
      status: form.status || null,
    }
    const isEdit = Boolean(form.id)
    try {
      const res = await safeFetch(isEdit ? `/admin/accounts/${form.id}` : '/admin/accounts', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Ошибка сохранения привязки.')
      setBindStatus('Привязка сохранена.')
      resetForm()
      await fetchAccounts()
    } catch (e) {
      setBindStatus(e?.message || 'Ошибка сохранения привязки.')
    }
  }

  async function saveFundingEvent() {
    if (!fundingForm.account_id || !fundingForm.amount) {
      setFundingStatus('Выберите аккаунт и укажите сумму.')
      return
    }
    try {
      const account = rows.find((row) => String(row.id) === String(fundingForm.account_id))
      const currency = account?.platform === 'yandex'
        ? 'KZT'
        : (fundingForm.currency || account?.currency || defaultCurrencyForPlatform(account?.platform || 'meta'))
      const res = await safeFetch(`/admin/accounts/${fundingForm.account_id}/funding-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(fundingForm.amount),
          currency,
          occurred_at: fundingForm.occurred_at ? new Date(fundingForm.occurred_at).toISOString() : null,
          note: fundingForm.note || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Не удалось сохранить историческое пополнение.')
      }
      setFundingStatus('Историческое пополнение сохранено.')
      setFundingForm((s) => ({ ...s, amount: '', occurred_at: '', note: '' }))
      await Promise.all([loadFundingEvents(fundingForm.account_id), fetchAccounts()])
    } catch (e) {
      setFundingStatus(e?.message || 'Не удалось сохранить историческое пополнение.')
    }
  }

  async function reverseFundingEvent(eventId) {
    if (!fundingForm.account_id || !eventId) return
    const ok = window.confirm('Отменить это историческое пополнение? Будет создана корректирующая запись.')
    if (!ok) return
    try {
      const res = await safeFetch(`/admin/accounts/${fundingForm.account_id}/funding-events/${eventId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Не удалось отменить историческое пополнение.')
      }
      setFundingStatus('Историческое пополнение отменено корректирующей записью.')
      await Promise.all([loadFundingEvents(fundingForm.account_id), fetchAccounts()])
    } catch (e) {
      setFundingStatus(e?.message || 'Не удалось отменить историческое пополнение.')
    }
  }

  async function exportAccounts() {
    try {
      const token = getAuthToken()
      if (!token) return
      const res = await fetch(`${API_BASE}/admin/export/accounts.xlsx`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Экспорт недоступен')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'accounts.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setStatus(e?.message || 'Ошибка экспорта.')
    }
  }

  useEffect(() => {
    fetchAccounts()
    fetchUsers()
  }, [])

  return (
    <AppShell
      area="admin"
      eyebrow="Envidicy · Admin"
      title="Аккаунты"
      subtitle="Список открытых аккаунтов и договоров."
    >
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Админка</p>
            <h2>Аккаунты</h2>
          </div>
          <div className="panel-actions">
            <button className="btn ghost" type="button" onClick={exportAccounts}>Экспорт Excel</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th><th>Клиент</th><th>Платформа</th><th>Название</th><th>Договор</th><th>External ID</th><th>Потрачено</th><th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length ? (
                <tr><td colSpan={8}>Нет данных</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{(row.created_at || '').split(' ')[0] || '—'}</td>
                    <td>{row.user_email || '—'}</td>
                    <td>{row.platform}</td>
                    <td>{row.name}</td>
                    <td>{row.account_code || '—'}</td>
                    <td>{row.external_id || '—'}</td>
                    <td>{formatLiveBillingCell(row.live_billing, row.currency)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn ghost small"
                        type="button"
                        onClick={() =>
                          setForm({
                            id: String(row.id),
                            user_id: String(row.user_id || ''),
                            platform: row.platform || 'meta',
                            name: row.name || '',
                            external_id: row.external_id || '',
                            account_code: row.account_code || '',
                            currency: row.currency || defaultCurrencyForPlatform(row.platform || 'meta'),
                            status: row.status || '',
                          })
                        }
                      >
                        Редактировать
                      </button>
                      <button
                        className="btn ghost small"
                        type="button"
                        onClick={() => selectFundingAccount(row)}
                        style={{ marginLeft: 8 }}
                      >
                        История
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="muted">{status}</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Привязка</p>
            <h2>Создать / обновить аккаунт</h2>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Клиент</span>
            <select value={form.user_id} onChange={(e) => setForm((s) => ({ ...s, user_id: e.target.value }))}>
              <option value="">Выберите клиента</option>
              {users.map((u) => <option key={u.id} value={String(u.id)}>{u.email}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Платформа</span>
            <select
              value={form.platform}
              onChange={(e) => {
                const nextPlatform = e.target.value
                setForm((s) => ({
                  ...s,
                  platform: nextPlatform,
                  currency: nextPlatform === 'yandex' ? 'KZT' : s.currency || defaultCurrencyForPlatform(nextPlatform),
                }))
              }}
            >
              <option value="meta">Meta</option>
              <option value="google">Google</option>
              <option value="tiktok">TikTok</option>
              <option value="yandex">Яндекс</option>
              <option value="telegram">Telegram</option>
              <option value="monochrome">Monochrome</option>
            </select>
          </label>
          <label className="field"><span>Название</span><input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></label>
          <label className="field"><span>External ID</span><input value={form.external_id} onChange={(e) => setForm((s) => ({ ...s, external_id: e.target.value }))} /></label>
          <label className="field"><span>Договор / код</span><input value={form.account_code} onChange={(e) => setForm((s) => ({ ...s, account_code: e.target.value }))} /></label>
          <label className="field">
            <span>Валюта</span>
            <select
              value={form.platform === 'yandex' ? 'KZT' : form.currency}
              disabled={form.platform === 'yandex'}
              onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
            >
              {form.platform === 'yandex' ? <option value="KZT">KZT</option> : null}
              {form.platform !== 'yandex' ? <option value="USD">USD</option> : null}
              {form.platform !== 'yandex' ? <option value="EUR">EUR</option> : null}
              <option value="KZT">KZT</option>
            </select>
          </label>
          <label className="field"><span>Статус</span><input value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} placeholder="active / archived / paused" /></label>
        </div>
        <div className="panel-actions">
          <button className="btn primary" type="button" onClick={saveBind}>Сохранить</button>
          <button className="btn ghost" type="button" onClick={resetForm}>Сброс</button>
        </div>
        <p className="muted">{bindStatus}</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Ledger</p>
            <h2>Историческое пополнение аккаунта</h2>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Аккаунт</span>
            <select
              value={fundingForm.account_id}
              onChange={(e) => {
                const accountId = e.target.value
                const account = rows.find((row) => String(row.id) === accountId)
                setFundingForm((s) => ({
                  ...s,
                  account_id: accountId,
                  currency: account?.platform === 'yandex'
                    ? 'KZT'
                    : (account?.currency || defaultCurrencyForPlatform(account?.platform || 'meta')),
                }))
                setFundingStatus('')
                loadFundingEvents(accountId)
              }}
            >
              <option value="">Выберите аккаунт</option>
              {rows.map((row) => (
                <option key={row.id} value={String(row.id)}>
                  {row.user_email || '—'} · {row.platform} · {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Сумма</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fundingForm.amount}
              onChange={(e) => setFundingForm((s) => ({ ...s, amount: e.target.value }))}
              placeholder="800000"
            />
          </label>
          <label className="field">
            <span>Валюта</span>
            <select
              value={fundingForm.currency}
              disabled={(rows.find((row) => String(row.id) === String(fundingForm.account_id))?.platform || '') === 'yandex'}
              onChange={(e) => setFundingForm((s) => ({ ...s, currency: e.target.value }))}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="KZT">KZT</option>
            </select>
          </label>
          <label className="field">
            <span>Дата и время</span>
            <input
              type="datetime-local"
              value={fundingForm.occurred_at}
              onChange={(e) => setFundingForm((s) => ({ ...s, occurred_at: e.target.value }))}
            />
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>Комментарий</span>
            <input
              value={fundingForm.note}
              onChange={(e) => setFundingForm((s) => ({ ...s, note: e.target.value }))}
              placeholder="Историческое ручное зачисление"
            />
          </label>
        </div>
        <div className="panel-actions">
          <button className="btn primary" type="button" onClick={saveFundingEvent}>Добавить в историю</button>
        </div>
        <p className="muted">{fundingStatus}</p>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th><th>Источник</th><th>Сумма</th><th>Валюта</th><th>Статус</th><th>Комментарий</th><th>Кем добавлено</th><th style={{ textAlign: 'right' }}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {!fundingForm.account_id ? (
                <tr><td colSpan={8}>Выберите аккаунт, чтобы посмотреть ledger.</td></tr>
              ) : !fundingEvents.length && !fundingLoading ? (
                <tr><td colSpan={8}>По этому аккаунту пока нет записей.</td></tr>
              ) : (
                fundingEvents.map((row) => (
                  <tr key={row.id}>
                    <td>{String(row.created_at || '').replace('T', ' ').slice(0, 16) || '—'}</td>
                    <td>{fundingSourceLabel(row.source_type)}</td>
                    <td>{formatMoney(row.amount)}</td>
                    <td>{row.currency || '—'}</td>
                    <td>{row.voided_at ? 'Отменено' : 'Активно'}</td>
                    <td>{row.note || '—'}</td>
                    <td>{row.created_by || 'system'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {row.source_type === 'admin_manual' && !row.voided_at ? (
                        <button className="btn ghost small" type="button" onClick={() => reverseFundingEvent(row.id)}>
                          Отменить
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
