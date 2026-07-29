'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';
const labelClass = 'block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5';

export default function SmsSettingsPage() {
  const [apiUrl, setApiUrl] = useState('http://192.168.1.X:8080/message');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get('/api/sms/settings').then(res => {
      const d = res.data;
      if (d.apiUrl) setApiUrl(d.apiUrl);
      if (d.username) setUsername(d.username);
      if (d.password) setPassword(d.password);
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.put('/api/sms/settings', { apiUrl, username, password });
      setSaveMsg({ type: 'success', text: 'Тохиргоо амжилттай хадгалагдлаа' });
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err?.response?.data?.message || 'Хадгалахад алдаа гарлаа' });
    }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      await api.post('/api/sms/test', { phone: testPhone, message: testMessage });
      setTestMsg({ type: 'success', text: 'Тест SMS амжилттай илгээгдлээ' });
    } catch (err: any) {
      setTestMsg({ type: 'error', text: err?.response?.data?.message || 'Тест илгээхэд алдаа гарлаа' });
    }
    setTesting(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 animate-ios-fade-in">
      <PageHeader
        title="SMS тохиргоо"
        subtitle="Мессеж илгээх серверийн холболт, тест"
        icon={MessageSquare}
      />

      {/* Settings Card */}
      <SectionCard title="Холболтын тохиргоо">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>API URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder="http://192.168.1.X:8080/message"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Хэрэглэгчийн нэр</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Нууц үг</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className={inputClass}
            />
          </div>

          {saveMsg && (
            <div className={`flex items-center gap-2 text-[13px] font-medium px-4 py-3 rounded-xl ${saveMsg.type === 'success' ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
              {saveMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {saveMsg.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] hover:brightness-105 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}
          >
            {saving ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>
      </SectionCard>

      {/* Test SMS Card */}
      <SectionCard title="Тест SMS илгээх">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Утасны дугаар</label>
            <input
              type="text"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="99001122"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Мессеж</label>
            <textarea
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              placeholder="Тест мессеж бичнэ үү..."
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>

          {testMsg && (
            <div className={`flex items-center gap-2 text-[13px] font-medium px-4 py-3 rounded-xl ${testMsg.type === 'success' ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
              {testMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {testMsg.text}
            </div>
          )}

          <button
            onClick={handleTest}
            disabled={testing || !testPhone || !testMessage}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white shadow-sm shadow-[#5856D6]/25 transition-all active:scale-[0.97] hover:brightness-105 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #5856D6, #AF52DE)' }}
          >
            <Send className="w-4 h-4" />
            {testing ? 'Илгээж байна...' : 'Тест илгээх'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
