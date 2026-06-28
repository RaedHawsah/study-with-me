'use client';

import { useCallback } from 'react';
import { useRoomStore } from '@/store/useRoomStore';
import { useLocalParticipant } from '@livekit/components-react';

export function useMediaStream() {
  const { localParticipant } = useLocalParticipant();

  const toggleMic = useCallback(async () => {
    if (!localParticipant) return;
    try {
      const isEnabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!isEnabled);
      useRoomStore.getState().setMicOn(!isEnabled);
    } catch (err: any) {
      console.error('Failed to toggle mic:', err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        alert(
          '⚠️ تم رفض إذن الوصول للمايكروفون من المتصفح!\n\n' +
          'لحل المشكلة وتشغيل المايك:\n' +
          '1. اضغط على أيقونة القفل 🔒 أو الإعدادات بجانب رابط الموقع في شريط العنوان بالأعلى.\n' +
          '2. قم بتغيير إذن المايكروفون (Microphone) إلى "سماح" (Allow).\n' +
          '3. أعد تحميل الصفحة وجرب مجدداً.'
        );
      } else {
        alert(`تعذر الوصول للمايكروفون: ${err?.message || err}`);
      }
    }
  }, [localParticipant]);

  const toggleCamera = useCallback(async () => {
    if (!localParticipant) return;
    try {
      const isEnabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!isEnabled);
      useRoomStore.getState().setCameraOn(!isEnabled);
    } catch (err: any) {
      console.error('Failed to toggle camera:', err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        alert(
          '⚠️ تم رفض إذن الوصول للكاميرا من المتصفح!\n\n' +
          'لحل المشكلة وتشغيل الكاميرا:\n' +
          '1. اضغط على أيقونة القفل 🔒 أو الإعدادات بجانب رابط الموقع في شريط العنوان بالأعلى.\n' +
          '2. قم بتغيير إذن الكاميرا (Camera) إلى "سماح" (Allow).\n' +
          '3. أعد تحميل الصفحة وجرب مجدداً.'
        );
      } else {
        alert(`تعذر الوصول للكاميرا: ${err?.message || err}. يرجى التحقق من توصيل الكاميرا أو إعدادات النظام.`);
      }
    }
  }, [localParticipant]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant) return;
    try {
      const isEnabled = localParticipant.isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(!isEnabled);
      useRoomStore.getState().setScreenOn(!isEnabled);
    } catch (err: any) {
      console.error('Failed to share screen:', err);
      alert(
        '⚠️ تعذر مشاركة الشاشة!\n\n' +
        'تأكد من:\n' +
        '1. إعطاء المتصفح إذن تسجيل الشاشة من إعدادات النظام (خاصة لمستخدمي macOS/Windows).\n' +
        '2. عدم إلغاء نافذة اختيار الشاشة عند ظهورها.'
      );
    }
  }, [localParticipant]);

  return {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    stopAll: () => {
      // LiveKit handles cleanup on disconnect automatically
    }
  };
}
