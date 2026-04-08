'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Truck, Phone, User, RefreshCw, Plus, X,
  Edit3, Key, Power, Search, Mail, Shield,
} from 'lucide-react';

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none transition-all focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 focus:bg-white';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState<'create' | 'edit' | 'password' | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/drivers');
      setDrivers(res.data?.data ?? res.data ?? []);
    } catch {
      console.error('Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const filtered = drivers.filter((d: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.firstName ?? '').toLowerCase().includes(q) ||
      (d.lastName ?? '').toLowerCase().includes(q) ||
      (d.phone ?? '').includes(q) ||
      (d.email ?? '').toLowerCase().includes(q)
    );
  });

  // ====================== ACTIONS ======================
  const openCreate = () => {
    setFormFirstName('');
    setFormLastName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setSelectedDriver(null);
    setShowModal('create');
  };

  const openEdit = (driver: any) => {
    setFormFirstName(driver.firstName ?? '');
    setFormLastName(driver.lastName ?? '');
    setFormPhone(driver.phone ?? '');
    setFormEmail(driver.email ?? '');
    setSelectedDriver(driver);
    setShowModal('edit');
  };

  const openPasswordReset = (driver: any) => {
    setFormPassword('');
    setSelectedDriver(driver);
    setShowModal('password');
  };

  const handleCreate = async () => {
    if (!formFirstName || !formEmail || !formPassword) {
      alert('Нэр, имэйл, нууц үг оруулна уу.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/drivers', {
        firstName: formFirstName,
        lastName: formLastName,
        phone: formPhone,
        email: formEmail,
        password: formPassword,
      });
      setShowModal(null);
      fetchDrivers();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDriver) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/drivers/${selectedDriver.id}`, {
        firstName: formFirstName,
        lastName: formLastName,
        phone: formPhone,
        email: formEmail,
      });
      setShowModal(null);
      fetchDrivers();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedDriver || !formPassword) {
      alert('Шинэ нууц үг оруулна уу.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/drivers/${selectedDriver.id}/reset-password`, {
        password: formPassword,
      });
      setShowModal(null);
      alert('Нууц үг амжилттай шинэчлэгдлээ.');
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (driver: any) => {
    const action = driver.isActive ? 'идэвхгүй' : 'идэвхтэй';
    if (!confirm(`${driver.firstName} ${driver.lastName} жолоочийг ${action} болгох уу?`)) return;
    try {
      await api.post(`/api/drivers/${driver.id}/toggle-active`);
      fetchDrivers();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    }
  };

  const closeModal = () => {
    setShowModal(null);
    setSelectedDriver(null);
  };

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-[1000px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1D26]">Жолооч</h1>
          <p className="text-[12px] text-[#8C8FA3]">{drivers.length} жолооч бүртгэлтэй</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold shadow-md shadow-[#007AFF]/25 hover:bg-[#0066D6] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Жолооч нэмэх
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A3B1]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Жолооч хайх (нэр, утас, имэйл)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E8ECF0] text-[14px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
        />
      </div>

      {/* Driver List */}
      {loading ? (
        <div className="py-12 text-center">
          <RefreshCw className="w-6 h-6 text-[#8C8FA3] mx-auto animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8ECF0] py-16 text-center">
          <Truck className="w-12 h-12 text-[#D0D2DA] mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-[#8C8FA3]">
            {search ? 'Хайлтад тохирох жолооч олдсонгүй' : 'Жолооч бүртгэлгүй байна'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((driver: any) => (
            <div
              key={driver.id}
              className={`bg-white rounded-2xl border border-[#E8ECF0] p-4 transition-all hover:shadow-md ${
                driver.isActive === false ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-bold text-white flex-shrink-0"
                  style={{ background: driver.isActive !== false ? 'linear-gradient(135deg, #FF9500, #FFCC00)' : '#D0D2DA' }}
                >
                  {driver.firstName?.charAt(0)?.toUpperCase() ?? 'Ж'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-[#1A1D26]">
                      {driver.firstName} {driver.lastName}
                    </p>
                    {driver.isActive === false && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#EF4444]">
                        Идэвхгүй
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {driver.phone && (
                      <span className="flex items-center gap-1 text-[12px] text-[#8C8FA3]">
                        <Phone className="w-3 h-3" /> {driver.phone}
                      </span>
                    )}
                    {driver.email && (
                      <span className="flex items-center gap-1 text-[12px] text-[#8C8FA3]">
                        <Mail className="w-3 h-3" /> {driver.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(driver)}
                    className="p-2 rounded-lg hover:bg-[#F5F6FA] text-[#8C8FA3] hover:text-[#007AFF] transition-colors"
                    title="Засах"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openPasswordReset(driver)}
                    className="p-2 rounded-lg hover:bg-[#F5F6FA] text-[#8C8FA3] hover:text-[#F59E0B] transition-colors"
                    title="Нууц үг солих"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(driver)}
                    className={`p-2 rounded-lg hover:bg-[#F5F6FA] transition-colors ${
                      driver.isActive !== false ? 'text-[#8C8FA3] hover:text-[#EF4444]' : 'text-[#8C8FA3] hover:text-[#10B981]'
                    }`}
                    title={driver.isActive !== false ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ====================== MODALS ====================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-ios-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-bold text-[#1A1D26]">
                {showModal === 'create' && 'Шинэ жолооч'}
                {showModal === 'edit' && 'Жолооч засах'}
                {showModal === 'password' && 'Нууц үг солих'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-[#F5F6FA]">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            {/* Create / Edit Form */}
            {(showModal === 'create' || showModal === 'edit') && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1 block">Овог</label>
                    <input type="text" value={formLastName} onChange={(e) => setFormLastName(e.target.value)} placeholder="Овог" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1 block">Нэр *</label>
                    <input type="text" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} placeholder="Нэр" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1 block">Утас</label>
                  <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="99001122" className={inputClass} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1 block">Имэйл *</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="driver@icecream.mn" className={inputClass} />
                </div>
                {showModal === 'create' && (
                  <div>
                    <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1 block">Нууц үг *</label>
                    <input type="text" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Нууц үг" className={inputClass} />
                  </div>
                )}
                <button
                  onClick={showModal === 'create' ? handleCreate : handleEdit}
                  disabled={submitting}
                  className="w-full mt-2 py-3 rounded-xl bg-[#007AFF] text-white text-[14px] font-semibold shadow-md shadow-[#007AFF]/25 disabled:opacity-50 hover:bg-[#0066D6] transition-colors"
                >
                  {submitting ? 'Хадгалж байна...' : showModal === 'create' ? 'Бүртгэх' : 'Хадгалах'}
                </button>
              </div>
            )}

            {/* Password Reset Form */}
            {showModal === 'password' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#FFF7ED] border border-[#FDE68A]">
                  <p className="text-[12px] text-[#92400E] font-medium">
                    {selectedDriver?.firstName} {selectedDriver?.lastName} жолоочийн нууц үг солих
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1 block">Шинэ нууц үг *</label>
                  <input type="text" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Шинэ нууц үг" className={inputClass} />
                </div>
                <button
                  onClick={handlePasswordReset}
                  disabled={submitting || !formPassword}
                  className="w-full mt-2 py-3 rounded-xl bg-[#F59E0B] text-white text-[14px] font-semibold shadow-md shadow-[#F59E0B]/25 disabled:opacity-50 hover:bg-[#D97706] transition-colors"
                >
                  {submitting ? 'Солиж байна...' : 'Нууц үг солих'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
