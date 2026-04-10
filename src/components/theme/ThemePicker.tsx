'use client';

/**
 * ThemePicker — stacks all three pickers with dividers.
 * Client component so pickers can use Zustand hooks.
 */
import { ColorPresetPicker } from './ColorPresetPicker';
import { TimerShapePicker } from './TimerShapePicker';

export function ThemePicker() {
  return (
    <div className="flex flex-col gap-6">
      <ColorPresetPicker />
      <hr className="border-border" />
      <TimerShapePicker />
    </div>
  );
}
