import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';

import { ScreenHeader, DetailSection, DetailRow, LoadingState, ErrorState, notify } from '@/src/components/admin';
import { useItemQuery } from '@/src/hooks/use-item-query';
import { formatCurrency, formatQty, formatDateTime, paymentLabel, PAYMENT_COLORS } from '@/src/lib/format';
import { SaleReceipt, widthForPaper } from '@/src/components/PrintableReceipt';
import { fetchReceiptSettings, DEFAULT_SETTINGS, type ReceiptSettings } from '@/src/lib/receipt-settings';
import { printImageBase64, feedLines, getSavedPrinter, connectPrinter } from '@/src/lib/printer';

/**
 * Түгээлтийн борлуулалтын дэлгэрэнгүй.
 *
 * Ачилтын дэлгэцээс борлуулалт дээр дарахад нээгдэнэ. Баримтыг нөхөж
 * хэвлэх боломжтой — жолоочийн дэлгэцтэй ижил Bluetooth принтерийн урсгал.
 */
export default function TruckSaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, refetch } = useItemQuery<any>(id ? `/api/truck-sales/${id}` : null);
  const [settings, setSettings] = useState<ReceiptSettings>(DEFAULT_SETTINGS);
  const [printing, setPrinting] = useState(false);
  const [printSale, setPrintSale] = useState<any>(null);

  const customerRef = useRef<any>(null);
  const driverRef = useRef<any>(null);

  useEffect(() => {
    fetchReceiptSettings().then(setSettings).catch(() => {});
  }, []);

  if (loading) return <View style={{ flex: 1 }}><ScreenHeader title="Борлуулалт" /><LoadingState /></View>;
  if (error || !data) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Борлуулалт" />
        <ErrorState message={error || 'Олдсонгүй'} onRetry={refetch} />
      </View>
    );
  }

  const items = data.items ?? [];
  const totalQty = items.reduce((s: number, i: any) => s + (i.quantity ?? 0), 0);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const saved = await getSavedPrinter();
      if (!saved) {
        notify('Принтер тохиргоогүй', 'POS дэлгэц дээрээс Bluetooth принтерээ тохируулна уу.');
        return;
      }
      const connected = await connectPrinter(saved.address);
      if (!connected) return;

      // Хэвлэхийн өмнө сервер дээрх хамгийн сүүлийн загварыг татна.
      // Ингэснээр админ "Хадгалах" дарсан даруйд, аппыг дахин нээхгүйгээр
      // шинэ загвараар хэвлэгдэнэ. Серверт хүрэхгүй бол кэшээр үргэлжилнэ.
      let s = settings;
      try { s = await fetchReceiptSettings(); setSettings(s); } catch {}

      // Дэлгэцээс гадуур баримтыг зурах хугацаа өгнө.
      setPrintSale(data);
      await new Promise((r) => setTimeout(r, 300));

      const width = widthForPaper(s.paperWidth);
      if (customerRef.current?.capture) {
        await printImageBase64(await customerRef.current.capture(), width, s.paperWidth);
        await feedLines(2);
      }
      if (s.printTwoCopies && driverRef.current?.capture) {
        await printImageBase64(await driverRef.current.capture(), width, s.paperWidth);
        await feedLines(3);
      } else {
        await feedLines(3);
      }
      notify('Амжилттай', 'Баримт хэвлэгдлээ');
    } catch (e: any) {
      notify('Хэвлэх алдаа', e?.message || 'Алдаа гарлаа');
    } finally {
      setPrinting(false);
      setPrintSale(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6FA' }}>
      <ScreenHeader title={`Борлуулалт #${data.saleNumber}`} subtitle={data.customer?.storeName} />

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 110 }}>
        <DetailSection title="ҮНДСЭН МЭДЭЭЛЭЛ">
          <DetailRow label="Дугаар" value={`#${data.saleNumber}`} icon="pricetag-outline" iconColor="#007AFF" />
          <DetailRow label="Харилцагч" value={data.customer?.storeName || '—'} icon="storefront-outline" iconColor="#EC4899" />
          {data.customer?.phone ? (
            <DetailRow label="Утас" value={data.customer.phone} icon="call-outline" iconColor="#34C759" />
          ) : null}
          <DetailRow
            label="Төлбөр"
            value={paymentLabel(data.paymentMethod)}
            icon="card-outline"
            iconColor={PAYMENT_COLORS[data.paymentMethod] ?? '#8E8E93'}
          />
          {data.createdAt ? (
            <DetailRow label="Огноо" value={formatDateTime(data.createdAt)} icon="calendar-outline" iconColor="#FF9500" />
          ) : null}
        </DetailSection>

        <DetailSection title={`БАРАА (${items.length})`}>
          {items.map((it: any, idx: number) => (
            <View key={it.id} style={[s.item, idx < items.length - 1 && s.borderB]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.itemName} numberOfLines={1}>{it.product?.name ?? '-'}</Text>
                <Text style={s.itemMeta}>
                  {formatQty(it.quantity, it.product?.unitsPerBox)}
                  {' × '}{formatCurrency(it.unitPrice)}
                </Text>
              </View>
              <Text style={s.itemTotal}>{formatCurrency(it.lineTotal ?? it.quantity * it.unitPrice)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Нийт {totalQty}ш</Text>
            <Text style={s.totalValue}>{formatCurrency(data.totalAmount)}</Text>
          </View>
        </DetailSection>

        {data.notes ? (
          <DetailSection title="ТЭМДЭГЛЭЛ">
            <Text style={s.notes}>{data.notes}</Text>
          </DetailSection>
        ) : null}
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={[s.printBtn, printing && { opacity: 0.6 }]} onPress={handlePrint} disabled={printing}>
          {printing ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="print" size={18} color="#fff" />
              <Text style={s.printText}>Баримт хэвлэх</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Хэвлэхэд зориулж дэлгэцээс гадуур зурагдана */}
      {printSale ? (
        <View style={s.offscreen} pointerEvents="none">
          <ViewShot ref={customerRef} options={{ format: 'png', quality: 1, result: 'base64' }}>
            <SaleReceipt
              sale={printSale}
              customer={printSale.customer}
              paymentMethod={printSale.paymentMethod}
              settings={settings}
              copyLabel="ХАРИЛЦАГЧИЙН ХУВЬ"
            />
          </ViewShot>
          {settings.printTwoCopies ? (
            <ViewShot ref={driverRef} options={{ format: 'png', quality: 1, result: 'base64' }}>
              <SaleReceipt
                sale={printSale}
                customer={printSale.customer}
                paymentMethod={printSale.paymentMethod}
                settings={settings}
                copyLabel="ЖОЛООЧИЙН ХУВЬ"
              />
            </ViewShot>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  borderB: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F2F5' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  itemMeta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginLeft: 10 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0',
  },
  totalLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  totalValue: { fontSize: 19, fontWeight: '800', color: '#1C1C1E' },
  notes: { fontSize: 14, color: '#48484A', lineHeight: 20, paddingVertical: 6 },
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 26,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0',
  },
  printBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 50, borderRadius: 14, backgroundColor: '#007AFF',
  },
  printText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});
