// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useEffect, useRef, useState } from 'react';
import { SAATY_SCALE } from '../../core/models/constants';

interface ComparisonInputProps {
  itemA: string;
  itemB: string;
  value: number | undefined;
  onChange: (value: number) => void;
  mode?: 'importance' | 'preference';
  criterionLabel?: string;
  isFocused?: boolean;
  registerRef?: (el: HTMLDivElement | null) => void;
  /** When set and CR is over threshold, renders a muted ghost marker at the
   *  slider position that would make the judgments consistent. Purely visual
   *  — does not move the thumb. */
  impliedValue?: number;
}

export default function ComparisonInput({
  itemA,
  itemB,
  value,
  onChange,
  mode = 'importance',
  criterionLabel,
  isFocused = false,
  registerRef,
  impliedValue,
}: ComparisonInputProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [showRing, setShowRing] = useState(false);
  const [hoveredPos, setHoveredPos] = useState<number | null>(null);

  useEffect(() => {
    if (!isFocused) return;

    const el = rowRef.current;
    if (el) {
      const reduced = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }

    setShowRing(true);
    const timer = setTimeout(() => setShowRing(false), 2000);
    return () => clearTimeout(timer);
  }, [isFocused]);

  const setRow = (el: HTMLDivElement | null) => {
    rowRef.current = el;
    registerRef?.(el);
  };

  // Slider direction: negative = drag left = prefer left item (itemA),
  //                    positive = drag right = prefer right item (itemB).
  const storedToSlider = (stored: number | undefined): number => {
    if (stored === undefined || stored === null) return 0;
    if (stored >= 1) return -Math.round(stored - 1);   // itemA preferred → left
    return Math.round(1 / stored - 1);                  // itemB preferred → right
  };

  const sliderToStored = (slider: number): number => {
    if (slider < 0) return Math.abs(slider) + 1;        // left drag → itemA (stored ≥ 1)
    if (slider > 0) return 1 / (slider + 1);            // right drag → itemB (stored < 1)
    return 1;
  };

  const sliderValue = storedToSlider(value);
  const isSet = value !== undefined;
  const effectiveSliderValue = hoveredPos ?? sliderValue;
  const isPreviewing = hoveredPos !== null;

  const impliedSliderValue = impliedValue !== undefined ? storedToSlider(impliedValue) : undefined;
  const showGhost = impliedSliderValue !== undefined && impliedSliderValue !== sliderValue;
  const ghostLeftPercent = impliedSliderValue !== undefined
    ? ((impliedSliderValue + 8) / 16) * 100
    : 0;
  const impliedDirectionLabel = (() => {
    if (impliedSliderValue === undefined || impliedSliderValue === 0) return '';
    if (impliedSliderValue < 0) return itemA;
    return itemB;
  })();

  const getLabel = (slider: number): string => {
    if (!isSet && !isPreviewing) return 'Not set';
    const absSlider = Math.abs(slider);
    const entry = SAATY_SCALE.find((s) => s.value === absSlider + 1) ?? SAATY_SCALE[0]!;
    const label = mode === 'preference'
      ? entry.label.replace(/important/g, 'preferred')
      : entry.label;
    if (slider < 0) return `${itemA} — ${label}`;
    if (slider > 0) return `${itemB} — ${label}`;
    return label;
  };

  const thumbColor = sliderValue < 0 ? '#3b82f6' : sliderValue > 0 ? '#f59e0b' : '#9ca3af';

  // 17 intensity bars, one per slider position (-8 to +8)
  // Bars fill outward from center toward the thumb direction (or hover preview).
  const bars = Array.from({ length: 17 }, (_, i) => {
    const pos = i - 8; // -8..+8
    const height = 6 + (Math.abs(pos) / 8) * 22; // 6px at center, 28px at extremes
    const leftPercent = (i / 16) * 100;
    const isActive =
      (effectiveSliderValue < 0 && pos < 0 && pos >= effectiveSliderValue) ||
      (effectiveSliderValue > 0 && pos > 0 && pos <= effectiveSliderValue);
    let color: string;
    if (isActive && effectiveSliderValue < 0) color = '#3b82f6';
    else if (isActive && effectiveSliderValue > 0) color = '#f59e0b';
    else color = 'var(--bar-inactive)';
    return { pos, height, leftPercent, color };
  });

  const previewStored = isPreviewing ? sliderToStored(effectiveSliderValue) : undefined;
  const displayedStored = previewStored ?? value;

  return (
    <div
      ref={setRow}
      className={`p-3 rounded-lg border transition-all ${isSet ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800' : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'}${showRing ? ' ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}`}
    >
      <div className="flex justify-between text-sm mb-1 gap-4">
        <span className={`max-w-[45%] ${effectiveSliderValue < 0 ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-gray-500 dark:text-gray-400'}`}>{itemA}</span>
        <span className={`max-w-[45%] text-right ${effectiveSliderValue > 0 ? 'font-bold text-amber-600 dark:text-amber-400' : 'font-medium text-gray-500 dark:text-gray-400'}`}>{itemB}</span>
      </div>
      <div className="comparison-slider-wrap relative" style={{ height: '50px' }}>
        {/* Intensity bars — top portion. Each bar is clickable; hovering previews. */}
        <div
          className="absolute inset-x-0 top-0 flex justify-between items-end"
          style={{ height: '30px' }}
          onMouseLeave={() => setHoveredPos(null)}
        >
          {bars.map((bar) => (
            <button
              key={bar.pos}
              type="button"
              tabIndex={-1}
              aria-label={`Set comparison to position ${bar.pos}`}
              onClick={() => onChange(sliderToStored(bar.pos))}
              onMouseEnter={() => setHoveredPos(bar.pos)}
              onFocus={() => setHoveredPos(bar.pos)}
              onBlur={() => setHoveredPos(null)}
              className="rounded-sm appearance-none border-0 p-0 cursor-pointer focus:outline-none"
              style={{
                flex: '1 1 0',
                margin: '0 1px',
                height: `${bar.height}px`,
                backgroundColor: bar.color,
                transition: 'background-color 150ms ease-out',
              }}
            />
          ))}
        </div>
        {/* Ghost indicator — muted marker at the consistency-implied slider position */}
        {showGhost && (
          <div
            className="absolute top-0 pointer-events-none"
            style={{
              left: `${ghostLeftPercent}%`,
              transform: 'translateX(-50%)',
              height: '30px',
            }}
            title={`Consistency target${impliedDirectionLabel ? ` — favors ${impliedDirectionLabel}` : ''}`}
            aria-hidden="true"
          >
            <div className="text-[10px] leading-none text-gray-500 dark:text-gray-400 font-semibold -mt-1 select-none">▼</div>
            <div
              className="mx-auto border-l border-dashed border-gray-400 dark:border-gray-500 opacity-70"
              style={{ width: 0, height: '26px' }}
            />
          </div>
        )}
        {/* Slider thumb — below bars */}
        <input
          type="range"
          name="comparisonSlider"
          min={-8}
          max={8}
          value={sliderValue}
          onChange={(e) => onChange(sliderToStored(Number(e.target.value)))}
          aria-label={`${mode === 'importance' ? 'Importance' : 'Preference'} comparison: ${itemA} vs ${itemB}`}
          className="comparison-slider w-full absolute left-0"
          style={{
            '--thumb-color': thumbColor,
            bottom: '4px',
          } as React.CSSProperties}
        />
      </div>
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">
        <span>{getLabel(effectiveSliderValue)}</span>
        {displayedStored !== undefined && displayedStored !== 1 && (
          <span className="ml-2 text-gray-400 dark:text-gray-500">
            ({displayedStored >= 1 ? displayedStored.toFixed(0) : `1/${(1 / displayedStored).toFixed(0)}`})
          </span>
        )}
        {(isSet || isPreviewing) && criterionLabel && (
          <span className="text-gray-400 dark:text-gray-500"> w.r.t. <span className="font-bold text-gray-600 dark:text-gray-300">{criterionLabel}</span></span>
        )}
      </div>
    </div>
  );
}
