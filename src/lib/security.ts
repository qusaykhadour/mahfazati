import * as LocalAuthentication from 'expo-local-authentication';

/** مدة الغياب قبل القفل التلقائي: ربع ساعة */
export const AUTO_LOCK_MS = 15 * 60 * 1000;

export interface BiometricStatus {
  available: boolean;
  enrolled: boolean;
  /** اسم الطريقة: بصمة/وجه — للنص بالمشروع */
  label: string;
}

export async function checkBiometric(): Promise<BiometricStatus> {
  try {
    const [hasHardware, enrolled, methods] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const hasFace = methods.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasIris = methods.includes(LocalAuthentication.AuthenticationType.IRIS);
    const label = hasFace || hasIris ? 'وجهك' : 'بصمة إصبعك';
    return { available: hasHardware, enrolled, label };
  } catch {
    return { available: false, enrolled: false, label: 'بصمة إصبعك' };
  }
}

export async function authenticate(promptLabel: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptLabel,
      cancelLabel: 'إلغاء',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
