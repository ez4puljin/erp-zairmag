import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, FormField } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency } from '@/src/lib/format';
import { useFocusEffect } from 'expo-router';

export default function BankAccountsScreen() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bankName: '', accountNumber: '', holderName: '', openingBalance: '0', notes: '' });
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txAccount, setTxAccount] = useState<any>(null);
  const [txForm, setTxForm] = useState({ type: 'INCOME' as 'INCOME' | 'EXPENSE', amount: '', description: '', customerId: '' });
  const [txSaving, setTxSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/bank-accounts', { params: { includeInactive: 'true' } });
      setAccounts(data ?? []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useFocusEffect(useCallback(() => { fetchAccounts(); }, [fetchAccounts]));

  function openCreate() {
    setEditId(null);
    setForm({ bankName: '', accountNumber: '', holderName: '', openingBalance: '0', notes: '' });
    setModalOpen(true);
  }
  function openEdit(acc: any) {
    setEditId(acc.id);
    setForm({ bankName: acc.bankName, accountNumber: acc.accountNumber, holderName: acc.holderName, openingBalance: String(acc.openingBalance ?? 0), notes: acc.notes ?? '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.bankName.trim() || !form.accountNumber.trim() || !form.holderName.trim()) {
      Alert.alert('Алдаа', 'Бүх заавал талбар бөглөнө үү');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        holderName: form.holderName.trim(),
        openingBalance: Number(form.openingBalance) || 0,
        notes: form.notes?.trim() || undefined,
      };
      if (editId) await api.put(`/api/bank-accounts/${editId}`, payload);
      else await api.post('/api/bank-accounts', payload);
      setModalOpen(false);
      fetchAccounts();
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Хадгалахад алдаа');
    } finally { setSaving(false); }
  }

  function openTxModal(acc: any) {
    setTxAccount(acc);
    setTxForm({ type: 'INCOME', amount: '', description: '', customerId: '' });
    setTxModalOpen(true);
    api.get('/api/customers?limit=100').then(r => setCustomers(r.data?.data ?? r.data ?? [])).catch(() => {});
  }

  async function handleTx() {
    if (!txForm.amount || Number(txForm.amount) <= 0) { Alert.alert('Алдаа', 'Дүн оруулна уу'); return; }
    setTxSaving(true);
    try {
      if (txForm.type === 'INCOME' && txForm.customerId) {
        // Linked to customer → create payment (reduces their debt + increases bank balance)
        await api.post('/api/payments', {
          customerId: txForm.customerId,
          amount: Number(txForm.amount),
          method: 'BANK_TRANSFER',
          bankAccountId: txAccount.id,
          note: txForm.description || undefined,
        });
      } else {
        // Manual balance adjustment — directly update bank account balance
        const delta = txForm.type === 'INCOME' ? Number(txForm.amount) : -Number(txForm.amount);
        await api.put(`/api/bank-accounts/${txAccount.id}`, {
          openingBalance: Number(txAccount.openingBalance) + delta,
        });
      }
      setTxModalOpen(false);
      fetchAccounts();
      Alert.alert('Амжилттай', txForm.type === 'INCOME' ? 'Орлого бүртгэгдлээ' : 'Зарлага бүртгэгдлээ');
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Бүртгэхэд алдаа');
    } finally { setTxSaving(false); }
  }

  if (loading) return <View style={{ flex: 1 }}><ScreenHeader title="Дансны мэдээлэл" /><View style={s.center}><ActivityIndicator color="#007AFF" /></View></View>;

  return (
    <View style={s.container}>
      <ScreenHeader title="Дансны мэдээлэл" rightAction={{ label: '+ Шинэ', onPress: openCreate }} />
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAccounts(); }} />}
      >
        {accounts.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
            <Text style={s.emptyText}>Данс бүртгэгдээгүй байна</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openCreate}>
              <Text style={s.emptyBtnText}>+ Шинэ данс</Text>
            </TouchableOpacity>
          </View>
        ) : accounts.map(acc => (
          <View key={acc.id} style={[s.card, !acc.isActive && { opacity: 0.5 }]}>
            <View style={s.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.bankName}>{acc.bankName}</Text>
                <Text style={s.accNum}>{acc.accountNumber} · {acc.holderName}</Text>
              </View>
              <Text style={s.balance}>{formatCurrency(acc.currentBalance)}</Text>
            </View>

            <View style={s.cardActions}>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#34C75910' }]} onPress={() => openTxModal(acc)}>
                <Ionicons name="add-circle-outline" size={16} color="#34C759" />
                <Text style={[s.actionText, { color: '#34C759' }]}>Орлого/Зарлага</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#007AFF10' }]} onPress={() => openEdit(acc)}>
                <Ionicons name="pencil-outline" size={16} color="#007AFF" />
                <Text style={[s.actionText, { color: '#007AFF' }]}>Засах</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Create/Edit modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'Данс засах' : 'Шинэ данс'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><Ionicons name="close" size={24} color="#8E8E93" /></TouchableOpacity>
            </View>
            <FormField label="Банкны нэр *" value={form.bankName} onChange={v => setForm(p => ({ ...p, bankName: v }))} required />
            <FormField label="Дансны дугаар *" value={form.accountNumber} onChange={v => setForm(p => ({ ...p, accountNumber: v }))} required />
            <FormField label="Эзэмшигчийн нэр *" value={form.holderName} onChange={v => setForm(p => ({ ...p, holderName: v }))} required />
            <FormField label="Эхний үлдэгдэл" value={form.openingBalance} onChange={v => setForm(p => ({ ...p, openingBalance: v }))} type="number" />
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
              <Text style={s.saveBtnText}>{saving ? 'Хадгалж...' : 'Хадгалах'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transaction modal */}
      <Modal visible={txModalOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Орлого / Зарлага бүртгэх</Text>
              <TouchableOpacity onPress={() => setTxModalOpen(false)}><Ionicons name="close" size={24} color="#8E8E93" /></TouchableOpacity>
            </View>
            {txAccount && <Text style={s.txAccName}>{txAccount.bankName} — {txAccount.accountNumber}</Text>}

            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[s.toggle, txForm.type === 'INCOME' && { backgroundColor: '#34C759', borderColor: '#34C759' }]}
                onPress={() => setTxForm(p => ({ ...p, type: 'INCOME' }))}
              >
                <Text style={[s.toggleText, txForm.type === 'INCOME' && { color: '#fff' }]}>Орлого</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggle, txForm.type === 'EXPENSE' && { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }]}
                onPress={() => setTxForm(p => ({ ...p, type: 'EXPENSE' }))}
              >
                <Text style={[s.toggleText, txForm.type === 'EXPENSE' && { color: '#fff' }]}>Зарлага</Text>
              </TouchableOpacity>
            </View>

            <FormField label="Дүн *" value={txForm.amount} onChange={v => setTxForm(p => ({ ...p, amount: v }))} type="number" required />
            <FormField label="Тайлбар" value={txForm.description} onChange={v => setTxForm(p => ({ ...p, description: v }))} placeholder="Юунд зориулсан..." />

            {txForm.type === 'INCOME' && (
              <View style={{ marginTop: 8 }}>
                <Text style={s.fieldLabel}>Харилцагч холбох (заавал биш)</Text>
                <Text style={s.fieldHint}>Сонговол харилцагчийн өрнөөс суутгана</Text>
                <View style={s.pickerWrap}>
                  {customers.length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#8E8E93', padding: 12 }}>Харилцагч байхгүй</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6, paddingHorizontal: 4 }}>
                      <TouchableOpacity
                        style={[s.custChip, !txForm.customerId && s.custChipActive]}
                        onPress={() => setTxForm(p => ({ ...p, customerId: '' }))}
                      >
                        <Text style={[s.custChipText, !txForm.customerId && { color: '#fff' }]}>Холбоосгүй</Text>
                      </TouchableOpacity>
                      {customers.map((c: any) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[s.custChip, txForm.customerId === c.id && s.custChipActive]}
                          onPress={() => setTxForm(p => ({ ...p, customerId: c.id }))}
                        >
                          <Text style={[s.custChipText, txForm.customerId === c.id && { color: '#fff' }]}>{c.storeName}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: txForm.type === 'INCOME' ? '#34C759' : '#FF3B30', marginTop: 16 }]}
              onPress={handleTx}
              disabled={txSaving}
            >
              {txSaving ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
              <Text style={s.saveBtnText}>{txSaving ? 'Бүртгэж...' : txForm.type === 'INCOME' ? 'Орлого бүртгэх' : 'Зарлага бүртгэх'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#8E8E93', marginTop: 12 },
  emptyBtn: { marginTop: 16, backgroundColor: '#007AFF', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  bankName: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  accNum: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  balance: { fontSize: 18, fontWeight: '800', color: '#34C759' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 32, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  txAccName: { fontSize: 13, color: '#8E8E93', marginBottom: 10 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggle: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#E5E5EA', alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', marginBottom: 4 },
  fieldHint: { fontSize: 10, color: '#AEAEB2', marginBottom: 6 },
  pickerWrap: { backgroundColor: '#F2F2F7', borderRadius: 12, minHeight: 44 },
  custChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA' },
  custChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  custChipText: { fontSize: 12, fontWeight: '600', color: '#4A4D5C' },
  saveBtn: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 14 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
