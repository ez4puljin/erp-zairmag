'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import {
  ChevronLeft,
  MapPin,
  Phone,
  Users,
  Pencil,
  X,
  ShoppingCart,
  ChevronRight,
  Shield,
  Mail,
  Key,
  Power,
  Eye,
  EyeOff,
  CreditCard,
  Wallet,
  Hash,
} from 'lucide-react';
import { ErrorBanner } from '@/components/shared/error-banner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

const tierConfig: Record<string, { label: string; bg: string; text: string }> = {
  STANDARD: { label: 'Standard', bg: '#007AFF15', text: '#007AFF' },
  SILVER: { label: 'Silver', bg: '#8E8E9315', text: '#8E8E93' },
  GOLD: { label: 'Gold', bg: '#FF950015', text: '#FF9500' },
  PLATINUM: { label: 'Platinum', bg: '#AF52DE15', text: '#AF52DE' },
  VIP: { label: 'VIP', bg: '#FF2D5515', text: '#FF2D55' },
};

const orderStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Хүлээгдэж буй', bg: '#FF950015', text: '#FF9500' },
  APPROVED: { label: 'Зөвшөөрсөн', bg: '#007AFF15', text: '#007AFF' },
  SHIPPING: { label: 'Хүргэлтэнд', bg: '#AF52DE15', text: '#AF52DE' },
  DELIVERED: { label: 'Хүргэгдсэн', bg: '#34C75915', text: '#34C759' },
  CANCELLED: { label: 'Цуцлагдсан', bg: '#FF3B3015', text: '#FF3B30' },
};

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[15px] text-[#1A1D26] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

const labelClass = 'block text-[13px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    storeName: '',
    contactName: '',
    phone: '',
    registerNo: '',
    address: '',
    customerCategoryId: '',
    pricingTier: 'STANDARD',
    creditLimit: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // App credentials
  const [credForm, setCredForm] = useState({ email: '', password: '' });
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');

  // Password reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Toggle active
  const [toggling, setToggling] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);

  const fetchCustomer = () => {
    setLoading(true);
    setFetchError(null);
    api
      .get(`/api/customers/${id}`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setCustomer(data);
        if (data?.orders) setOrders(data.orders);
      })
      .catch((err) => {
        setFetchError(err.response?.data?.message ?? 'Харилцагчийн мэдээлэл ачааллахад алдаа гарлаа');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) {
      fetchCustomer();
      api
        .get('/api/customer-categories')
        .then((res) => setCategories(res.data?.data ?? res.data ?? []))
        .catch(() => { /* non-critical */ });
      api
        .get(`/api/orders?customerId=${id}&limit=5`)
        .then((res) => setOrders((prev) => (prev.length > 0 ? prev : res.data?.data ?? [])))
        .catch(() => { /* non-critical */ });
    }
  }, [id]);

  const isActive =
    customer?.isActive !== undefined ? customer.isActive : !customer?.deletedAt;

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      if (isActive) {
        await api.post(`/api/customers/${id}/deactivate`);
      } else {
        await api.post(`/api/customers/${id}/activate`);
      }
      setShowDeactivateConfirm(false);
      fetchCustomer();
    } catch (err: any) {
      setFetchError(err.response?.data?.message ?? 'Алдаа гарлаа');
      setShowDeactivateConfirm(false);
    } finally {
      setToggling(false);
    }
  };

  const openEditModal = () => {
    if (!customer) return;
    setEditForm({
      storeName: customer.storeName ?? '',
      contactName: customer.contactName ?? '',
      phone: customer.phone ?? '',
      registerNo: customer.registerNo ?? '',
      address: customer.address ?? '',
      customerCategoryId: customer.customerCategoryId ?? '',
      pricingTier: customer.pricingTier ?? 'STANDARD',
      creditLimit: String(Number(customer.creditLimit ?? 0)),
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError('');
    try {
      await api.patch(`/api/customers/${id}`, {
        storeName: editForm.storeName,
        contactName: editForm.contactName,
        phone: editForm.phone,
        registerNo: editForm.registerNo || undefined,
        address: editForm.address,
        customerCategoryId: editForm.customerCategoryId || undefined,
        pricingTier: editForm.pricingTier,
        creditLimit: editForm.creditLimit ? Number(editForm.creditLimit) : 0,
      });
      setShowEditModal(false);
      fetchCustomer();
    } catch (err: any) {
      setEditError(err.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCreateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredSubmitting(true);
    setCredError('');
    setCredSuccess('');
    try {
      await api.post(`/api/customers/${id}/credentials`, {
        email: credForm.email,
        password: credForm.password,
      });
      setCredSuccess('Апп бүртгэл амжилттай үүсгэлээ');
      setCredForm({ email: '', password: '' });
      fetchCustomer();
    } catch (err: any) {
      setCredError(err.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setCredSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSubmitting(true);
    setResetError('');
    setResetSuccess('');
    try {
      await api.post(`/api/customers/${id}/reset-password`, {
        newPassword: resetPassword,
      });
      setResetSuccess('Нууц үг амжилттай шинэчлэгдлээ');
      setResetPassword('');
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess('');
      }, 1500);
    } catch (err: any) {
      setResetError(err.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setResetSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#E5E5EA] rounded-xl" />
        <div className="h-40 bg-white rounded-2xl" />
        <div className="h-48 bg-white rounded-2xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-3xl">
        <SectionCard>
          <EmptyState icon={Users} title="Харилцагч олдсонгүй" hint="Энэ харилцагч устгагдсан эсвэл байхгүй байна" />
        </SectionCard>
      </div>
    );
  }

  const tier = tierConfig[customer.pricingTier] ?? tierConfig.STANDARD;

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-[13px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors active:scale-[0.97]"
      >
        <ChevronLeft className="w-4 h-4" /> Харилцагч
      </button>

      {/* Header */}
      <PageHeader
        title={customer.storeName}
        subtitle={customer.contactName || undefined}
        icon={Users}
        iconColor="#AF52DE"
        actions={
          <>
            <button
              onClick={() => isActive ? setShowDeactivateConfirm(true) : handleToggleActive()}
              disabled={toggling}
              className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-60 ${
                isActive
                  ? 'bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/15'
                  : 'bg-[#34C759]/10 text-[#34C759] hover:bg-[#34C759]/15'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {toggling ? '...' : isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
            </button>
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] hover:brightness-105"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
            >
              <Pencil className="w-3.5 h-3.5" /> Засах
            </button>
          </>
        }
      />

      {/* Status + tier chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#F2F4F7]">
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#34C759]' : 'bg-[#8C8FA3]'}`} />
          <span className={isActive ? 'text-[#34C759]' : 'text-[#8C8FA3]'}>
            {isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
          </span>
        </span>
        <span
          className="inline-flex px-2.5 py-1 rounded-full text-[12px] font-bold"
          style={{ backgroundColor: tier.bg, color: tier.text }}
        >
          {tier.label}
        </span>
      </div>

      <ErrorBanner message={fetchError} onDismiss={() => setFetchError(null)} />

      <ConfirmDialog
        open={showDeactivateConfirm}
        title="Идэвхгүй болгох уу?"
        message={`"${customer.storeName}" харилцагчийг идэвхгүй болгохдоо итгэлтэй байна уу? Идэвхгүй харилцагч захиалга үүсгэх боломжгүй.`}
        confirmLabel="Идэвхгүй болгох"
        danger={true}
        loading={toggling}
        onConfirm={handleToggleActive}
        onCancel={() => setShowDeactivateConfirm(false)}
      />

      {/* KPI stats */}
      <StatGrid cols={3}>
        <StatCard label="Захиалгын тоо" value={`${orders.length} ш`} icon={ShoppingCart} gradient="indigo" index={0} />
        <StatCard label="Зээлийн хязгаар" value={formatMnt(customer.creditLimit ?? 0)} icon={CreditCard} gradient="purple" index={1} />
        <StatCard label="Одоогийн өр" value={formatMnt(customer.outstandingDebt ?? 0)} icon={Wallet} gradient="red" index={2} />
      </StatGrid>

      {/* Section 1: Customer Info */}
      <SectionCard title="Мэдээлэл">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#AF52DE]/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#AF52DE]" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#8C8FA3]">Холбоо барих</p>
              <p className="text-[14px] text-[#1A1D26] font-medium truncate">{customer.contactName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#34C759]/10 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-[#34C759]" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#8C8FA3]">Утас</p>
              <p className="text-[14px] text-[#1A1D26] font-medium">{customer.phone}</p>
            </div>
          </div>
          {customer.address && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF9500]/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#FF9500]" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-[#8C8FA3]">Хаяг</p>
                <p className="text-[14px] text-[#1A1D26] font-medium">{customer.address}</p>
              </div>
            </div>
          )}
          {customer.registerNo && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5856D6]/10 flex items-center justify-center shrink-0">
                <Hash className="w-4 h-4 text-[#5856D6]" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-[#8C8FA3]">РД</p>
                <p className="text-[14px] text-[#1A1D26] font-medium">{customer.registerNo}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {customer.customerCategory?.name && (
              <span className="inline-flex px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#FF9500]/10 text-[#FF9500]">
                {customer.customerCategory.name}
                {customer.customerCategory.type && (
                  <span className="ml-1 opacity-70">
                    ({customer.customerCategory.type === 'KHOROO' ? 'Хороо' : 'Сум'})
                  </span>
                )}
              </span>
            )}
            <span
              className="inline-flex px-2.5 py-1 rounded-lg text-[12px] font-semibold"
              style={{ backgroundColor: tier.bg, color: tier.text }}
            >
              {tier.label}
            </span>
            {Number(customer.creditLimit ?? 0) > 0 && (
              <span className="inline-flex px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#5856D6]/10 text-[#5856D6]">
                Зээлийн хязгаар: {formatMnt(customer.creditLimit)}
              </span>
            )}
            {Number(customer.outstandingDebt ?? 0) > 0 && (
              <span className="inline-flex px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-[#FF3B30]/10 text-[#FF3B30]">
                Өр: {formatMnt(customer.outstandingDebt)}
              </span>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Section 2: App Account */}
      <SectionCard title="Апп бүртгэл">
        {customer.user?.email ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-[#007AFF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#8C8FA3]">Имэйл</p>
                <p className="text-[14px] text-[#1A1D26] font-medium truncate">{customer.user.email}</p>
              </div>
              <button
                onClick={() => {
                  setResetPassword('');
                  setResetError('');
                  setResetSuccess('');
                  setShowResetModal(true);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold bg-[#FF9500]/10 text-[#FF9500] hover:bg-[#FF9500]/15 transition-all active:scale-[0.97] shrink-0"
              >
                <Key className="w-3.5 h-3.5" /> Нууц үг шинэчлэх
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateCredentials} className="space-y-4">
            <p className="text-[14px] text-[#8C8FA3]">
              Энэ харилцагч апп бүртгэлгүй байна. Доорх маягтыг бөглөн бүртгэл үүсгэнэ үү.
            </p>
            <div>
              <label className={labelClass}>Имэйл</label>
              <input
                type="email"
                value={credForm.email}
                onChange={(e) => setCredForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                placeholder="example@mail.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Нууц үг</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credForm.password}
                  onChange={(e) =>
                    setCredForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  placeholder="Нууц үг"
                  className={inputClass + ' pr-12'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8C8FA3] hover:text-[#1A1D26]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {credError && (
              <p className="text-[13px] text-[#FF3B30] font-medium">{credError}</p>
            )}
            {credSuccess && (
              <p className="text-[13px] text-[#34C759] font-medium">{credSuccess}</p>
            )}
            <button
              type="submit"
              disabled={credSubmitting}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[14px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] disabled:opacity-60 hover:brightness-105"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}
            >
              <Shield className="w-4 h-4" />
              {credSubmitting ? 'Үүсгэж байна...' : 'Апп бүртгэл үүсгэх'}
            </button>
          </form>
        )}
      </SectionCard>

      {/* Section 4: Recent Orders */}
      {orders.length > 0 && (
        <SectionCard title="Сүүлийн захиалгууд" noPadding>
          <div className="divide-y divide-[#F2F4F7]">
            {orders.map((order: any) => {
              const status =
                orderStatusConfig[order.status] ?? orderStatusConfig.PENDING;
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-3 px-4 lg:px-5 py-3 hover:bg-[#F7F9FC] transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#FF9500]/10 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-4 h-4 text-[#FF9500]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1A1D26]">
                      #{order.orderNumber}
                    </p>
                    <p className="text-[12px] text-[#8C8FA3]">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('mn-MN')
                        : ''}
                    </p>
                  </div>
                  <span
                    className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: status.bg, color: status.text }}
                  >
                    {status.label}
                  </span>
                  <span className="text-[14px] font-semibold text-[#1A1D26] shrink-0 tabular-nums">
                    {formatMnt(order.totalAmount ?? 0)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Section 3: Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[20px] font-bold text-[#1A1D26]">Харилцагч засах</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F2F4F7] transition-colors"
              >
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className={labelClass}>Дэлгүүрийн нэр</label>
                <input
                  type="text"
                  value={editForm.storeName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, storeName: e.target.value }))
                  }
                  required
                  placeholder="Дэлгүүрийн нэр"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Холбоо барих хүн</label>
                <input
                  type="text"
                  value={editForm.contactName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, contactName: e.target.value }))
                  }
                  required
                  placeholder="Нэр"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Утас</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  required
                  placeholder="Утасны дугаар"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>РД</label>
                <input
                  type="text"
                  value={editForm.registerNo}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, registerNo: e.target.value }))
                  }
                  placeholder="Регистрийн дугаар"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Хаяг</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Хаяг"
                  rows={2}
                  className={inputClass + ' resize-none'}
                />
              </div>
              <div>
                <label className={labelClass}>Харилцагчийн ангилал</label>
                <select
                  value={editForm.customerCategoryId}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      customerCategoryId: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Сонгоогүй</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Үнийн зэрэглэл</label>
                <select
                  value={editForm.pricingTier}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, pricingTier: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="STANDARD">Standard</option>
                  <option value="SILVER">Silver</option>
                  <option value="GOLD">Gold</option>
                  <option value="PLATINUM">Platinum</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Зээлийн хязгаар (₮)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.creditLimit}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, creditLimit: e.target.value }))
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              {editError && (
                <p className="text-[13px] text-[#FF3B30] font-medium">{editError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8C8FA3] bg-[#F2F4F7] hover:bg-[#E5E5EA] transition-all active:scale-[0.97]"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60 hover:brightness-105"
                  style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}
                >
                  {editSubmitting ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowResetModal(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[20px] font-bold text-[#1A1D26]">Нууц үг шинэчлэх</h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F2F4F7] transition-colors"
              >
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className={labelClass}>Шинэ нууц үг</label>
                <div className="relative">
                  <input
                    type={showResetPw ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    placeholder="Шинэ нууц үг оруулна уу"
                    className={inputClass + ' pr-12'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPw(!showResetPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8C8FA3] hover:text-[#1A1D26]"
                  >
                    {showResetPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              {resetError && (
                <p className="text-[13px] text-[#FF3B30] font-medium">{resetError}</p>
              )}
              {resetSuccess && (
                <p className="text-[13px] text-[#34C759] font-medium">{resetSuccess}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8C8FA3] bg-[#F2F4F7] hover:bg-[#E5E5EA] transition-all active:scale-[0.97]"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60 hover:brightness-105"
                  style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}
                >
                  {resetSubmitting ? 'Шинэчилж байна...' : 'Шинэчлэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
