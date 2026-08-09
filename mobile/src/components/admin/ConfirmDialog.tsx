import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Баталгаажуулах асуулт.
 *
 * `Alert.alert` нь react-native-web дээр хэрэгжээгүй — юу ч харагдахгүй,
 * Promise хэзээ ч бөглөгдөхгүй тул хөтчөөр урьдчилан харахад устгах зэрэг
 * үйлдэл чимээгүй зогсдог. Тиймээс вэб дээр хөтчийн `window.confirm`-ыг
 * ашиглана. Утсан дээр өмнөх шигээ жинхэнэ Alert гарна.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = options.message ? `${options.title}\n\n${options.message}` : options.title;
    return Promise.resolve(
      typeof window !== 'undefined' ? window.confirm(text) : false,
    );
  }

  return new Promise(resolve => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: options.cancelLabel ?? 'Цуцлах', style: 'cancel', onPress: () => resolve(false) },
        {
          text: options.confirmLabel ?? 'Тийм',
          style: options.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Мэдэгдэл харуулах. `confirm`-той ижил шалтгаанаар вэб дээр
 * хөтчийн `alert`-ыг ашиглана.
 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
