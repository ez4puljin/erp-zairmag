import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, FlatList, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getSavedPrinter, savePrinter, connectPrinter, scanBluetoothDevices,
} from '../lib/printer';

interface Device { address: string; name: string }

/**
 * Bluetooth принтер холбох хэсэг.
 *
 * Урьд нь зөвхөн POS дэлгэц дээр байсан тул борлуулалтын түүхээс баримт
 * хэвлэх гэхэд "POS дээр тохируулна уу" гэж хэлдэг байв. Одоо Профайл
 * дээрээс ч холбож болно.
 */
export function PrinterSetup({ compact = false }: { compact?: boolean }) {
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState<Device | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getSavedPrinter().then(p => setSaved(p ?? null)).catch(() => setSaved(null));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleScan = async () => {
    setScanning(true);
    try {
      setDevices(await scanBluetoothDevices());
    } catch {
      setDevices([]);
    } finally {
      setScanning(false);
    }
  };

  const handleSelect = async (device: Device) => {
    setConnecting(device.address);
    try {
      const ok = await connectPrinter(device.address);
      if (ok) {
        await savePrinter(device.address, device.name);
        setSaved(device);
        setModalOpen(false);
      }
    } finally {
      setConnecting(null);
    }
  };

  const openModal = () => {
    setModalOpen(true);
    handleScan();
  };

  return (
    <>
      <View style={compact ? undefined : s.card}>
        {!compact && <Text style={s.cardTitle}>Принтер тохиргоо</Text>}

        <View style={s.statusRow}>
          <View style={[s.dot, { backgroundColor: saved ? '#34C759' : '#C7C7CC' }]} />
          <Text style={s.statusText} numberOfLines={1}>
            {saved ? saved.name : 'Bluetooth принтер холбогдоогүй'}
          </Text>
        </View>

        <TouchableOpacity style={s.connectBtn} onPress={openModal}>
          <Ionicons name="bluetooth" size={16} color="#007AFF" />
          <Text style={s.connectText}>{saved ? 'Өөр принтер холбох' : 'Принтер холбох'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalOpen(false)} />
          <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Bluetooth принтер</Text>
            <Text style={s.sheetNote}>
              Принтерээ асаагаад утасны Bluetooth тохиргооноос нэг удаа хослуулсан байх шаардлагатай.
            </Text>

            <TouchableOpacity style={[s.scanBtn, scanning && { opacity: 0.6 }]} onPress={handleScan} disabled={scanning}>
              {scanning ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="search" size={16} color="#fff" />
                  <Text style={s.scanText}>Төхөөрөмж хайх</Text>
                </>
              )}
            </TouchableOpacity>

            <FlatList
              data={devices}
              keyExtractor={d => d.address}
              style={{ maxHeight: 280, marginTop: 12 }}
              ListEmptyComponent={
                scanning ? null : <Text style={s.empty}>Төхөөрөмж олдсонгүй</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.device}
                  onPress={() => handleSelect(item)}
                  disabled={connecting !== null}
                >
                  <Ionicons name="print-outline" size={20} color="#007AFF" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.deviceName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.deviceAddr}>{item.address}</Text>
                  </View>
                  {connecting === item.address
                    ? <ActivityIndicator color="#007AFF" />
                    : saved?.address === item.address
                      ? <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                      : null}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={s.closeBtn} onPress={() => setModalOpen(false)}>
              <Text style={s.closeText}>Хаах</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3, marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12, backgroundColor: '#007AFF12',
    borderWidth: 1, borderColor: '#007AFF30', marginTop: 12,
  },
  connectText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D8DEE8', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  sheetNote: { fontSize: 13, color: '#8E8E93', lineHeight: 19, marginTop: 6 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 46, borderRadius: 12, backgroundColor: '#007AFF', marginTop: 14,
  },
  scanText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  empty: { textAlign: 'center', color: '#8E8E93', paddingVertical: 24, fontSize: 14 },
  device: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F2F5',
  },
  deviceName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  deviceAddr: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  closeBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  closeText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
});
