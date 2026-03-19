'use client';
import { useState } from 'react';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useUserProfile } from '@/hooks/useUserProfile';
import { WebhookConfig, WebhookEvent } from '@pnot/shared';

const WEBHOOK_EVENTS: { id: WebhookEvent; label: string; desc: string }[] = [
  { id: 'note.created', label: '💬 Not oluşturuldu',  desc: 'Projende yeni not eklenince tetikler' },
  { id: 'task.done',    label: '✅ Görev tamamlandı', desc: 'Bir görev "done" olunca tetikler' },
  { id: 'member.joined',label: '👤 Üye katıldı',      desc: 'Projeye yeni üye katılınca tetikler' },
];

function ApiKeySection({ apiKey }: { apiKey?: string }) {
  const [key, setKey]         = useState(apiKey || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const fn  = httpsCallable<{}, { apiKey: string }>(functions, 'generateApiKey');
      const res = await fn({});
      setKey(res.data.apiKey);
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <h2 className="text-base font-semibold text-gray-800 mb-1">🔑 API Anahtarı</h2>
      <p className="text-sm text-gray-400 mb-4">
        Home Assistant, Zapier, Node-RED ve diğer entegrasyonlar için. <br/>
        <code className="bg-gray-50 px-1 rounded text-xs">X-Api-Key</code> header'ı ile gönder.
      </p>

      {key ? (
        <div className="flex gap-2 mb-4">
          <code className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-mono text-gray-700 break-all border border-gray-100">
            {key}
          </code>
          <button onClick={copy} className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 shrink-0 transition">
            {copied ? '✓' : 'Kopyala'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-300 mb-4">Henüz API anahtarın yok.</p>
      )}

      <button
        onClick={generate}
        disabled={loading}
        className="px-4 py-2 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 transition disabled:opacity-50"
      >
        {loading ? 'Oluşturuluyor...' : key ? '🔄 Yenile (eski geçersiz olur)' : '+ Oluştur'}
      </button>

      {key && (
        <div className="mt-5 border-t border-gray-50 pt-5">
          <p className="text-xs font-semibold text-gray-500 mb-3">Örnek kullanımlar</p>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Not ekle (POST)</p>
              <pre className="bg-gray-900 text-green-300 rounded-xl p-3 text-xs overflow-x-auto whitespace-pre-wrap">{`curl -X POST https://pnot.app/api/v1/notes \\
  -H "X-Api-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"projectId":"PROJECT_ID","pageId":"PAGE_ID","content":"Hareket algılandı!"}'`}</pre>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">Home Assistant — aktif görevler sensörü</p>
              <pre className="bg-gray-900 text-blue-300 rounded-xl p-3 text-xs overflow-x-auto whitespace-pre-wrap">{`# configuration.yaml
sensor:
  - platform: rest
    resource: https://pnot.app/api/v1/tasks/PROJECT_ID?apiKey=${key}
    name: PNOT Aktif Görevler
    value_template: "{{ value_json.activeTasks }}"
    scan_interval: 300`}</pre>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">Home Assistant — otomasyon ile not ekleme</p>
              <pre className="bg-gray-900 text-yellow-300 rounded-xl p-3 text-xs overflow-x-auto whitespace-pre-wrap">{`# configuration.yaml
rest_command:
  pnot_add_note:
    url: https://pnot.app/api/v1/notes
    method: POST
    headers:
      X-Api-Key: ${key}
      Content-Type: application/json
    payload: >
      {"projectId":"PROJECT_ID","pageId":"PAGE_ID",
       "content":"{{ message }}"}`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WebhookSection({ webhooks: initial }: { webhooks: WebhookConfig[] }) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ url: '', events: [] as WebhookEvent[], label: '' });
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState<string | null>(null);

  async function save() {
    if (!form.url || !form.events.length) return;
    setSaving(true);
    try {
      const fn  = httpsCallable<{ url: string; events: string[]; label: string }, { id: string }>(functions, 'saveWebhook');
      const res = await fn({ url: form.url, events: form.events, label: form.label });
      const newHook: WebhookConfig = {
        id: res.data.id, url: form.url, events: form.events,
        label: form.label, active: true,
        createdAt: { toDate: () => new Date() } as any,
      };
      setWebhooks((prev) => [...prev, newHook]);
      setForm({ url: '', events: [], label: '' });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const fn = httpsCallable(functions, 'deleteWebhook');
    await fn({ webhookId: id });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function test(url: string, hookId: string) {
    setTesting(hookId);
    await fetch('/api/webhook-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }).catch(() => null);
    setTimeout(() => setTesting(null), 1500);
  }

  function toggleEvent(e: WebhookEvent) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(e) ? f.events.filter((x) => x !== e) : [...f.events, e],
    }));
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-800">🔗 Webhook'lar</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-medium hover:bg-indigo-100 transition"
        >
          + Ekle
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        PNOT'ta bir olay gerçekleşince seçtiğin URL'e otomatik POST gönderilir.<br/>
        Node-RED, Make.com, Zapier veya kendi sunucunla bağlanabilirsin.
      </p>

      {/* Add form */}
      {showForm && (
        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <input
            placeholder="https://hooks.example.com/pnot"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-sm mb-3 outline-none focus:border-indigo-400"
          />
          <input
            placeholder="Etiket (isteğe bağlı)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-sm mb-3 outline-none focus:border-indigo-400"
          />
          <div className="flex flex-wrap gap-2 mb-3">
            {WEBHOOK_EVENTS.map((ev) => (
              <button
                key={ev.id}
                onClick={() => toggleEvent(ev.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  form.events.includes(ev.id)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {ev.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !form.url || !form.events.length}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <p className="text-sm text-gray-300 text-center py-6">Henüz webhook yok</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <div key={w.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                {w.label && <p className="text-xs font-semibold text-gray-700 mb-0.5">{w.label}</p>}
                <p className="text-xs text-gray-500 font-mono truncate">{w.url}</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {w.events.map((ev) => (
                    <span key={ev} className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                      {WEBHOOK_EVENTS.find((x) => x.id === ev)?.label || ev}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => test(w.url, w.id)}
                  className="px-2.5 py-1.5 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                >
                  {testing === w.id ? '...' : 'Test'}
                </button>
                <button
                  onClick={() => remove(w.id)}
                  className="px-2.5 py-1.5 text-xs bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Node-RED example */}
      {webhooks.length > 0 && (
        <div className="mt-5 border-t border-gray-50 pt-5">
          <p className="text-xs font-semibold text-gray-500 mb-2">Node-RED örneği</p>
          <pre className="bg-gray-900 text-green-300 rounded-xl p-3 text-xs overflow-x-auto whitespace-pre-wrap">{`// HTTP In node: POST /pnot-webhook
// Function node:
const event = msg.payload.event;
const content = msg.payload.content || '';

if (event === 'note.created') {
    node.send([msg, null]); // → bildirim gönder
} else if (event === 'task.done') {
    node.send([null, msg]); // → başka akış
}`}</pre>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { profile } = useUserProfile();

  if (!profile) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Yükleniyor...</div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">⚙️ Entegrasyonlar & API</h1>
      <p className="text-gray-400 text-sm mb-8">
        PNOT'u Home Assistant, Node-RED, Zapier ve diğer platformlarla bağla.
      </p>

      {/* Trial banner */}
      {profile.proGrantedBy === 'trial' && profile.trialEndsAt && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <span className="text-xl">⏳</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Pro trial aktif</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {new Date((profile.trialEndsAt as any).toDate()).toLocaleDateString('tr-TR')} tarihine kadar tüm Pro özelliklerine erişimin var.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <ApiKeySection apiKey={profile.apiKey} />
        <WebhookSection webhooks={(profile.webhooks as WebhookConfig[]) || []} />
      </div>
    </div>
  );
}
