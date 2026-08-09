import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Platform, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Зураасан код уншигч.
 *
 * `expo-camera` нь зөвхөн төхөөрөмж дээр ажилладаг тул модулийг залхуу
 * ачаална — байхгүй үед (хөтчөөр урьдчилан харах, эсвэл камерын зөвшөөрөл
 * өгөөгүй) апп унахгүй, оронд нь кодыг гараар оруулах хэсэг гарна.
 *
 * Гараар оруулах нь зөвхөн нөөц арга биш: USB/Bluetooth сканнерууд кодыг
 * гарын оролт болгон бичдэг тул тэдгээртэй шууд ажиллана.
 */

let CameraModule: any = null;
let cameraLoadAttempted = false;

function getCamera() {
  if (!cameraLoadAttempted) {
    cameraLoadAttempted = true;
    try {
      CameraModule = require('expo-camera');
    } catch {
      CameraModule = null;
    }
  }
  return CameraModule;
}

/**
 * Камераар уншиж чадах эсэх.
 *
 * Худал байсан ч сканнерын товчийг нуух хэрэггүй — тэр үед код гараар
 * оруулах цонх нээгдэнэ.
 */
export function isCameraScanAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  const mod = getCamera();
  return !!mod?.CameraView;
}

/** Уншиж чадах зураасан кодын төрлүүд — хүнсний барааны стандартууд. */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'];

export function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
  hint = 'Зураасан кодыг хүрээнд байрлуулна уу',
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
  hint?: string;
}) {
  const mod = getCamera();
  const cameraPossible = isCameraScanAvailable();
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>(
    cameraPossible ? 'unknown' : 'denied',
  );
  const [manualCode, setManualCode] = useState('');
  // Нэг уншилтад олон удаа дуудагдахаас сэргийлнэ.
  const handled = useRef(false);

  useEffect(() => {
    if (!visible) return;
    handled.current = false;
    setManualCode('');
    if (!cameraPossible || !mod?.Camera?.requestCameraPermissionsAsync) return;
    mod.Camera.requestCameraPermissionsAsync()
      .then((res: any) => setPermission(res?.granted ? 'granted' : 'denied'))
      .catch(() => setPermission('denied'));
  }, [visible, mod, cameraPossible]);

  if (!visible) return null;

  const CameraView = mod?.CameraView;
  const useCamera = permission === 'granted' && !!CameraView;

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScanned(code);
  };

  // Камер ашиглах боломжгүй бол кодыг гараар оруулна.
  if (!useCamera && permission !== 'unknown') {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose} transparent>
        <KeyboardAvoidingView
          style={m.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={m.sheet}>
            <View style={m.handle} />
            <Text style={m.title}>Зураасан код оруулах</Text>
            <Text style={m.note}>
              {cameraPossible
                ? 'Камер ашиглах зөвшөөрөл өгөөгүй байна. Кодыг гараар оруулж болно.'
                : 'Энэ төхөөрөмж дээр камер ашиглах боломжгүй. Кодыг гараар бичих эсвэл сканнераар уншуулна уу.'}
            </Text>
            <TextInput
              style={m.input}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="4820123456789"
              placeholderTextColor="#C7C7CC"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onSubmitEditing={submitManual}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[m.btn, !manualCode.trim() && { opacity: 0.4 }]}
              disabled={!manualCode.trim()}
              onPress={submitManual}
            >
              <Ionicons name="search" size={17} color="#fff" />
              <Text style={m.btnText}>Хайх</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        {useCamera ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            onBarcodeScanned={({ data }: { data: string }) => {
              if (handled.current || !data) return;
              handled.current = true;
              onScanned(data);
            }}
          />
        ) : (
          // Зөвшөөрөл асууж байх хормын төлөв. Татгалзсан бол дээр нь
          // гараар оруулах цонх руу шилжсэн байна.
          <View style={s.center}>
            <ActivityIndicator color="#fff" />
            <Text style={s.msg}>Камер бэлдэж байна...</Text>
          </View>
        )}

        {/* Заагч хүрээ */}
        {useCamera ? (
          <View style={s.overlay} pointerEvents="none">
            <View style={s.frame} />
            <Text style={s.hint}>{hint}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

/** Гараар код оруулах цонхны загвар. */
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 18, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D8DEE8', alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  note: { fontSize: 13, color: '#8E8E93', lineHeight: 19, marginTop: 6 },
  input: {
    height: 52, borderRadius: 12, backgroundColor: '#F5F6FA', borderWidth: 1, borderColor: '#E8ECF0',
    paddingHorizontal: 14, fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginTop: 16,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 50, borderRadius: 14, backgroundColor: '#14B8A6', marginTop: 12,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  msg: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  frame: {
    width: '78%', aspectRatio: 1.6, borderRadius: 16,
    borderWidth: 3, borderColor: '#14B8A6', backgroundColor: 'transparent',
  },
  hint: { color: '#fff', fontSize: 14, marginTop: 18, textAlign: 'center', paddingHorizontal: 30 },
  closeBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 24, right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center',
  },
});
