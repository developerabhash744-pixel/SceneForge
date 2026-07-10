import { useRef, useState, useEffect } from 'react';
import {
   Play,
   Pause,
   Square,
   RotateCcw,
   ChevronLeft,
   ChevronRight,
   ChevronUp,
   ChevronDown,
   Trash2,
   Zap,
   SkipBack,
   SkipForward,
} from 'lucide-react';
import type { SceneObject, AnimationTrack, Keyframe } from '../types';


interface TimelineProps {
  object: SceneObject | null;
  currentFrame: number;
  startFrame: number;
  endFrame: number;
  isPlaying: boolean;
  fps: number;
  loop: boolean;
  autoKeyframe: boolean;
  expanded: boolean;
  playbackSpeed?: number;
  onToggleExpand: (val: boolean) => void;
  onUpdateState: (updates: {
    currentFrame?: number;
    isPlaying?: boolean;
    fps?: number;
    loop?: boolean;
    autoKeyframe?: boolean;
    endFrame?: number;
    playbackSpeed?: number;
  }) => void;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
}

export function Timeline({
  object,
  currentFrame,
  startFrame,
  endFrame,
  isPlaying,
  fps,
  loop,
  autoKeyframe,
  expanded,
  playbackSpeed = 1.0,
  onToggleExpand,
  onUpdateState,
  onUpdateObject,
}: TimelineProps) {
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const [selectedKeyframe, setSelectedKeyframe] = useState<{
    trackProp: AnimationTrack['property'];
    frame: number;
    easing: Keyframe['easing'];
  } | null>(null);
  const [selectedKeyframesList, setSelectedKeyframesList] = useState<Array<{
    trackProp: AnimationTrack['property'];
    frame: number;
  }>>([]);

  // Close keyframe popover if selected object changes
  useEffect(() => {
    setSelectedKeyframe(null);
    setSelectedKeyframesList([]);
  }, [object?.id]);

  // Total frame range
  const totalFrames = endFrame - startFrame;

  // Handle timeline scrubbing (click and drag)
  const handleScrub = (clientX: number) => {
    if (!tracksContainerRef.current) return;
    const rect = tracksContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const frame = Math.round(startFrame + pct * totalFrames);
    onUpdateState({ currentFrame: frame });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleScrub(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleScrub(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleScrub(e.touches[0].clientX);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      handleScrub(moveEvent.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Playback Controls
  const togglePlay = () => onUpdateState({ isPlaying: !isPlaying });
  const stopPlayback = () => onUpdateState({ isPlaying: false, currentFrame: startFrame });
  const nextFrame = () => onUpdateState({ currentFrame: Math.min(endFrame, currentFrame + 1) });
  const prevFrame = () => onUpdateState({ currentFrame: Math.max(startFrame, currentFrame - 1) });

  const jumpToPrevKeyframe = () => {
    if (!object) return;
    const allFrames = object.tracks.flatMap((t) => t.keyframes.map((k) => k.frame));
    const uniqueFrames = Array.from(new Set(allFrames)).sort((a, b) => b - a); // descending
    const prev = uniqueFrames.find((f) => f < currentFrame);
    if (prev !== undefined) {
      onUpdateState({ currentFrame: prev });
    }
  };

  const jumpToNextKeyframe = () => {
    if (!object) return;
    const allFrames = object.tracks.flatMap((t) => t.keyframes.map((k) => k.frame));
    const uniqueFrames = Array.from(new Set(allFrames)).sort((a, b) => a - b); // ascending
    const next = uniqueFrames.find((f) => f > currentFrame);
    if (next !== undefined) {
      onUpdateState({ currentFrame: next });
    }
  };

  // Keyframe Actions
  const handleKeyframeSelect = (
    e: React.MouseEvent,
    trackProp: AnimationTrack['property'],
    kf: Keyframe
  ) => {
    e.stopPropagation();
    
    const kfInfo = { trackProp, frame: kf.frame };
    
    if (e.shiftKey) {
      setSelectedKeyframesList((prev) => {
        const exists = prev.some((x) => x.trackProp === trackProp && x.frame === kf.frame);
        if (exists) {
          return prev.filter((x) => !(x.trackProp === trackProp && x.frame === kf.frame));
        } else {
          return [...prev, kfInfo];
        }
      });
    } else {
      setSelectedKeyframesList([kfInfo]);
    }

    setSelectedKeyframe({
      trackProp,
      frame: kf.frame,
      easing: kf.easing,
    });
    onUpdateState({ currentFrame: kf.frame });
  };

  const handleUpdateEasing = (easing: Keyframe['easing']) => {
    if (!object || selectedKeyframesList.length === 0) return;

    const updatedTracks = object.tracks.map((track) => {
      return {
        ...track,
        keyframes: track.keyframes.map((kf) => {
          const isSel = selectedKeyframesList.some(
            (sk) => sk.trackProp === track.property && sk.frame === kf.frame
          );
          return isSel ? { ...kf, easing } : kf;
        }),
      };
    });

    onUpdateObject(object.id, { tracks: updatedTracks });
    setSelectedKeyframe((prev) => (prev ? { ...prev, easing } : null));
  };

  const handleDeleteKeyframe = () => {
    if (!object || selectedKeyframesList.length === 0) return;

    const updatedTracks = object.tracks.map((track) => {
      return {
        ...track,
        keyframes: track.keyframes.filter(
          (kf) => !selectedKeyframesList.some(
            (sk) => sk.trackProp === track.property && sk.frame === kf.frame
          )
        ),
      };
    }).filter((t) => t.keyframes.length > 0);

    onUpdateObject(object.id, { tracks: updatedTracks });
    setSelectedKeyframe(null);
    setSelectedKeyframesList([]);
  };

  // Render keyframe markers for a track
  const renderKeyframes = (trackProp: AnimationTrack['property']) => {
    if (!object) return null;
    const track = object.tracks.find((t) => t.property === trackProp);
    if (!track) return null;

    return track.keyframes.map((kf) => {
      const leftPct = ((kf.frame - startFrame) / totalFrames) * 100;
      const isSelected = selectedKeyframesList.some(
        (sk) => sk.trackProp === trackProp && sk.frame === kf.frame
      );

      return (
        <div
          key={kf.frame}
          className={`keyframe-diamond ${isSelected ? 'selected' : ''}`}
          style={{ left: `${leftPct}%` }}
          onClick={(e) => handleKeyframeSelect(e, trackProp, kf)}
          title={`Frame ${kf.frame}: Click to Edit Easing`}
        />
      );
    });
  };

  // Generate frame ticks for the timeline header
  const renderTicks = () => {
    const ticks = [];
    let interval = 5;
    if (totalFrames > 60 && totalFrames <= 200) interval = 10;
    else if (totalFrames > 200 && totalFrames <= 500) interval = 20;
    else if (totalFrames > 500) interval = 50;
    
    for (let f = startFrame; f <= endFrame; f++) {
      const leftPct = ((f - startFrame) / totalFrames) * 100;
      const isMajor = f % interval === 0;

      ticks.push(
        <div
          key={f}
          className={`timeline-tick ${isMajor ? 'major' : 'minor'}`}
          style={{ left: `${leftPct}%` }}
        >
          {isMajor && <span className="tick-label">{f}</span>}
        </div>
      );
    }
    return ticks;
  };

  // List of active animatable tracks for selected object
  const activeTrackProps: AnimationTrack['property'][] = ['position', 'rotation', 'scale'];
  if (object) {
    if (object.type === 'directionalLight' || object.type === 'pointLight' || object.type === 'spotLight') {
      activeTrackProps.push('intensity');
    } else if (object.type !== 'group') {
      activeTrackProps.push('color');
    }
  }

  return (
    <footer className="editor-timeline">
      {/* Timeline Controls */}
      <div className="timeline-controls-bar">
        {/* Playback group */}
        <div className="controls-group">
          <button className="control-btn" onClick={jumpToPrevKeyframe} title="Jump to Prev Keyframe">
            <SkipBack size={14} />
          </button>
          <button className="control-btn" onClick={prevFrame} title="Previous Frame">
            <ChevronLeft size={16} />
          </button>
          <button
            className={`control-btn play-pause ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="control-btn" onClick={stopPlayback} title="Stop & Rewind">
            <Square size={14} />
          </button>
          <button className="control-btn" onClick={nextFrame} title="Next Frame">
            <ChevronRight size={16} />
          </button>
          <button className="control-btn" onClick={jumpToNextKeyframe} title="Jump to Next Keyframe">
            <SkipForward size={14} />
          </button>
        </div>

        {/* Playhead position details */}
        <div className="controls-group frame-counter-display">
          <span className="current-frame-num">{currentFrame}</span>
          <span className="frame-divider">/</span>
          <input
            type="number"
            value={endFrame}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val > startFrame) {
                onUpdateState({ endFrame: val });
              }
            }}
            style={{
              width: '40px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
              outline: 'none',
              padding: '0'
            }}
            title="Change sequencer total duration frames"
          />
        </div>

        {/* Autokey & Loop Toggles */}
        <div className="controls-group">
          <button
            className={`control-toggle-btn auto-key-btn ${autoKeyframe ? 'active' : ''}`}
            onClick={() => onUpdateState({ autoKeyframe: !autoKeyframe })}
            title="Auto-Keyframe (records changes automatically)"
          >
            <Zap size={14} />
            <span>AutoKey</span>
          </button>
          <button
            className={`control-toggle-btn loop-btn ${loop ? 'active' : ''}`}
            onClick={() => onUpdateState({ loop: !loop })}
            title="Loop Playback"
          >
            <RotateCcw size={14} />
            <span>Loop</span>
          </button>
        </div>

        {/* FPS selector */}
        <div className="controls-group">
          <span className="speed-label">FPS</span>
          <select
            value={fps}
            onChange={(e) => onUpdateState({ fps: parseInt(e.target.value) })}
            className="fps-select"
          >
            <option value={12}>12 FPS</option>
            <option value={24}>24 FPS</option>
            <option value={30}>30 FPS</option>
            <option value={60}>60 FPS</option>
          </select>
        </div>

        {/* Speed Multiplier selector */}
        <div className="controls-group">
          <span className="speed-label">Scale</span>
          <select
            value={playbackSpeed}
            onChange={(e) => onUpdateState({ playbackSpeed: parseFloat(e.target.value) })}
            className="fps-select"
            style={{ width: '65px' }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2.0x</option>
          </select>
        </div>

        {/* Expand/Collapse Timeline */}
        <div className="controls-group" style={{ marginLeft: 'auto' }}>
          <button
            className={`control-toggle-btn expand-timeline-btn ${expanded ? 'active' : ''}`}
            onClick={() => onToggleExpand(!expanded)}
            title={expanded ? 'Collapse Dope Sheet' : 'Expand Dope Sheet'}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            <span>{expanded ? 'Hide DopeSheet' : 'Show DopeSheet'}</span>
          </button>
        </div>
      </div>

      {/* Dope Sheet / Keyframe Tracks */}
      {expanded && (
        <>
          <div className="dope-sheet">
            {/* Left labels column */}
            <div className="dope-labels-col">
              <div className="track-row-label header-label">Timeline</div>
              {object ? (
                <>
                  <div className="track-row-label object-summary-label">
                    <strong>{object.name}</strong>
                  </div>
                  {activeTrackProps.map((prop) => (
                    <div key={prop} className="track-row-label sub-track-label">
                      {prop.charAt(0).toUpperCase() + prop.slice(1)}
                    </div>
                  ))}
                </>
              ) : (
                <div className="track-row-label empty-labels-placeholder">
                  Select object to view tracks
                </div>
              )}
            </div>

            {/* Right timeline grid column */}
            <div className="dope-tracks-col" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
              <div style={{
                minWidth: '100%',
                width: `${totalFrames * 12}px`,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative'
              }}>
                {/* Timeline header for dragging and tick marks */}
                <div
                  className="tracks-header-scrubber"
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  ref={tracksContainerRef}
                >
                  {renderTicks()}
                  {/* Draggable Playhead marker */}
                  <div
                    className="playhead-marker"
                    style={{ left: `${((currentFrame - startFrame) / totalFrames) * 100}%` }}
                  >
                    <div className="playhead-needle" />
                  </div>
                </div>

                {/* Dope sheet track rows */}
                {object ? (
                  <div className="tracks-body-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    {/* Summary track containing all keyframes combined */}
                    <div className="track-row object-summary-track">
                      {activeTrackProps.map((prop) => renderKeyframes(prop))}
                    </div>

                    {/* Sub-property tracks */}
                    {activeTrackProps.map((prop) => (
                      <div key={prop} className="track-row sub-property-track">
                        {renderKeyframes(prop)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="timeline-empty-message">
                    No active animation tracks. Create keyframes in the inspector.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Keyframe Context Editor Popover */}
          {selectedKeyframe && object && (
            <div className="keyframe-popover">
              <div className="popover-title">
                <span>
                  {selectedKeyframesList.length > 1
                    ? `Edit Selected Keyframes (${selectedKeyframesList.length})`
                    : `Edit Keyframe: ${selectedKeyframe.trackProp} (f: ${selectedKeyframe.frame})`}
                </span>
              </div>
              <div className="popover-body">
                <div className="popover-control">
                  <span className="control-lbl">Easing</span>
                  <select
                    value={selectedKeyframe.easing}
                    onChange={(e) => handleUpdateEasing(e.target.value as Keyframe['easing'])}
                    className="easing-select"
                  >
                    <option value="linear">Linear</option>
                    <option value="easeIn">Ease In</option>
                    <option value="easeOut">Ease Out</option>
                    <option value="easeInOut">Ease In-Out</option>
                    <option value="constant">Constant (Step)</option>
                  </select>
                </div>
                <div className="popover-actions">
                  <button className="popover-action-btn delete" onClick={handleDeleteKeyframe}>
                    <Trash2 size={12} />
                    <span>
                      {selectedKeyframesList.length > 1
                        ? `Delete Selected (${selectedKeyframesList.length})`
                        : "Delete Keyframe"}
                    </span>
                  </button>
                  <button
                    className="popover-action-btn close"
                    onClick={() => {
                      setSelectedKeyframe(null);
                      setSelectedKeyframesList([]);
                    }}
                  >
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </footer>
  );
}
