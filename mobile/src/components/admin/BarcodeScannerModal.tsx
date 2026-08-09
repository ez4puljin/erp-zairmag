import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Зураасан код уншигч.
 *
 * `expo-camera` нь зөвхөн төхөөрөмж дээр ажилладаг тул модулийг залхуу
 * ачаална — байхгүй үед (ж нь хөтчөөр урьдчилан харах) апп унахгүй,
 * зүгээр л сканнерын товч харагдахгүй.
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

/** Камераар сканнердах боломжтой эсэх. */
export function isScannerAvailable(): boolean {
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
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  // Нэг уншилтад олон удаа дуудагдахаас сэргийлнэ.
  const handled = useRef(false);

  useEffect(() => {
    if (!visible || !mod?.Camera?.requestCameraPermissionsAsync) return;
    handled.current = false;
    mod.Camera.requestCameraPermissionsAsync()
      .then((res: any) => setPermission(res?.granted ? 'granted' : 'denied'))
      .catch(() => setPermission('denied'));
  }, [visible, mod]);

  if (!visible) return null;

  const CameraView = mod?.CameraView;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        {permission === 'granted' && CameraView ? (
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
          <View style={s.center}>
            {permission === 'unknown' ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={s.msg}>Камер бэлдэж байна...</Text>
              </>
            ) : (
              <>
                <Ionicons name="camera-outline" size={40} color="#8E8E93" />
                <Text style={s.msg}>
                  Камер ашиглах зөвшөөрөл өгөөгүй байна.{'\n'}
                  Тохиргооноос зөвшөөрөл олгоно уу.
                </Text>
              </>
            )}
          </View>
        )}

        {/* Заагч хүрээ */}
        {permission === 'granted' ? (
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
