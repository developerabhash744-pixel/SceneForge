import React, { useState, useEffect } from 'react';
import type { SceneObject, AnimationTrack } from '../types';
import { 
  KeyRound, 
  Plus, 
  Trash2, 
  ArrowDownToLine, 
  Wrench,
  Camera,
  Globe,
  Box,
  Sliders,
  Circle
} from 'lucide-react';

interface InspectorProps {
  object: SceneObject | null;
  currentFrame: number;
  editorState: any;
  onUpdateState: (updates: any) => void;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
  onToggleKeyframe: (id: string, property: AnimationTrack['property'], frame: number, value: number[]) => void;
  onDeleteObject: (id: string) => void;
  onDropToGround?: (id: string) => void;
  onDuplicateObject?: (id: string) => void;
}

// A helper numeric input that allows typing decimals, negative numbers, and incomplete inputs smoothly
interface NumberInputProps {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}

function NumberInput({ label, value, step = 0.1, min, max, onChange }: NumberInputProps) {
  const [tempValue, setTempValue] = useState(value.toString());

  useEffect(() => {
    // Keep local string in sync with prop updates (e.g. from gizmo movement)
    setTempValue(Number(value.toFixed(3)).toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setTempValue(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      let finalVal = parsed;
      if (min !== undefined) finalVal = Math.max(min, finalVal);
      if (max !== undefined) finalVal = Math.min(max, finalVal);
      onChange(finalVal);
    }
  };

  const handleBlur = () => {
    // Revert to clean formatted string if input was left invalid (e.g., just '-' or empty)
    const parsed = parseFloat(tempValue);
    if (isNaN(parsed)) {
      setTempValue(value.toString());
    } else {
      let finalVal = parsed;
      if (min !== undefined) finalVal = Math.max(min, finalVal);
      if (max !== undefined) finalVal = Math.min(max, finalVal);
      setTempValue(Number(finalVal.toFixed(3)).toString());
      onChange(finalVal);
    }
  };

  return (
    <div className="number-input-field" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
      <span className="field-label" style={{ fontSize: '9px', opacity: 0.5, textTransform: 'uppercase' }}>{label}</span>
      <input
        type="number"
        step={step}
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="number-input"
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '10px',
          padding: '4px',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

export function Inspector({
  object,
  currentFrame,
  editorState,
  onUpdateState,
  onUpdateObject,
  onToggleKeyframe,
  onDeleteObject,
  onDropToGround,
  onDuplicateObject,
}: InspectorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [activeTab, setActiveTab] = useState<'tool' | 'render' | 'world' | 'object' | 'modifiers' | 'material'>(object ? 'object' : 'tool');

  useEffect(() => {
    if (object) {
      setActiveTab('object');
    } else {
      setActiveTab('tool');
    }
  }, [object?.id]);

  // Check if a property has a keyframe at the current frame
  const hasKeyframe = (property: AnimationTrack['property']) => {
    if (!object) return false;
    const track = object.tracks.find((t) => t.property === property);
    return track ? track.keyframes.some((k) => k.frame === currentFrame) : false;
  };



  // Toggle keyframe helper
  const handleKeyframeClick = (property: AnimationTrack['property']) => {
    if (!object) return;
    let value: number[] = [];
    switch (property) {
      case 'position':
        value = [...object.position];
        break;
      case 'rotation':
        value = [...object.rotation];
        break;
      case 'scale':
        value = [...object.scale];
        break;
      case 'color':
        const hex = object.color || '#ffffff';
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        value = [r, g, b];
        break;
      case 'intensity':
        value = [object.intensity ?? 1.0];
        break;
      case 'emissive':
        const emHex = object.emissive || '#000000';
        const er = parseInt(emHex.slice(1, 3), 16) / 255;
        const eg = parseInt(emHex.slice(3, 5), 16) / 255;
        const eb = parseInt(emHex.slice(5, 7), 16) / 255;
        value = [er, eg, eb];
        break;
      case 'emissiveIntensity':
        value = [object.emissiveIntensity ?? 1.0];
        break;
    }
    onToggleKeyframe(object.id, property, currentFrame, value);
  };

  // Add custom metadata tag
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!object || !newKey.trim()) return;
    const key = newKey.trim();
    const val = newValue.trim();

    const updatedProps = { ...object.customProperties, [key]: val };
    onUpdateObject(object.id, { customProperties: updatedProps });
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveTag = (key: string) => {
    if (!object) return;
    const updatedProps = { ...object.customProperties };
    delete updatedProps[key];
    onUpdateObject(object.id, { customProperties: updatedProps });
  };

  const isLight = object ? (
    object.type === 'directionalLight' ||
    object.type === 'pointLight' ||
    object.type === 'spotLight'
  ) : false;

  const modifiers = (object?.customProperties?.modifiers as any[]) || [];

  const handleAddModifier = (type: 'array' | 'mirror') => {
    if (!object) return;
    const newMod = type === 'array' 
      ? { type: 'array', count: 3, offsetX: 1.5, offsetY: 0, offsetZ: 0 }
      : { type: 'mirror', mirrorX: true, mirrorY: false, mirrorZ: false };
    
    const updatedProps = {
      ...object.customProperties,
      modifiers: [...modifiers, newMod]
    };
    onUpdateObject(object.id, { customProperties: updatedProps });
  };

  const handleUpdateModifier = (index: number, updates: any) => {
    if (!object) return;
    const updated = [...modifiers];
    updated[index] = { ...updated[index], ...updates };
    onUpdateObject(object.id, { customProperties: { ...object.customProperties, modifiers: updated } });
  };

  const handleRemoveModifier = (index: number) => {
    if (!object) return;
    const updated = modifiers.filter((_, i) => i !== index);
    onUpdateObject(object.id, { customProperties: { ...object.customProperties, modifiers: updated } });
  };

  return (
    <aside className="editor-inspector" style={{ display: 'flex', height: '100%', background: '#18181c', color: 'var(--text-main)', borderLeft: '1px solid rgba(255,255,255,0.05)', boxSizing: 'border-box' }}>
      {/* Left Vertical Icon Tabstrip */}
      <div className="properties-tabstrip" style={{
        width: '36px',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: '12px',
        background: '#141416',
        flexShrink: 0
      }}>
        {[
          { id: 'tool', icon: Wrench, title: 'Active Tool properties' },
          { id: 'render', icon: Camera, title: 'Render/Viewport shading settings' },
          { id: 'world', icon: Globe, title: 'World environment settings' },
          { id: 'object', icon: Box, title: 'Object properties' },
          { id: 'modifiers', icon: Sliders, title: 'Modifiers stack' },
          { id: 'circle', icon: Circle, title: 'Material properties' }
        ].map((tab) => {
          const TabIcon = tab.icon;
          // map 'circle' tab to 'material' content
          const mappedId = tab.id === 'circle' ? 'material' : tab.id;
          const isActive = activeTab === mappedId;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(mappedId as any)}
              title={tab.title}
              style={{
                background: isActive ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                border: 'none',
                color: isActive ? 'rgb(0, 240, 255)' : 'var(--text-secondary)',
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-main)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <TabIcon size={14} />
            </button>
          );
        })}
      </div>

      {/* Right Properties Page */}
      <div className="properties-page" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '12px', boxSizing: 'border-box' }}>
        
        {/* TAB 1: TOOL PROPERTIES */}
        {activeTab === 'tool' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Active Tool & Snapping</h3>
            
            {/* Coordinate Space */}
            <div className="inspector-group">
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Coordinate Space</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['local', 'world'].map((space) => {
                  const active = editorState.transformSpace === space;
                  return (
                    <button
                      key={space}
                      onClick={() => onUpdateState({ transformSpace: space })}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        background: active ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                        border: active ? '1px solid rgb(0, 240, 255)' : '1px solid rgba(255,255,255,0.1)',
                        color: active ? 'rgb(0, 240, 255)' : 'var(--text-secondary)',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                    >
                      {space}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid Snapping */}
            <div className="inspector-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Enable Snapping</span>
                <input
                  type="checkbox"
                  checked={editorState.snapEnabled}
                  onChange={(e) => onUpdateState({ snapEnabled: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              {editorState.snapEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Translation increment */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>Translation Grid</span>
                    <select
                      value={editorState.snapTranslation}
                      onChange={(e) => onUpdateState({ snapTranslation: parseFloat(e.target.value) })}
                      style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', borderRadius: '4px', padding: '2px 4px' }}
                    >
                      <option value={0.1}>0.1m</option>
                      <option value={0.25}>0.25m</option>
                      <option value={0.5}>0.5m</option>
                      <option value={1.0}>1.0m</option>
                    </select>
                  </div>

                  {/* Rotation increment */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>Rotation Angle</span>
                    <select
                      value={editorState.snapRotation}
                      onChange={(e) => onUpdateState({ snapRotation: parseFloat(e.target.value) })}
                      style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', borderRadius: '4px', padding: '2px 4px' }}
                    >
                      <option value={5}>5°</option>
                      <option value={15}>15°</option>
                      <option value={45}>45°</option>
                      <option value={90}>90°</option>
                    </select>
                  </div>

                  {/* Scale increment */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>Scale Factor</span>
                    <select
                      value={editorState.snapScale}
                      onChange={(e) => onUpdateState({ snapScale: parseFloat(e.target.value) })}
                      style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', borderRadius: '4px', padding: '2px 4px' }}
                    >
                      <option value={0.05}>0.05x</option>
                      <option value={0.1}>0.1x</option>
                      <option value={0.25}>0.25x</option>
                      <option value={0.5}>0.5x</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: RENDER PROPERTIES */}
        {activeTab === 'render' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Render Shading & Post-Process</h3>
            
            {/* Viewport Shading modes */}
            <div className="inspector-group">
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Viewport Shading Preset</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                {[
                  { id: 'wireframe', label: 'Wireframe' },
                  { id: 'solid', label: 'Solid Shade' },
                  { id: 'material', label: 'Material' },
                  { id: 'rendered', label: 'Eevee Render' }
                ].map((shade) => {
                  const active = editorState.shadingMode === shade.id;
                  return (
                    <button
                      key={shade.id}
                      onClick={() => onUpdateState({ shadingMode: shade.id })}
                      style={{
                        padding: '6px 4px',
                        background: active ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                        border: active ? '1px solid rgb(0, 240, 255)' : '1px solid rgba(255,255,255,0.1)',
                        color: active ? 'rgb(0, 240, 255)' : 'var(--text-secondary)',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {shade.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bloom post-processing */}
            <div className="inspector-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Eevee Bloom Effect</span>
                <input
                  type="checkbox"
                  checked={editorState.bloomEnabled}
                  onChange={(e) => onUpdateState({ bloomEnabled: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WORLD PROPERTIES */}
        {activeTab === 'world' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>World Sky & Atmosphere</h3>
            
            {/* Skybox preset */}
            <div className="inspector-group">
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Sky Environment</label>
              <select
                value={editorState.skyboxPreset}
                onChange={(e) => onUpdateState({ skyboxPreset: e.target.value })}
                style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px', borderRadius: '4px', padding: '6px' }}
              >
                <option value="noon">Clear Noon Day</option>
                <option value="sunset">Sunset Skies</option>
                <option value="space">Deep Space Starfield</option>
                <option value="stormy">Overcast Stormy</option>
              </select>
            </div>

            {/* Skybox tint */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Horizon Color Tint</span>
              <input
                type="color"
                value={editorState.skyboxTint || '#ffffff'}
                onChange={(e) => onUpdateState({ skyboxTint: e.target.value })}
                style={{ width: '28px', height: '20px', border: 'none', background: 'none', cursor: 'pointer' }}
              />
            </div>

            {/* Atmospheric Fog */}
            <div className="inspector-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Atmospheric Fog</span>
                <input
                  type="checkbox"
                  checked={editorState.fogEnabled}
                  onChange={(e) => onUpdateState({ fogEnabled: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              {editorState.fogEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>Fog Color</span>
                    <input
                      type="color"
                      value={editorState.fogColor}
                      onChange={(e) => onUpdateState({ fogColor: e.target.value })}
                      style={{ width: '28px', height: '20px', border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>
                      <span>Fog Density</span>
                      <span>{editorState.fogDensity.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.001}
                      max={0.1}
                      step={0.001}
                      value={editorState.fogDensity}
                      onChange={(e) => onUpdateState({ fogDensity: parseFloat(e.target.value) })}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: OBJECT PROPERTIES */}
        {activeTab === 'object' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Object Hierarchy & Transform</h3>
            
            {!object ? (
              <div className="empty-message" style={{ padding: '24px 8px', textAlign: 'center', opacity: 0.5, fontSize: '11px' }}>
                No active object. Select an object in the viewport to inspect its parameters.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Object name and lock */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className="object-type-badge">{object.type.toUpperCase()}</span>
                  <input
                    type="text"
                    value={object.name}
                    onChange={(e) => onUpdateObject(object.id, { name: e.target.value })}
                    className="inspector-name-input"
                    style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}
                  />
                </div>

                {/* Transform Vectors */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {/* Position */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Position (m)</span>
                      <button
                        onClick={() => handleKeyframeClick('position')}
                        className={`keyframe-dot-btn ${hasKeyframe('position') ? 'active' : ''}`}
                        title="Keyframe Position"
                      >
                        <KeyRound size={12} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <NumberInput label="X" value={object.position[0]} onChange={(v) => { const next = [...object.position]; next[0] = v; onUpdateObject(object.id, { position: next as any }); }} />
                      <NumberInput label="Y" value={object.position[1]} onChange={(v) => { const next = [...object.position]; next[1] = v; onUpdateObject(object.id, { position: next as any }); }} />
                      <NumberInput label="Z" value={object.position[2]} onChange={(v) => { const next = [...object.position]; next[2] = v; onUpdateObject(object.id, { position: next as any }); }} />
                    </div>
                  </div>

                  {/* Rotation */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Rotation (°)</span>
                      <button
                        onClick={() => handleKeyframeClick('rotation')}
                        className={`keyframe-dot-btn ${hasKeyframe('rotation') ? 'active' : ''}`}
                        title="Keyframe Rotation"
                      >
                        <KeyRound size={12} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <NumberInput label="X" value={object.rotation[0]} onChange={(v) => { const next = [...object.rotation]; next[0] = v; onUpdateObject(object.id, { rotation: next as any }); }} />
                      <NumberInput label="Y" value={object.rotation[1]} onChange={(v) => { const next = [...object.rotation]; next[1] = v; onUpdateObject(object.id, { rotation: next as any }); }} />
                      <NumberInput label="Z" value={object.rotation[2]} onChange={(v) => { const next = [...object.rotation]; next[2] = v; onUpdateObject(object.id, { rotation: next as any }); }} />
                    </div>
                  </div>

                  {/* Scale */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Scale</span>
                      <button
                        onClick={() => handleKeyframeClick('scale')}
                        className={`keyframe-dot-btn ${hasKeyframe('scale') ? 'active' : ''}`}
                        title="Keyframe Scale"
                      >
                        <KeyRound size={12} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <NumberInput label="X" value={object.scale[0]} onChange={(v) => { const next = [...object.scale]; next[0] = v; onUpdateObject(object.id, { scale: next as any }); }} />
                      <NumberInput label="Y" value={object.scale[1]} onChange={(v) => { const next = [...object.scale]; next[1] = v; onUpdateObject(object.id, { scale: next as any }); }} />
                      <NumberInput label="Z" value={object.scale[2]} onChange={(v) => { const next = [...object.scale]; next[2] = v; onUpdateObject(object.id, { scale: next as any }); }} />
                    </div>
                  </div>
                </div>

                {/* Parent configuration */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Object Parent</span>
                  <select
                    value={object.parentId || ''}
                    onChange={(e) => onUpdateObject(object.id, { parentId: e.target.value || null })}
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', borderRadius: '4px', padding: '3px' }}
                  >
                    <option value="">None (Root Scene)</option>
                  </select>
                </div>

                {/* Light Properties */}
                {isLight && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Intensity</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => handleKeyframeClick('intensity')} className={`keyframe-dot-btn ${hasKeyframe('intensity') ? 'active' : ''}`}><KeyRound size={10} /></button>
                        <input type="range" min={0} max={20} step={0.1} value={object.intensity ?? 1.0} onChange={(e) => onUpdateObject(object.id, { intensity: parseFloat(e.target.value) })} style={{ width: '60px' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Drop to Ground, lock toggles */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {onDropToGround && (
                    <button
                      onClick={() => onDropToGround(object.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-main)',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowDownToLine size={12} />
                      <span>Drop to Grid</span>
                    </button>
                  )}
                  <button
                    onClick={() => onUpdateObject(object.id, { locked: !object.locked })}
                    style={{
                      padding: '6px 12px',
                      background: object.locked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: object.locked ? '1px solid rgb(239, 68, 68)' : '1px solid rgba(255,255,255,0.1)',
                      color: object.locked ? 'rgb(239, 68, 68)' : 'var(--text-secondary)',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {object.locked ? 'Locked' : 'Lock Vector'}
                  </button>
                </div>

                {/* Duplicate / Delete Object Actions */}
                <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {onDuplicateObject && (
                    <button
                      onClick={() => onDuplicateObject(object.id)}
                      style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#fff', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Duplicate Object
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm(`Delete "${object.name}"?`)) onDeleteObject(object.id); }}
                    style={{ padding: '6px 10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: 'rgb(239, 68, 68)', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 5: MODIFIERS STACK */}
        {activeTab === 'modifiers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Modifiers Stack</h3>
            
            {!object ? (
              <div className="empty-message" style={{ padding: '24px 8px', textAlign: 'center', opacity: 0.5, fontSize: '11px' }}>
                No active object selected to apply mesh modifiers.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Add Modifier dropdown */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddModifier(e.target.value as any);
                        e.target.value = '';
                      }
                    }}
                    style={{ width: '100%', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.4)', color: 'rgb(34, 211, 238)', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="" style={{ background: '#09090b', color: '#888' }}>-- Add Mesh Modifier --</option>
                    <option value="array" style={{ background: '#09090b', color: '#fff' }}>Array Modifier</option>
                    <option value="mirror" style={{ background: '#09090b', color: '#fff' }}>Mirror Modifier</option>
                  </select>
                </div>

                {/* Modifiers List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {modifiers.map((mod: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative'
                      }}
                    >
                      {/* Modifier Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgb(6, 182, 212)' }}>
                          {mod.type === 'array' ? 'Array Modifier' : 'Mirror Modifier'}
                        </span>
                        <button
                          onClick={() => handleRemoveModifier(index)}
                          style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.7)', cursor: 'pointer', padding: '2px' }}
                          title="Remove Modifier"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Modifier Fields */}
                      {mod.type === 'array' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', opacity: 0.8 }}>Count</span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={mod.count ?? 3}
                              onChange={(e) => handleUpdateModifier(index, { count: parseInt(e.target.value) || 1 })}
                              style={{ width: '50px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', borderRadius: '4px', padding: '2px' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '9px', opacity: 0.6 }}>Offset translation</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <NumberInput label="X" value={mod.offsetX ?? 1.5} onChange={(v) => handleUpdateModifier(index, { offsetX: v })} />
                              <NumberInput label="Y" value={mod.offsetY ?? 0} onChange={(v) => handleUpdateModifier(index, { offsetY: v })} />
                              <NumberInput label="Z" value={mod.offsetZ ?? 0} onChange={(v) => handleUpdateModifier(index, { offsetZ: v })} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9px', opacity: 0.6 }}>Mirror axes</span>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!mod.mirrorX}
                                onChange={(e) => handleUpdateModifier(index, { mirrorX: e.target.checked })}
                              />
                              X Axis
                            </label>
                            <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!mod.mirrorY}
                                onChange={(e) => handleUpdateModifier(index, { mirrorY: e.target.checked })}
                              />
                              Y Axis
                            </label>
                            <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!mod.mirrorZ}
                                onChange={(e) => handleUpdateModifier(index, { mirrorZ: e.target.checked })}
                              />
                              Z Axis
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {modifiers.length === 0 && (
                    <div style={{ padding: '16px 8px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '6px', textAlign: 'center', opacity: 0.4, fontSize: '10px' }}>
                      Modifier stack is empty. Procedural mesh modifiers can replicate or mirror geometric meshes dynamically.
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 6: MATERIAL PROPERTIES */}
        {activeTab === 'material' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Material & Shaders</h3>
            
            {!object ? (
              <div className="empty-message" style={{ padding: '24px 8px', textAlign: 'center', opacity: 0.5, fontSize: '11px' }}>
                No active object selected to adjust materials.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Base Color */}
                {!isLight && object.type !== 'audio' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Base Color</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleKeyframeClick('color')}
                        className={`keyframe-dot-btn ${hasKeyframe('color') ? 'active' : ''}`}
                        title="Keyframe Material Color"
                      >
                        <KeyRound size={12} />
                      </button>
                      <input
                        type="color"
                        value={object.color || '#cbd5e1'}
                        onChange={(e) => onUpdateObject(object.id, { color: e.target.value })}
                        style={{ width: '28px', height: '20px', border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}

                {/* Roughness & Metalness */}
                {!isLight && object.type !== 'audio' && object.type !== 'camera' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        <span>Roughness</span>
                        <span>{object.roughness ?? 0.5}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={object.roughness ?? 0.5}
                        onChange={(e) => onUpdateObject(object.id, { roughness: parseFloat(e.target.value) })}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        <span>Metalness</span>
                        <span>{object.metalness ?? 0.0}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={object.metalness ?? 0.0}
                        onChange={(e) => onUpdateObject(object.id, { metalness: parseFloat(e.target.value) })}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}

                {/* Wireframe and Opacity */}
                {!isLight && object.type !== 'audio' && object.type !== 'camera' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Wireframe Mode</span>
                      <input
                        type="checkbox"
                        checked={object.wireframe ?? false}
                        onChange={(e) => onUpdateObject(object.id, { wireframe: e.target.checked })}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        <span>Opacity</span>
                        <span>{(object.opacity ?? 1.0).toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={object.opacity ?? 1.0}
                        onChange={(e) => onUpdateObject(object.id, { opacity: parseFloat(e.target.value) })}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}

                {/* Custom Attributes tags list */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Custom Attributes</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                    {Object.entries(object.customProperties || {}).filter(([k]) => k !== 'modifiers' && k !== 'customTexture').map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '4px 6px', borderRadius: '4px', fontSize: '10px' }}>
                        <span style={{ color: 'rgb(34, 211, 238)', fontWeight: 'bold' }}>{key}:</span>
                        <span style={{ flex: 1, marginLeft: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(val)}</span>
                        <button
                          onClick={() => handleRemoveTag(key)}
                          style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.7)', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      placeholder="key"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      style={{ flex: 1, background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', padding: '4px', borderRadius: '4px' }}
                      required
                    />
                    <input
                      type="text"
                      placeholder="value"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      style={{ flex: 1, background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', padding: '4px', borderRadius: '4px' }}
                    />
                    <button type="submit" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                      <Plus size={10} />
                    </button>
                  </form>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </aside>
  );
}
