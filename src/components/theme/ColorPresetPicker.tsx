'use client';

import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { COLOR_PRESETS, PRESET_ORDER, type ColorPresetId } from '@/lib/themes';

export function ColorPresetPicker() {
  const { t } = useTranslation('common');
  const { colorPresetId, setColorPreset } = usePreferencesStore();

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-medium text-foreground">{t('settings.colorTheme')}</p>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('settings.colorTheme')}>
        {PRESET_ORDER.map((id) => {
          const preset = COLOR_PRESETS[id];
          const selected = colorPresetId === id;
          return (
            <button
              key={id}
              id={`color-preset-${id}`}
              role="radio"
              aria-checked={selected}
              onClick={() => setColorPreset(id as ColorPresetId)}
              title={preset.nameKey}
              aria-label={preset.nameKey}
              className="
                relative flex items-center justify-center
                w-9 h-9 rounded-full
                transition-all duration-200
                hover:scale-110 active:scale-95
                focus-visible:outline-none
              "
              style={{
                backgroundColor: preset.preview,
                boxShadow: selected
                  ? `0 0 15px ${preset.preview}, 0 0 0 2px var(--background), 0 0 0 4px ${preset.preview}`
                  : `0 0 0 2px transparent`,
              }}
            >
              {selected && (
                <Check
                  size={14}
                  color="white"
                  strokeWidth={3}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground font-semibold">
        {COLOR_PRESETS[colorPresetId]?.nameKey || 'Unknown Theme'}
      </p>
    </div>
  );
}
