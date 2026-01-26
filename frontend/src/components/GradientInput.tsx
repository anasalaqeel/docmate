import React, { useState, useEffect, useCallback } from "react";
import { Input, Slider, Button, Popover, PopoverTrigger, PopoverContent, Tabs, Tab, Card, CardBody } from "@heroui/react";
import { PlusIcon, TrashIcon, AdjustmentsHorizontalIcon, CodeBracketIcon } from "@heroicons/react/24/outline";

export interface GradientInputProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  description?: string;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  disabledMessage?: string;
}

interface GradientStop {
  id: string;
  color: string;
  position: number;
}

const GradientInput: React.FC<GradientInputProps> = ({
  label,
  value = "",
  onChange,
  description,
  placeholder = "linear-gradient(...)",
  className = "",
  isDisabled,
  disabledMessage,
}) => {
  const [internalMode, setInternalMode] = useState<'builder' | 'raw'>('builder');
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<GradientStop[]>([
    { id: '1', color: 'var(--grud-primary, #667eea)', position: 0 },
    { id: '2', color: 'var(--grud-secondary, #764ba2)', position: 100 },
  ]);

  /* 
   * Synchronization Logic:
   * 1. We store the last value we "emitted" to avoid re-parsing our own changes.
   * 2. When 'value' prop changes externally (async load, reset, etc.), we re-parse it.
   */
  const lastEmittedValue = React.useRef("");

  // Reconstruct gradient string when builder state changes
  const generateGradientString = useCallback((newAngle: number, newStops: GradientStop[]) => {
    const sortedStops = [...newStops].sort((a, b) => a.position - b.position);
    const stopsStr = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');
    return `linear-gradient(${newAngle}deg, ${stopsStr})`;
  }, []);

  // Sync internal state -> parent value
  const syncToParent = useCallback((newAngle: number, newStops: GradientStop[]) => {
    const str = generateGradientString(newAngle, newStops);
    lastEmittedValue.current = str;
    onChange(str);
  }, [onChange, generateGradientString]);

  // Sync parent value -> internal state (Initialization & External Updates)
  useEffect(() => {
    // Normalize both for better comparison
    const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
    
    // 1. Skip if value is empty or hasn't changed from what we last emitted
    if (!value || normalize(value) === normalize(lastEmittedValue.current) || internalMode === 'raw') return;

    // 2. Simple parser for "linear-gradient(...)"
    if (value.startsWith("linear-gradient")) {
      try {
        const content = value.match(/linear-gradient\((.*)\)/)?.[1];
        if (content) {
          const parts = content.split(',').map(p => p.trim());
          
          let currentAngle = 180;
          let colorParts = parts;
          
          if (parts[0].includes('deg')) {
            currentAngle = parseInt(parts[0]);
            colorParts = parts.slice(1);
          } else if (parts[0].startsWith('to ')) {
            if (parts[0] === 'to right') currentAngle = 90;
            else if (parts[0] === 'to bottom') currentAngle = 180;
            else if (parts[0] === 'to left') currentAngle = 270;
            else if (parts[0] === 'to top') currentAngle = 0;
            colorParts = parts.slice(1);
          }

          // Use refs/previous state to maintain stable IDs for stops
          const newStops = colorParts.map((part, index) => {
            const matches = part.match(/(#[\da-fA-F]{3,6}|rgba?\([^)]+\)|[a-z]+)\s*(\d+)?%?/i);
            if (matches) {
              const existingStop = stops[index];
              return {
                // Reuse existing ID if possible to prevent remounting sub-components
                id: (existingStop && existingStop.color.toLowerCase() === matches[1].toLowerCase()) 
                    ? existingStop.id 
                    : Math.random().toString(36).substring(2, 9),
                color: matches[1],
                position: matches[2] ? parseInt(matches[2]) : Math.round((index / (colorParts.length - 1)) * 100)
              };
            }
            return null;
          }).filter(Boolean) as GradientStop[];

          if (newStops.length > 0) {
            setAngle(currentAngle);
            setStops(newStops);
            lastEmittedValue.current = value;
          }
        }
      } catch (e) {
        console.warn("Failed to parse gradient:", e);
      }
    }
  }, [value, internalMode, stops]); 

  const handleStopChange = (id: string, updates: Partial<GradientStop>) => {
    if (isDisabled) return;
    const newStops = stops.map(s => s.id === id ? { ...s, ...updates } : s);
    setStops(newStops);
    syncToParent(angle, newStops);
  };

  const addStop = () => {
    if (isDisabled) return;
    const newStop = { id: Math.random().toString(36).substr(2, 9), color: 'var(--grud-surface, #ffffff)', position: 50 };
    const newStops = [...stops, newStop];
    setStops(newStops);
    syncToParent(angle, newStops);
  };

  const removeStop = (id: string) => {
    if (isDisabled || stops.length <= 2) return;
    const newStops = stops.filter(s => s.id !== id);
    setStops(newStops);
    syncToParent(angle, newStops);
  };

  const handleAngleChange = (v: number | number[]) => {
    if (isDisabled) return;
    const val = Array.isArray(v) ? v[0] : v;
    setAngle(val);
    syncToParent(val, stops);
  };

  return (
    <div className={`space-y-3 ${className} group`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium transition-colors ${isDisabled ? "text-default-400" : "text-[var(--grud-text)]"}`}>
            {label}
          </label>
          {isDisabled && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-default-100 text-default-500 border border-default-200">
              <span className="text-[9px] font-bold uppercase">Static</span>
            </div>
          )}
        </div>
        <div className="flex bg-[var(--grud-surface-alt)] rounded-lg p-0.5 border border-[var(--grud-border-color)]">
          <button
            disabled={isDisabled}
            onClick={() => setInternalMode('builder')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              internalMode === 'builder' 
                ? 'bg-[var(--grud-surface)] text-[var(--grud-primary)] shadow-sm' 
                : 'text-[var(--grud-text-secondary)] hover:text-[var(--grud-text)]'
            } ${isDisabled ? "cursor-default opacity-50" : ""}`}
          >
            Builder
          </button>
          <button
            disabled={isDisabled}
            onClick={() => setInternalMode('raw')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              internalMode === 'raw' 
                ? 'bg-[var(--grud-surface)] text-[var(--grud-primary)] shadow-sm' 
                : 'text-[var(--grud-text-secondary)] hover:text-[var(--grud-text)]'
            } ${isDisabled ? "cursor-default opacity-50" : ""}`}
          >
            Raw CSS
          </button>
        </div>
      </div>

      {/* Preview */}
      <div 
        className={`h-12 w-full rounded-md border border-[var(--grud-border-color)] ${isDisabled ? "opacity-50" : ""}`}
        style={{ background: value || 'transparent' }}
      />
      
      {isDisabled && disabledMessage && (
        <p className="text-xs text-default-500 font-medium bg-default-100 p-2 rounded-lg border border-default-200">
          💡 {disabledMessage}
        </p>
      )}

      {internalMode === 'raw' ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          description={description}
          variant="bordered"
          size="sm"
          isDisabled={isDisabled}
          startContent={<CodeBracketIcon className="w-4 h-4 text-default-400" />}
        />
      ) : (
        <div className={`space-y-4 p-4 rounded-lg bg-[var(--grud-surface-alt)] border border-[var(--grud-border-color)] ${isDisabled ? "pointer-events-none" : ""}`}>
          {/* Angle Slider */}
          <div className="flex items-center gap-4">
             <div className="w-10 text-xs font-medium text-[var(--grud-text-secondary)]">Angle</div>
             <Slider 
               isDisabled={isDisabled}
               size="sm"
               step={1}
               minValue={0}
               maxValue={360}
               value={angle}
               onChange={handleAngleChange}
               className="flex-1"
               aria-label="Gradient angle"
               startContent={<span className="text-xs w-8">{angle}°</span>}
             />
          </div>

          {/* Stops */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--grud-text-secondary)] mb-2">Color Stops</div>
            {stops.map((stop, i) => (
              <div key={stop.id} className="flex items-center gap-3">
                {/* Color Input */}
                <div className="relative">
                    <input 
                        disabled={isDisabled}
                        type="color" 
                        value={stop.color} 
                        onChange={(e) => handleStopChange(stop.id, { color: e.target.value })}
                        className={`w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                    />
                </div>
                
                {/* Position Slider */}
                <Slider 
                  isDisabled={isDisabled}
                  size="sm"
                  step={1}
                  minValue={0}
                  maxValue={100}
                  value={stop.position}
                  onChange={(v) => handleStopChange(stop.id, { position: Array.isArray(v) ? v[0] : v })}
                  className="flex-1"
                  aria-label={`Stop ${i + 1} position`}
                />
                <span className="text-xs w-8 text-right">{stop.position}%</span>

                {/* Remove Button */}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  isDisabled={isDisabled || stops.length <= 2}
                  onPress={() => removeStop(stop.id)}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button 
            size="sm" 
            variant="flat" 
            isDisabled={isDisabled}
            startContent={<PlusIcon className="w-4 h-4" />}
            onPress={addStop}
            className="w-full"
          >
            Add Color Stop
          </Button>
        </div>
      )}
    </div>
  );
};

export default GradientInput;
