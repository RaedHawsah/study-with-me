import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Check, Sparkles, Plus, Loader2, PlayCircle } from 'lucide-react';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { COLOR_PRESETS, PRESET_ORDER, type ColorPresetId } from '@/lib/themes';

const ADMIN_EMAIL = '55raed55@gmail.com';

export function ColorPresetPicker() {
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    colorPresetId, setColorPreset,
    isUploading, uploadGlobalBackground, globalBackgrounds
  } = usePreferencesStore();

  const { user } = useSupabaseAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && colorPresetId) {
      uploadGlobalBackground(colorPresetId, file);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Appearance & Themes ── */}
      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={12} className="text-primary" />
          {t('settings.appearance')}
        </p>
        <div className="flex flex-wrap gap-3" role="radiogroup">
          {PRESET_ORDER.map((id) => {
            const preset = COLOR_PRESETS[id];
            // Match current theme
            const selected = colorPresetId === id;
            return (
              <button
                key={id}
                onClick={() => setColorPreset(id as ColorPresetId)}
                title={preset.nameKey}
                className="
                  relative flex items-center justify-center
                  w-10 h-10 rounded-2xl
                  transition-all duration-300
                  hover:scale-110 active:scale-95
                  group
                "
                style={{
                  backgroundColor: preset.preview,
                  boxShadow: selected
                    ? `0 0 20px ${preset.preview}80, inset 0 0 0 2px rgba(255,255,255,0.2)`
                    : 'none'
                }}
              >
                {selected && <Check size={16} strokeWidth={4} className="text-white" />}
                {!selected && <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Admin Official Upload ── */}
      {isAdmin && (
        <div className="flex flex-col gap-3 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <PlayCircle size={12} />
              Admin: Upload Official Background
            </p>
            <span className="text-[9px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
              Target: {COLOR_PRESETS[colorPresetId]?.nameKey}
            </span>
          </div>

          <div className="relative group">
            <button
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="
                w-full h-24 rounded-2xl border-2 border-dashed border-white/10 bg-white/5
                hover:border-primary/50 hover:bg-primary/5 transition-all duration-300
                flex flex-col items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                overflow-hidden
              "
            >
              {isUploading ? (
                <Loader2 size={24} className="animate-spin text-primary" />
              ) : (
                <>
                  {globalBackgrounds[colorPresetId] ? (
                    <div className="absolute inset-0 w-full h-full">
                      {/\.(mp4|webm)(\?.*)?$/i.test(globalBackgrounds[colorPresetId]) ? (
                        <video src={globalBackgrounds[colorPresetId]} muted className="w-full h-full object-cover" />
                      ) : (
                        <img src={globalBackgrounds[colorPresetId]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ) : null}
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <Plus size={24} className="text-primary group-hover:scale-125 transition-transform" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {globalBackgrounds[colorPresetId] ? 'Replace Official Video' : 'Add Official Video'}
                    </span>
                  </div>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
