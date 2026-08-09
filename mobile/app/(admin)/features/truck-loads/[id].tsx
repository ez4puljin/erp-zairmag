import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, DetailSection, DetailRow, LoadingState, ErrorState, confirm, notify,
  ProductPicker, QuantitySheet, BarcodeScannerModal, normalizeCode, hasBarcode,
  type PickerProduct, type QuantityResult } from '@/src/components/admin';
import { useItemQuery, invalidateItemCache } from '@/src/hooks/use-item-query';
import { invalidateListCache } from '@/src/hooks/use-list-query';
import api from '@/src/lib/api';
import { formatWeight, formatCurrency, formatQty, formatDate, formatDateTime, paymentLabel, PAYMENT_COLORS } from '@/src/lib/format';

const STATUS_INFO: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  LOADING:              { label: 'Ачиж буй',          color: '#FF9500', icon: 'cube' },
  DISPATCHED:           { label: 'Замд',              color: '#5856D6', icon: 'car' },
  COMPLETION_REQUESTED: { label: 'Дуусгах хүсэлтэй',  color: '#FF3B30', icon: 'hourglass' },
  COMPLETED:            { label: 'Дууссан',           color: '#34C759', icon: 'checkmark-circle' },
  CANCELLED:            { label: 'Цуцлагдсан',        color: '#8E8E93', icon: 'close-circle' },
};

