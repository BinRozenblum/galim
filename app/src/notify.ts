import { LocalNotifications } from '@capacitor/local-notifications';
import { t } from './i18n';
import { isNative, platform } from './platform';

const ID = 1001;
const CHANNEL = 'galim-daily';

export type ReminderResult = 'ok' | 'denied' | 'error';

/**
 * One quiet, inexact daily notification. Permission is requested only here,
 * i.e. only when the user turns the reminder on.
 */
export async function scheduleReminder(hhmm: string, ask = true): Promise<ReminderResult> {
  if (!isNative()) return 'ok';
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      if (!ask) return 'denied';
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== 'granted') return 'denied';
    if (platform() === 'android') {
      await LocalNotifications.createChannel({ id: CHANNEL, name: t('reminder'), importance: 3, visibility: 0, vibration: false });
    }
    await LocalNotifications.cancel({ notifications: [{ id: ID }] }).catch(() => {});
    const [hour, minute] = hhmm.split(':').map(Number);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: ID,
          title: t('reminderTitle'),
          body: t('reminderBody'),
          schedule: { on: { hour, minute }, allowWhileIdle: false },
          channelId: CHANNEL,
          smallIcon: 'ic_stat_galim',
          iconColor: '#6D28D9',
          // inexact alarm on Android: no SCHEDULE_EXACT_ALARM permission is declared
          ...({ isExactNotification: false } as object),
        },
      ],
    });
    return 'ok';
  } catch (e) {
    console.error('reminder', e);
    return 'error';
  }
}

export async function cancelReminder(): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.cancel({ notifications: [{ id: ID }] }).catch(() => {});
}

export async function pendingReminders(): Promise<unknown> {
  if (!isNative()) return [];
  return (await LocalNotifications.getPending()).notifications;
}
