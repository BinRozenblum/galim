import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from '../platform';

export function haptic() {
  if (!isNative()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}