export default function TruckLoadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, refetch } = useItemQuery<any>(id ? `/api/truck-loads/${id}` : null);
  const [actionLoading, setActionLoading] = React.useState(false);
  // Нэмэлт ачилт
  const [addOpen, setAddOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  /** Нэг баркодод олон бараа таарсан үед жагсаалтыг шүүх утга. */
  const [scanQuery, setScanQuery] = useState('');
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [pending, setPending] = useState<PickerProduct | null>(null);
  const [addLines, setAddLines] = useState<{ productId: string; name: string; qty: number }[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, { returned: string; damaged: string }>>({});
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!addOpen || products.length > 0) return;
    // Серверийн pagination нь limit-ийг 100-аар хязгаарладаг.
    api.get('/api/products?limit=100')
      .then(r => setProducts(r.data?.data ?? r.data ?? []))
      .catch(() => {});
  }, [addOpen, products.length]);

  if (loading) return <View style={{ flex: 1 }}><ScreenHeader title="Ачилт" /><LoadingState /></View>;
  if (error || !data) return <View style={{ flex: 1 }}><ScreenHeader title="Ачилт" /><ErrorState message={error || 'Олдсонгүй'} onRetry={refetch} /></View>;

  const status = STATUS_INFO[data.status] ?? STATUS_INFO.LOADING;
  const driverName = data.driver ? `${data.driver.lastName ?? ''} ${data.driver.firstName ?? ''}`.trim() : '—';
  const items = data.items ?? [];
  const sales = data.sales ?? [];
  const batches = data.batches ?? [];
  const totalLoaded = items.reduce((s: number, i: any) => s + (i.loadedQty ?? 0), 0);
  const totalSold = items.reduce((s: number, i: any) => s + (i.soldQty ?? 0), 0);
  const totalReturned = items.reduce((s: number, i: any) => s + (i.returnedQty ?? 0), 0);
  const totalDamaged = items.reduce((s: number, i: any) => s + (i.damagedQty ?? 0), 0);
  const totalRevenue = sales.reduce((s: number, sale: any) => s + Number(sale.totalAmount ?? 0), 0);
  // Ачилтын нийт жин — жин оруулаагүй бараа 0 гэж тооцогдоно.
  const totalWeightGrams = items.reduce(
    (s: number, i: any) => s + (i.loadedQty ?? 0) * Number(i.product?.weightGrams ?? 0),
    0,
  );

  // Payment breakdown by method
  const paymentBreakdown: Record<string, number> = {};
  for (const sale of sales) {
    const method = sale.paymentMethod || 'CASH';
    paymentBreakdown[method] = (paymentBreakdown[method] ?? 0) + Number(sale.totalAmount ?? 0);
  }

  // Open approval modal — pre-fill returned = remaining for each item
  const openApproveModal = () => {
    const init: Record<string, { returned: string; damaged: string }> = {};
    for (const it of items) {
      // Backend-тэй ижил: өмнө нь буцаасан, гэмтсэнийг хасна.
      const remaining = (it.loadedQty ?? 0) - (it.soldQty ?? 0) - (it.returnedQty ?? 0) - (it.damagedQty ?? 0);
      if (remaining > 0) {
        init[it.productId] = { returned: String(remaining), damaged: '0' };
      }
    }
    setReturnQty(init);
    setApproveModalOpen(true);
  };

  const handleApprove = async () => {
    // Validate: each item with remaining must sum to remaining
    const itemsPayload: any[] = [];
    for (const it of items) {
      const remaining = (it.loadedQty ?? 0) - (it.soldQty ?? 0) - (it.returnedQty ?? 0) - (it.damagedQty ?? 0);
      if (remaining <= 0) continue;
      const r = returnQty[it.productId] || { returned: '0', damaged: '0' };
      const returned = Number(r.returned) || 0;
      const damaged = Number(r.damaged) || 0;
      if (returned + damaged !== remaining) {
        Alert.alert('Алдаа', `${it.product?.name}: Буцаалт + Гэмтэл = ${remaining} байх ёстой`);
        return;
      }
      itemsPayload.push({ productId: it.productId, returnedQty: returned, damagedQty: damaged });
    }

    setApproving(true);
    try {
      await api.post(`/api/truck-loads/${id}/approve-completion`, { items: itemsPayload });
      invalidateItemCache(`/api/truck-loads/${id}`);
      invalidateListCache('/api/truck-loads');
      setApproveModalOpen(false);
      Alert.alert('Амжилттай', 'Ачилт дууссан. Үлдэгдэл агуулахад буцаагдлаа.');
      refetch();
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Баталгаажуулахад алдаа гарлаа');
    } finally {
      setApproving(false);
    }
  };


  /** Зураасан кодыг SKU-тай тааруулна. */
  const handleScanned = (code: string) => {
    setScannerOpen(false);
    const target = normalizeCode(code);
    // Нэг баркодыг хэд хэдэн бараа хуваалцаж болно — бүх таарцыг цуглуулна.
    const matches = products.filter(p => hasBarcode(p, code));
    if (matches.length === 0) {
      notify('Олдсонгүй', `"${code}" кодтой бараа бүртгэлгүй байна.`);
      return;
    }
    if (matches.length > 1) {
      // Олон бараанд ижил код бүртгэлтэй — жагсаалтаас сонгуулна.
      setScanQuery(code.trim());
      setAddOpen(true);
      return;
    }
    setAddOpen(false);
    setPending(matches[0]);
  };

  const handleAddQty = (result: QuantityResult) => {
    if (!pending) return;
    setAddLines(prev => {
      const idx = prev.findIndex(l => l.productId === pending.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + result.quantity };
        return next;
      }
      return [...prev, { productId: pending.id, name: pending.name, qty: result.quantity }];
    });
    setPending(null);
    setAddOpen(false);
  };

  const submitAdd = async () => {
    if (addLines.length === 0) return;
    const ok = await confirm({
      title: 'Нэмэлт ачилт',
      message: `${addLines.length} нэр төрлийн бараа нэмэх үү? Агуулахаас хасагдана.`,
      confirmLabel: 'Нэмэх',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.post(`/api/truck-loads/${id}/add-items`, {
        items: addLines.map(l => ({ productId: l.productId, loadedQty: l.qty })),
      });
      setAddLines([]);
      refetch();
      invalidateListCache('/api/truck-loads');
      invalidateListCache('/api/products');
    } catch (e: any) {
      notify('Алдаа', e?.response?.data?.message || 'Алдаа');
    } finally { setActionLoading(false); }
  };

  const handleDispatch = async () => {
    const ok = await confirm({
      title: 'Илгээх',
      message: `#${data.loadNumber} ачилтыг илгээх үү?`,
      confirmLabel: 'Илгээх',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.post(`/api/truck-loads/${id}/dispatch`);
      invalidateItemCache(`/api/truck-loads/${id}`);
      invalidateListCache('/api/truck-loads');
      refetch();
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Илгээхэд алдаа гарлаа');
    } finally { setActionLoading(false); }
  };

  return (
    <View style={s.container}>
      <ScreenHeader title={`Ачилт #${data.loadNumber}`} subtitle={status.label} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Status banner */}
        <View style={[s.statusBanner, { backgroundColor: `${status.color}10`, borderColor: `${status.color}30` }]}>
          <View style={[s.statusIconWrap, { backgroundColor: `${status.color}20` }]}>
            <Ionicons name={status.icon} size={24} color={status.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.statusTitle, { color: status.color }]}>{status.label}</Text>
            <Text style={s.statusSub}>{formatDate(data.loadDate || data.createdAt)}</Text>
          </View>
        </View>

        <DetailSection title="ҮНДСЭН МЭДЭЭЛЭЛ">
          <DetailRow label="Дугаар" value={`#${data.loadNumber}`} icon="pricetag-outline" iconColor="#007AFF" bold />
          <DetailRow
            label="Төрөл"
            value={data.locationType === 'RURAL' ? '🏞️ Орон нутаг' : '🏙️ Мөрөн'}
            icon="location-outline"
            iconColor={data.locationType === 'RURAL' ? '#34C759' : '#007AFF'}
          />
          <DetailRow label="Жолооч" value={driverName} icon="person-outline" iconColor="#5856D6" />
          {data.driver?.phone ? <DetailRow label="Утас" value={data.driver.phone} icon="call-outline" iconColor="#34C759" /> : null}
          <DetailRow label="Огноо" value={formatDate(data.loadDate || data.createdAt)} icon="calendar-outline" iconColor="#FF9500" />
          {data.vehicleInfo ? <DetailRow label="Машин" value={data.vehicleInfo} icon="car-outline" iconColor="#AF52DE" /> : null}
          {data.dispatchedAt ? <DetailRow label="Илгээсэн" value={formatDateTime(data.dispatchedAt)} icon="send-outline" iconColor="#5856D6" /> : null}
          {data.completedAt ? <DetailRow label="Дууссан" value={formatDateTime(data.completedAt)} icon="checkmark-circle-outline" iconColor="#34C759" /> : null}
          {data.notes ? <DetailRow label="Тэмдэглэл" value={data.notes} icon="document-text-outline" iconColor="#8E8E93" last /> : null}
        </DetailSection>

        <DetailSection title="ХУРААНГУЙ">
          <View style={s.statRow}>
            <View style={s.statCell}>
              <Text style={s.statLabel}>АЧСАН</Text>
              <Text style={s.statValue}>{totalLoaded}</Text>
            </View>
            <View style={[s.statCell, s.borderL]}>
              <Text style={s.statLabel}>ЗАРСАН</Text>
              <Text style={[s.statValue, { color: '#34C759' }]}>{totalSold}</Text>
            </View>
            <View style={[s.statCell, s.borderL]}>
              <Text style={s.statLabel}>БУЦААСАН</Text>
              <Text style={[s.statValue, { color: '#FF9500' }]}>{totalReturned}</Text>
            </View>
            <View style={[s.statCell, s.borderL]}>
              <Text style={s.statLabel}>ГЭМТЭЛ</Text>
              <Text style={[s.statValue, { color: '#FF3B30' }]}>{totalDamaged}</Text>
            </View>
          </View>
          {totalWeightGrams > 0 ? (
            <View style={s.weightRow}>
              <Text style={s.weightLabel}>Ачилтын нийт жин</Text>
              <Text style={s.weightValue}>{formatWeight(totalWeightGrams)}</Text>
            </View>
          ) : null}
        </DetailSection>

        {sales.length > 0 && (
          <DetailSection title={`БОРЛУУЛАЛТ (${sales.length})`}>
            <TouchableOpacity style={s.toggle} activeOpacity={0.6} onPress={() => setSalesOpen(v => !v)}>
              <Text style={s.toggleText}>{salesOpen ? 'Хураах' : 'Борлуулалтуудыг харах'}</Text>
              <Ionicons name={salesOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#007AFF" />
            </TouchableOpacity>

            {salesOpen && sales.map((sale: any) => (
              <TouchableOpacity
                key={sale.id}
                style={s.saleCard}
                activeOpacity={0.6}
                onPress={() => router.push(`/(admin)/features/truck-sales/${sale.id}` as any)}
              >
                <View style={s.saleHead}>
                  <Text style={s.saleNum}>#{sale.saleNumber}</Text>
                  <View style={[s.payTag, { backgroundColor: (PAYMENT_COLORS[sale.paymentMethod] ?? '#8E8E93') + '18' }]}>
                    <Text style={[s.payTagText, { color: PAYMENT_COLORS[sale.paymentMethod] ?? '#8E8E93' }]}>
                      {paymentLabel(sale.paymentMethod)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Text style={s.saleAmount}>{formatCurrency(sale.totalAmount)}</Text>
                  <Ionicons name="chevron-forward" size={15} color="#C7C7CC" />
                </View>
                <Text style={s.saleMeta} numberOfLines={1}>
                  {sale.customer?.storeName || '—'}
                  {sale.createdAt ? ` · ${formatDateTime(sale.createdAt)}` : ''}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={[s.totalRow]}>
              <Text style={s.totalLabel}>Нийт орлого</Text>
              <Text style={s.totalValue}>{formatCurrency(totalRevenue)}</Text>
            </View>
          </DetailSection>
        )}

        {Object.keys(paymentBreakdown).length > 0 && (
          <DetailSection title="ТӨЛБӨРИЙН ЗАДАРГАА">
            <TouchableOpacity style={s.toggle} activeOpacity={0.6} onPress={() => setBreakdownOpen(v => !v)}>
              <Text style={s.toggleText}>{breakdownOpen ? 'Хураах' : 'Задаргааг харах'}</Text>
              <Ionicons name={breakdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#007AFF" />
            </TouchableOpacity>
            {breakdownOpen && Object.entries(paymentBreakdown).map(([method, amount], idx, arr) => {
              const color = PAYMENT_COLORS[method] || '#8E8E93';
              return (
                <View key={method} style={[s.pmRow, idx < arr.length - 1 && s.borderB]}>
                  <View style={[s.pmDot, { backgroundColor: color }]} />
                  <Text style={s.pmLabel}>{paymentLabel(method)}</Text>
                  <Text style={[s.pmAmount, { color }]}>{formatCurrency(amount)}</Text>
                </View>
              );
            })}
          </DetailSection>
        )}

        {/* Ачилтын түүх — анхны ачилт болон нэмэлт ачилт бүр */}
        {batches.length > 0 && (
          <DetailSection title={`АЧИЛТЫН ТҮҮХ (${batches.length})`}>
            <TouchableOpacity
              style={s.histToggle}
              activeOpacity={0.6}
              onPress={() => setHistoryOpen(v => !v)}
            >
              <Text style={s.histToggleText}>
                {historyOpen ? 'Түүхийг хаах' : 'Түүхийг харах'}
              </Text>
              <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#007AFF" />
            </TouchableOpacity>

            {historyOpen && batches.map((b: any, bi: number) => {
              const qty = (b.items ?? []).reduce((s: number, i: any) => s + (i.quantity ?? 0), 0);
              const first = b.sequence === 1;
              return (
                <View key={b.id} style={s.batch}>
                  <View style={[s.batchAccent, { backgroundColor: first ? '#34C759' : '#FF9500' }]} />
                  <View style={s.batchHead}>
                    <View style={[s.batchTag, { backgroundColor: first ? '#34C75915' : '#FF950015' }]}>
                      <Text style={[s.batchTagText, { color: first ? '#34C759' : '#FF9500' }]}>
                        {first ? 'Анхны ачилт' : `${b.sequence - 1}-р нэмэлт`}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Text style={s.batchQty}>{qty}ш</Text>
                  </View>
                  <Text style={s.batchDate}>
                    {formatDateTime(b.createdAt)}
                    {b.createdBy ? ` · ${b.createdBy.lastName ?? ''} ${b.createdBy.firstName ?? ''}`.trimEnd() : ''}
                  </Text>
                  {(b.items ?? []).map((bi2: any) => (
                    <View key={bi2.id} style={s.batchItem}>
                      <View style={s.bullet} />
                      <Text style={s.batchItemName} numberOfLines={1}>{bi2.product?.name ?? '-'}</Text>
                      <Text style={s.batchItemQty}>
                        {formatQty(bi2.quantity, bi2.product?.unitsPerBox)}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </DetailSection>
        )}

        {/* Нэмэлт ачилт — зөвхөн дуусаагүй ачилтад */}
        {(data.status === 'LOADING' || data.status === 'DISPATCHED') && (
          <DetailSection title="НЭМЭЛТ АЧИЛТ">
            {addLines.map((l) => (
              <View key={l.productId} style={s.addRow}>
                <Text style={s.addName} numberOfLines={1}>{l.name}</Text>
                <Text style={s.addQty}>{l.qty}ш</Text>
                <TouchableOpacity onPress={() => setAddLines(p => p.filter(x => x.productId !== l.productId))}>
                  <Ionicons name="close-circle" size={19} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
            <View style={s.addActions}>
              <TouchableOpacity style={s.addSearchBtn} onPress={() => setAddOpen(true)}>
                <Ionicons name="search" size={17} color="#5856D6" />
                <Text style={s.addSearchText}>Бараа нэмэх</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addScanBtn} onPress={() => setScannerOpen(true)}>
                <Ionicons name="barcode-outline" size={19} color="#fff" />
              </TouchableOpacity>
            </View>
            {addLines.length > 0 && (
              <TouchableOpacity
                style={[s.addConfirm, actionLoading && { opacity: 0.5 }]}
                onPress={submitAdd}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={s.addConfirmText}>
                      Ачилтад нэмэх ({addLines.reduce((s2, l) => s2 + l.qty, 0)}ш)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </DetailSection>
        )}

        {items.length > 0 && (
          <DetailSection title={`БАРАА (${items.length})`}>
            {items.map((it: any, idx: number) => {
              const remaining = (it.loadedQty ?? 0) - (it.soldQty ?? 0) - (it.returnedQty ?? 0) - (it.damagedQty ?? 0);
              return (
                <View key={it.id} style={[s.itemRow, idx < items.length - 1 && s.borderB]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName} numberOfLines={1}>{it.product?.name || '-'}</Text>
                    <Text style={s.itemMeta}>
                      Ачсан {formatQty(it.loadedQty ?? 0, it.product?.unitsPerBox)}
                      {' · '}Зарсан {formatQty(it.soldQty ?? 0, it.product?.unitsPerBox)}
                    </Text>
                    <Text style={s.itemMeta}>
                      Үлдэгдэл {formatQty(remaining, it.product?.unitsPerBox)}
                    </Text>
                  </View>
                  <Text style={s.itemPrice}>{formatCurrency(it.product?.sellingPrice ?? 0)}</Text>
                </View>
              );
            })}
          </DetailSection>
        )}
      </ScrollView>

      {/* Bottom action */}
      {data.status === 'LOADING' && (
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.dispatchBtn} onPress={handleDispatch} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={s.dispatchText}>Илгээх</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {(data.status === 'COMPLETION_REQUESTED' || data.status === 'DISPATCHED') && (
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.dispatchBtn, { backgroundColor: data.status === 'COMPLETION_REQUESTED' ? '#FF3B30' : '#34C759' }]}
            onPress={openApproveModal}
          >
            <Ionicons name="checkmark-done" size={18} color="#fff" />
            <Text style={s.dispatchText}>Дуусгахыг баталгаажуулах</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Approval Modal */}
      <Modal visible={approveModalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Үлдэгдэл бүртгэх</Text>
              <TouchableOpacity onPress={() => setApproveModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalHint}>Бараа болгоны буцаах болон гэмтсэн тоог оруулна уу</Text>

            <ScrollView style={{ maxHeight: 420 }}>
              {items.map((it: any) => {
                const remaining = (it.loadedQty ?? 0) - (it.soldQty ?? 0);
                if (remaining <= 0) return null;
                const r = returnQty[it.productId] || { returned: '0', damaged: '0' };
                const totalEntered = (Number(r.returned) || 0) + (Number(r.damaged) || 0);
                const valid = totalEntered === remaining;
                return (
                  <View key={it.id} style={[s.approveItem, !valid && { borderColor: '#FF3B30', backgroundColor: '#FF3B3008' }]}>
                    <Text style={s.approveItemName}>{it.product?.name}</Text>
                    <Text style={s.approveItemMeta}>Үлдсэн: <Text style={{ fontWeight: '800', color: '#1C1C1E' }}>{remaining}</Text></Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.qtyLabel}>БУЦААХ</Text>
                        <TextInput
                          style={s.qtyInput}
                          keyboardType="number-pad"
                          value={r.returned}
                          onChangeText={(t) => setReturnQty(p => ({ ...p, [it.productId]: { ...r, returned: t } }))}
                          selectTextOnFocus
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.qtyLabel}>ГЭМТСЭН</Text>
                        <TextInput
                          style={s.qtyInput}
                          keyboardType="number-pad"
                          value={r.damaged}
                          onChangeText={(t) => setReturnQty(p => ({ ...p, [it.productId]: { ...r, damaged: t } }))}
                          selectTextOnFocus
                        />
                      </View>
                    </View>
                    {!valid && <Text style={{ fontSize: 11, color: '#FF3B30', marginTop: 4 }}>Нийт {totalEntered} ≠ {remaining}</Text>}
                  </View>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setApproveModalOpen(false)}>
                <Text style={s.cancelBtnText}>Болих</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleApprove} disabled={approving}>
                {approving ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
                <Text style={s.confirmBtnText}>{approving ? 'Хадгалж...' : 'Баталгаажуулах'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ProductPicker
        visible={addOpen}
        products={products}
        onClose={() => setAddOpen(false)}
        initialQuery={scanQuery}
        onSelect={p => setPending(p)}
        onScanRequest={() => setScannerOpen(true)}
      />

      <QuantitySheet
        product={pending}
        onCancel={() => setPending(null)}
        onConfirm={handleAddQty}
        confirmLabel="Жагсаалтад нэмэх"
      />

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScanned}
      />
    </View>
  );
}

const s = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  histToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11 },
  histToggleText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },

  /* Багц — зүүн талд цагийн шугам мэт өнгөт зурвастай карт */
  batch: { backgroundColor: '#FAFBFC', borderRadius: 12, borderWidth: 1, borderColor: '#EDEFF3', padding: 12, marginBottom: 8, overflow: 'hidden' },
  batchAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  batchHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  batchTag: { paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 8 },
  batchTagText: { fontSize: 11, fontWeight: '800' },
  batchQty: { fontSize: 15, fontWeight: '800', color: '#1C1C1E', fontVariant: ['tabular-nums'] },
  batchDate: { fontSize: 11, color: '#9A9AA0', marginTop: 6, marginBottom: 9 },
  batchItem: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C7C7CC' },
  batchItemName: { flex: 1, fontSize: 13, color: '#48484A' },
  batchItemQty: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },

  /* Борлуулалтын карт */
  saleCard: { backgroundColor: '#FAFBFC', borderRadius: 12, borderWidth: 1, borderColor: '#EDEFF3', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  saleHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  payTag: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  payTagText: { fontSize: 10, fontWeight: '800' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  addName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  addQty: { fontSize: 14, fontWeight: '700', color: '#5856D6' },
  addActions: { flexDirection: 'row', gap: 8, paddingVertical: 10 },
  addSearchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, backgroundColor: '#5856D612', borderWidth: 1, borderColor: '#5856D630' },
  addSearchText: { fontSize: 15, fontWeight: '600', color: '#5856D6' },
  addScanBtn: { width: 48, height: 44, borderRadius: 12, backgroundColor: '#5856D6', justifyContent: 'center', alignItems: 'center' },
  addConfirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 48, borderRadius: 12, backgroundColor: '#34C759', marginBottom: 4 },
  addConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0' },
  weightLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  weightValue: { fontSize: 16, fontWeight: '800', color: '#14B8A6' },
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  statusIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 17, fontWeight: '800' },
  statusSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  statRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  borderL: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E8ECF0' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginTop: 4 },

  saleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  borderB: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  saleNum: { fontSize: 13, fontWeight: '700', color: '#007AFF' },
  saleMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  saleAmount: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E8ECF0', backgroundColor: '#F9FAFB' },
  totalLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#34C759' },

  pmRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  pmDot: { width: 10, height: 10, borderRadius: 5 },
  pmLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  pmAmount: { fontSize: 14, fontWeight: '700' },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  itemMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },

  bottomBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8ECF0', padding: 12 },
  dispatchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 14 },
  dispatchText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Approval modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 32, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  modalHint: { fontSize: 12, color: '#8E8E93', marginBottom: 14 },
  approveItem: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  approveItemName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  approveItemMeta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  qtyLabel: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3, marginBottom: 4 },
  qtyInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '600', color: '#1C1C1E', textAlign: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
  confirmBtn: { flex: 2, backgroundColor: '#34C759', borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
