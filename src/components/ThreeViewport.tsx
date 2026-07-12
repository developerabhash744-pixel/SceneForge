import { useEffect, useRef, useState } from 'react';
import { Grid, Video, Hand, ZoomIn, ZoomOut } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import type { SceneObject, EditorState } from '../types';
import { createProceduralTexture } from '../utils/textures';
import { getInterpolatedValue } from '../utils/animator';
import { transpilePythonToJS } from '../utils/pythonTranspiler';

interface ThreeViewportProps {
  objects: SceneObject[];
  selectedId: string | null;
  transformMode: EditorState['transformMode'];
  snapEnabled: boolean;
  snapTranslation: number;
  snapRotation: number;
  snapScale: number;
  transformSpace: EditorState['transformSpace'];
  fpsMode: boolean;
  skyboxPreset: EditorState['skyboxPreset'];
  fogEnabled: boolean;
  fogColor: string;
  fogDensity: number;
  bloomEnabled: boolean;
  gridVisible: boolean;
  measureMode: boolean;
  gizmoSize: number;
  currentFrame: number;
  startFrame: number;
  endFrame: number;
  isPlaying: boolean;
  fps: number;
  loop: boolean;
  cameraPreset: EditorState['cameraPreset'];
  previewMode: boolean;
  shadingMode: EditorState['shadingMode'];
  playbackSpeed?: number;
  skyboxTint?: string;
  cameraOrbitSpeed?: number;
  threeDCursorPosition?: [number, number, number];
  onSelectObject: (id: string | null) => void;
  onUpdateObjectTransform: (
    id: string,
    pos: [number, number, number],
    rot: [number, number, number],
    scale: [number, number, number]
  ) => void;
  onFrameChange: (frame: number) => void;
  onUpdateState?: (updates: Partial<EditorState>) => void;
}

export function ThreeViewport({
  objects,
  selectedId,
  transformMode,
  snapEnabled,
  snapTranslation,
  snapRotation,
  snapScale,
  transformSpace,
  fpsMode,
  skyboxPreset,
  fogEnabled,
  fogColor,
  fogDensity,
  bloomEnabled,
  gridVisible,
  measureMode,
  gizmoSize,
  currentFrame,
  startFrame,
  endFrame,
  isPlaying,
  fps,
  loop,
  cameraPreset,
  previewMode,
  shadingMode = 'material',
  playbackSpeed = 1.0,
  skyboxTint = '#ffffff',
  cameraOrbitSpeed = 1.0,
  threeDCursorPosition = [0, 0, 0],
  onSelectObject,
  onUpdateObjectTransform,
  onFrameChange,
  onUpdateState,
}: ThreeViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanMode, setIsPanMode] = useState(false);

  // References to core Three.js components
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const audioListenerRef = useRef<THREE.AudioListener | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Maps to track 3D objects and helpers
  const threeObjects = useRef<Map<string, THREE.Object3D>>(new Map());
  const textureCache = useRef<Map<string, THREE.Texture>>(new Map());
  const sceneCamerasRef = useRef<Map<string, THREE.PerspectiveCamera>>(new Map());

  // Keep track of latest props in refs for the animation loop
  const objectsRef = useRef(objects);
  const selectedIdRef = useRef(selectedId);
  const currentFrameRef = useRef(currentFrame);
  const isPlayingRef = useRef(isPlaying);
  const fpsRef = useRef(fps);
  const loopRef = useRef(loop);
  const snapEnabledRef = useRef(snapEnabled);
  const onUpdateObjectTransformRef = useRef(onUpdateObjectTransform);
  
  // Preview Mode Refs
  const previewModeRef = useRef(previewMode);
  const onionSkinGhosts = useRef<THREE.Object3D[]>([]);
  const fpsModeRef = useRef(fpsMode);
  const keysPressed = useRef<Record<string, boolean>>({});
  const lastPointerPos = useRef<{ x: number; y: number } | null>(null);

  const firstMeasurePoint = useRef<THREE.Vector3 | null>(null);
  const secondMeasurePoint = useRef<THREE.Vector3 | null>(null);
  const measureLineRef = useRef<THREE.Line | null>(null);
  const compiledScriptCache = useRef<Map<string, { python: string; func: Function }>>(new Map());

  const skyboxPresetRef = useRef(skyboxPreset);
  const fogEnabledRef = useRef(fogEnabled);
  const fogColorRef = useRef(fogColor);
  const fogDensityRef = useRef(fogDensity);
  const bloomEnabledRef = useRef(bloomEnabled);
  const gridVisibleRef = useRef(gridVisible);
  const measureModeRef = useRef(measureMode);
  const gizmoSizeRef = useRef(gizmoSize);
  const startFrameRef = useRef(startFrame);
  const endFrameRef = useRef(endFrame);
  const playbackSpeedRef = useRef(playbackSpeed);

  useEffect(() => {
    objectsRef.current = objects;
    selectedIdRef.current = selectedId;
    currentFrameRef.current = currentFrame;
    isPlayingRef.current = isPlaying;
    fpsRef.current = fps;
    loopRef.current = loop;
    snapEnabledRef.current = snapEnabled;
    previewModeRef.current = previewMode;
    fpsModeRef.current = fpsMode;
    onUpdateObjectTransformRef.current = onUpdateObjectTransform;
    skyboxPresetRef.current = skyboxPreset;
    fogEnabledRef.current = fogEnabled;
    fogColorRef.current = fogColor;
    fogDensityRef.current = fogDensity;
    bloomEnabledRef.current = bloomEnabled;
    gridVisibleRef.current = gridVisible;
    measureModeRef.current = measureMode;
    gizmoSizeRef.current = gizmoSize;
    startFrameRef.current = startFrame;
    endFrameRef.current = endFrame;
    playbackSpeedRef.current = playbackSpeed;
  }, [
    objects,
    selectedId,
    currentFrame,
    startFrame,
    endFrame,
    isPlaying,
    fps,
    loop,
    snapEnabled,
    previewMode,
    fpsMode,
    onUpdateObjectTransform,
    skyboxPreset,
    fogEnabled,
    fogColor,
    fogDensity,
    bloomEnabled,
    gridVisible,
    measureMode,
    gizmoSize,
    playbackSpeed,
  ]);

  // Handle Preview Mode / FPS Mode transitions (detaching transform gizmos and disabling OrbitControls)
  useEffect(() => {
    const transformControls = transformControlsRef.current;
    const orbitControls = orbitControlsRef.current;
    if (orbitControls) {
      orbitControls.enabled = !previewMode && !fpsMode;
    }
    if (!transformControls) return;

    if (previewMode || fpsMode) {
      transformControls.detach();
    } else {
      if (selectedIdRef.current) {
        const activeObj = threeObjects.current.get(selectedIdRef.current);
        const isLocked = objectsRef.current.find((o) => o.id === selectedIdRef.current)?.locked;
        if (activeObj && activeObj.visible && !isLocked && transformMode !== 'select') {
          transformControls.attach(activeObj);
        } else {
          transformControls.detach();
        }
      }
    }
  }, [previewMode, fpsMode, transformMode]);

  // Handle initialization of Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x18181b, 1); // Slate-900 background
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x18181b, 0.015);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(8, 8, 8);
    cameraRef.current = camera;

    // Audio Listener
    const audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    audioListenerRef.current = audioListener;

    // Orbit Controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.maxPolarAngle = Math.PI / 2 + 0.1; // Allow going slightly below ground
    orbitControlsRef.current = orbitControls;

    // Workspace Lighting (Ambient + Grid lighting)
    const workspaceAmbient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(workspaceAmbient);

    const workspaceDirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    workspaceDirLight.position.set(10, 20, 10);
    scene.add(workspaceDirLight);

    // Grid & Axis Helpers
    const gridHelper = new THREE.GridHelper(50, 50, 0x06b6d4, 0x3f3f46); // Cyan main axes, zinc grid lines
    gridHelper.position.y = -0.01; // Slightly below zero to avoid z-fighting
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.position.set(0, 0.01, 0);
    // Style axis colors nicely
    const axesMaterial = axesHelper.material as THREE.LineBasicMaterial;
    if (axesMaterial) {
      axesMaterial.linewidth = 2;
    }
    scene.add(axesHelper);

    // 3D Cursor Helper (Red and White ring with crosshair lines)
    const cursorGroup = new THREE.Group();
    cursorGroup.name = 'three_d_cursor';
    
    const ringGeom = new THREE.RingGeometry(0.12, 0.15, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    cursorGroup.add(ring);
    
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    
    const pointsX = [new THREE.Vector3(-0.25, 0, 0), new THREE.Vector3(0.25, 0, 0)];
    const geomX = new THREE.BufferGeometry().setFromPoints(pointsX);
    const lineX = new THREE.Line(geomX, lineMat);
    cursorGroup.add(lineX);
    
    const pointsZ = [new THREE.Vector3(0, 0, -0.25), new THREE.Vector3(0, 0, 0.25)];
    const geomZ = new THREE.BufferGeometry().setFromPoints(pointsZ);
    const lineZ = new THREE.Line(geomZ, lineMat);
    cursorGroup.add(lineZ);

    scene.add(cursorGroup);

    // Transform Gizmo (TransformControls)
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.85;
    scene.add(transformControls.getHelper());
    transformControlsRef.current = transformControls;

    // Prevent orbit controls from moving when dragging the gizmo
    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;

      // When drag ends, notify parent component about final transform
      if (!event.value && transformControls.object) {
        const obj3D = transformControls.object;
        const id = obj3D.userData.id;
        
        const pos: [number, number, number] = [obj3D.position.x, obj3D.position.y, obj3D.position.z];
        const rot: [number, number, number] = [
          THREE.MathUtils.radToDeg(obj3D.rotation.x),
          THREE.MathUtils.radToDeg(obj3D.rotation.y),
          THREE.MathUtils.radToDeg(obj3D.rotation.z),
        ];
        const scale: [number, number, number] = [obj3D.scale.x, obj3D.scale.y, obj3D.scale.z];
        
        onUpdateObjectTransformRef.current(id, pos, rot, scale);
      }
    });

    // Real-time Vertex & Face Snapping during object translation
    transformControls.addEventListener('objectChange', () => {
      const obj3D = transformControls.object;
      if (!obj3D || !snapEnabledRef.current) return;

      // Only perform vertex/face snapping when in translate mode
      if (transformControls.mode !== 'translate') return;

      // Raycast straight down from the object's slightly offset center
      const raycasterDown = new THREE.Raycaster();
      const origin = obj3D.position.clone().add(new THREE.Vector3(0, 0.2, 0));
      raycasterDown.set(origin, new THREE.Vector3(0, -1, 0));

      const targets: THREE.Object3D[] = [];
      scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child !== obj3D &&
          !child.userData.isLightHelper &&
          !child.userData.isCameraHelper &&
          !child.userData.isAudioHelper &&
          // Skip children of this object
          !obj3D.getObjectById(child.id)
        ) {
          targets.push(child);
        }
      });

      // Face Snapping
      const intersections = raycasterDown.intersectObjects(targets, true);
      if (intersections.length > 0) {
        const hit = intersections[0];
        // Snap if close enough (within 1.2m)
        if (hit.distance < 1.2) {
          obj3D.position.y = hit.point.y;
          
          if (hit.face) {
            const normal = hit.face.normal.clone();
            normal.transformDirection(hit.object.matrixWorld);
            const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
            obj3D.quaternion.copy(alignQuat);
          }
        }
      }

      // Vertex Snapping: check nearest vertex within 0.25 meters
      let nearestVertex: THREE.Vector3 | null = null;
      let minDistance = 0.25;

      targets.forEach((targetMesh) => {
        if (targetMesh instanceof THREE.Mesh && targetMesh.geometry) {
          const positionAttr = targetMesh.geometry.attributes.position;
          if (positionAttr) {
            const tempV = new THREE.Vector3();
            // Sub-sample vertices for performance (step by 3)
            for (let i = 0; i < positionAttr.count; i += 3) {
              tempV.fromBufferAttribute(positionAttr, i);
              tempV.applyMatrix4(targetMesh.matrixWorld);
              const dist = obj3D.position.distanceTo(tempV);
              if (dist < minDistance) {
                minDistance = dist;
                nearestVertex = tempV.clone();
              }
            }
          }
        }
      });

      if (nearestVertex) {
        obj3D.position.copy(nearestVertex);
      }
    });

    // Touch raycaster for selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      // If measureMode is active, intercept clicks for measurement!
      if (measureModeRef.current) {
        const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
        const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const targets: THREE.Object3D[] = [];
        threeObjects.current.forEach((obj) => {
          if (obj.userData.helperMesh) {
            targets.push(obj.userData.helperMesh);
          } else {
            targets.push(obj);
          }
        });
        const intersects = raycaster.intersectObjects(targets, true);

        let hitPoint = new THREE.Vector3();
        if (intersects.length > 0) {
          hitPoint.copy(intersects[0].point);
        } else {
          const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
          raycaster.ray.intersectPlane(floorPlane, hitPoint);
        }

        if (!firstMeasurePoint.current) {
          firstMeasurePoint.current = hitPoint.clone();
          secondMeasurePoint.current = null;
          const scene = sceneRef.current;
          if (scene && measureLineRef.current) {
            scene.remove(measureLineRef.current);
            measureLineRef.current = null;
          }
          window.dispatchEvent(new CustomEvent('ruler-update', { detail: { distance: null, status: 'first_clicked' } }));
        } else {
          secondMeasurePoint.current = hitPoint.clone();
          const dist = firstMeasurePoint.current.distanceTo(secondMeasurePoint.current);

          const scene = sceneRef.current;
          if (scene) {
            if (measureLineRef.current) {
              scene.remove(measureLineRef.current);
            }
            const geom = new THREE.BufferGeometry().setFromPoints([firstMeasurePoint.current, secondMeasurePoint.current]);
            const mat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3, depthTest: false });
            const line = new THREE.Line(geom, mat);
            line.renderOrder = 999;
            scene.add(line);
            measureLineRef.current = line;
          }

          window.dispatchEvent(new CustomEvent('ruler-update', { detail: { distance: dist, status: 'measured' } }));
          firstMeasurePoint.current = null;
        }
        return;
      }

      // In previewMode, prevent selecting/deselecting objects
      if (previewModeRef.current) return;

      // Don't raycast if user is clicking on/using the transform gizmo
      if (transformControls.dragging || transformControls.axis !== null) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      // Calculate NDC
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (transformMode === 'cursor') {
        const targets: THREE.Object3D[] = [];
        threeObjects.current.forEach((obj) => {
          if (obj.userData.helperMesh) {
            targets.push(obj.userData.helperMesh);
          } else {
            targets.push(obj);
          }
        });
        const intersects = raycaster.intersectObjects(targets, true);
        let hitPoint = new THREE.Vector3();
        if (intersects.length > 0) {
          hitPoint.copy(intersects[0].point);
        } else {
          const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
          raycaster.ray.intersectPlane(floorPlane, hitPoint);
        }
        onUpdateState?.({ threeDCursorPosition: [hitPoint.x, hitPoint.y, hitPoint.z] });
        return;
      }

      // We only want to intersect our meshes/helpers, not the helpers of TransformControls or GridHelper
      const targets: THREE.Object3D[] = [];
      threeObjects.current.forEach((obj) => {
        // If it's a light helper, add its visible mesh
        if (obj.userData.helperMesh) {
          targets.push(obj.userData.helperMesh);
        } else {
          targets.push(obj);
        }
      });

      const intersects = raycaster.intersectObjects(targets, true);

      if (intersects.length > 0) {
        // Find the top-level scene object (marked by having an ID in userData)
        let hit: THREE.Object3D | null = intersects[0].object;
        let objectId: string | null = null;

        while (hit) {
          if (hit.userData && hit.userData.id) {
            objectId = hit.userData.id;
            break;
          }
          hit = hit.parent;
        }

        if (objectId) {
          onSelectObject(objectId);
        }
      } else {
        // Clicked empty space: deselect
        onSelectObject(null);
      }
    };

    renderer.domElement.addEventListener('mousedown', handlePointerDown);
    renderer.domElement.addEventListener('touchstart', handlePointerDown);

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;

      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Core Animation / Render Loop
    let lastTime = performance.now();
    let accumulatedTime = 0;

    const animate = () => {
      requestAnimationFrame(animate);

      const time = performance.now();
      const delta = ((time - lastTime) / 1000) * playbackSpeedRef.current;
      lastTime = time;

      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const orbitControls = orbitControlsRef.current;

      if (!scene || !renderer || !camera || !orbitControls) return;

      // Handle timeline animation playback
      if (isPlayingRef.current) {
        accumulatedTime += delta;
        const frameInterval = 1 / fpsRef.current;

        if (accumulatedTime >= frameInterval) {
          accumulatedTime = accumulatedTime % frameInterval;
          const nextFrame = currentFrameRef.current + 1;
          const totalFrames = endFrameRef.current;

          if (nextFrame > totalFrames) {
            if (loopRef.current) {
              onFrameChange(startFrameRef.current);
            } else {
              // Stop playing
              isPlayingRef.current = false;
              onFrameChange(currentFrameRef.current);
            }
          } else {
            onFrameChange(nextFrame);
          }
        }
      } else {
        accumulatedTime = 0;
      }

      // Read current objects and frame to animate Three.js representations directly
      const currentFrameVal = currentFrameRef.current;
      objectsRef.current.forEach((obj) => {
        const obj3D = threeObjects.current.get(obj.id);
        if (!obj3D) return;

        // Skip animating the active dragged object in TransformControls to prevent fighting
        if (selectedIdRef.current === obj.id && transformControlsRef.current?.dragging) {
          return;
        }

        // Interpolate transform tracks
        const posTrack = obj.tracks.find((t) => t.property === 'position');
        const rotTrack = obj.tracks.find((t) => t.property === 'rotation');
        const scaleTrack = obj.tracks.find((t) => t.property === 'scale');

        if (posTrack && posTrack.keyframes.length > 0) {
          const val = getInterpolatedValue(posTrack, currentFrameVal, obj.position);
          obj3D.position.set(val[0], val[1], val[2]);
        }

        if (rotTrack && rotTrack.keyframes.length > 0) {
          const val = getInterpolatedValue(rotTrack, currentFrameVal, obj.rotation);
          obj3D.rotation.set(
            THREE.MathUtils.degToRad(val[0]),
            THREE.MathUtils.degToRad(val[1]),
            THREE.MathUtils.degToRad(val[2])
          );
        }

        if (scaleTrack && scaleTrack.keyframes.length > 0) {
          const val = getInterpolatedValue(scaleTrack, currentFrameVal, obj.scale);
          obj3D.scale.set(val[0], val[1], val[2]);
        }

        // Interpolate material color if mesh
        if (obj3D instanceof THREE.Mesh && !(obj3D.userData.isLightHelper)) {
          const colorTrack = obj.tracks.find((t) => t.property === 'color');
          if (colorTrack && colorTrack.keyframes.length > 0 && obj3D.material instanceof THREE.MeshStandardMaterial) {
            // Get interpolated [r, g, b]
            const defaultRGB = new THREE.Color(obj.color || '#ffffff').toArray();
            const rgb = getInterpolatedValue(colorTrack, currentFrameVal, defaultRGB);
            obj3D.material.color.setRGB(rgb[0], rgb[1], rgb[2]);
          }

          const emissiveTrack = obj.tracks.find((t) => t.property === 'emissive');
          if (emissiveTrack && emissiveTrack.keyframes.length > 0 && obj3D.material instanceof THREE.MeshStandardMaterial) {
            const defaultRGB = new THREE.Color(obj.emissive || '#000000').toArray();
            const rgb = getInterpolatedValue(emissiveTrack, currentFrameVal, defaultRGB);
            obj3D.material.emissive.setRGB(rgb[0], rgb[1], rgb[2]);
          }

          const emissiveIntTrack = obj.tracks.find((t) => t.property === 'emissiveIntensity');
          if (emissiveIntTrack && emissiveIntTrack.keyframes.length > 0 && obj3D.material instanceof THREE.MeshStandardMaterial) {
            const defaultVal = [obj.emissiveIntensity ?? 1.0];
            const val = getInterpolatedValue(emissiveIntTrack, currentFrameVal, defaultVal);
            obj3D.material.emissiveIntensity = val[0];
          }
        }

        // Interpolate intensity if light
        const intensityTrack = obj.tracks.find((t) => t.property === 'intensity');
        if (intensityTrack && intensityTrack.keyframes.length > 0) {
          const defaultVal = [obj.intensity ?? 1.0];
          const val = getInterpolatedValue(intensityTrack, currentFrameVal, defaultVal);
          
          // Apply to actual light object inside group
          obj3D.traverse((child) => {
            if (child instanceof THREE.Light) {
              child.intensity = val[0];
            }
          });
        }

        if (obj.script && obj.script.trim() !== '') {
          try {
            let scriptEntry = compiledScriptCache.current.get(obj.id);
            if (!scriptEntry || scriptEntry.python !== obj.script) {
              const transpiled = transpilePythonToJS(obj.script);
              const jsCode = `
                const lerp = (a, b, t) => a + (b - a) * t;
                const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
                const map_range = (val, inMin, inMax, outMin, outMax) => outMin + (outMax - outMin) * (val - inMin) / (inMax - inMin);
                const ease_in_quad = (t) => t * t;
                const ease_out_quad = (t) => t * (2 - t);
                const ease_in_out_quad = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                ${transpiled}
              `;
              const func = new Function('pos', 'rot', 'scl', 'frame', 'time', 'THREE', jsCode);
              scriptEntry = { python: obj.script, func };
              compiledScriptCache.current.set(obj.id, scriptEntry);
            }

            const pos = [obj3D.position.x, obj3D.position.y, obj3D.position.z];
            const rot = [
              THREE.MathUtils.radToDeg(obj3D.rotation.x),
              THREE.MathUtils.radToDeg(obj3D.rotation.y),
              THREE.MathUtils.radToDeg(obj3D.rotation.z)
            ];
            const scl = [obj3D.scale.x, obj3D.scale.y, obj3D.scale.z];

            scriptEntry.func(pos, rot, scl, currentFrameVal, performance.now() / 1000, THREE);

            // Re-apply values to the 3D representation
            obj3D.position.set(pos[0], pos[1], pos[2]);
            obj3D.rotation.set(
              THREE.MathUtils.degToRad(rot[0]),
              THREE.MathUtils.degToRad(rot[1]),
              THREE.MathUtils.degToRad(rot[2])
            );
            obj3D.scale.set(scl[0], scl[1], scl[2]);
          } catch (err) {
            // Silently swallow runtime eval errors to prevent layout crashes
          }
        }
      });

      // 1. Clean up old onion skin ghosts
      onionSkinGhosts.current.forEach((ghost) => {
        scene.remove(ghost);
        ghost.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      });
      onionSkinGhosts.current = [];

      // 2. Generate new onion skin ghosts if selected object is an animated mesh in edit mode
      if (!previewModeRef.current) {
        const selectedObj = objectsRef.current.find((o) => o.id === selectedIdRef.current);
        if (selectedObj && selectedObj.tracks.length > 0 && selectedObj.type !== 'group' && !selectedObj.type.includes('Light') && selectedObj.visible) {
          const base3D = threeObjects.current.get(selectedObj.id);
          if (base3D && (base3D instanceof THREE.Mesh || base3D instanceof THREE.Group)) {
            const offsets = [-10, 10]; // Past and future offsets (e.g. 10 frames)
            offsets.forEach((offset) => {
              const f = Math.max(0, Math.min(120, currentFrameVal + offset));
              if (f === currentFrameVal) return;

              const posTrack = selectedObj.tracks.find((t) => t.property === 'position');
              const rotTrack = selectedObj.tracks.find((t) => t.property === 'rotation');
              const scaleTrack = selectedObj.tracks.find((t) => t.property === 'scale');

              const ghostPos = posTrack && posTrack.keyframes.length > 0
                ? getInterpolatedValue(posTrack, f, selectedObj.position)
                : selectedObj.position;

              const ghostRot = rotTrack && rotTrack.keyframes.length > 0
                ? getInterpolatedValue(rotTrack, f, selectedObj.rotation)
                : selectedObj.rotation;

              const ghostScale = scaleTrack && scaleTrack.keyframes.length > 0
                ? getInterpolatedValue(scaleTrack, f, selectedObj.scale)
                : selectedObj.scale;

              let ghostMesh: THREE.Object3D;
              const ghostColor = offset < 0 ? 0x22c55e : 0xec4899; // Green for past, Pink/Magenta for future
              const ghostMat = new THREE.MeshBasicMaterial({
                color: ghostColor,
                transparent: true,
                opacity: 0.25,
                wireframe: true,
              });

              if (base3D instanceof THREE.Mesh) {
                const ghostGeom = base3D.geometry.clone();
                ghostMesh = new THREE.Mesh(ghostGeom, ghostMat);
              } else {
                // It's a Group/GLTF model
                const clonedGroup = base3D.clone();
                clonedGroup.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    child.material = ghostMat;
                  }
                });
                ghostMesh = clonedGroup;
              }

              ghostMesh.position.set(ghostPos[0], ghostPos[1], ghostPos[2]);
              ghostMesh.rotation.set(
                THREE.MathUtils.degToRad(ghostRot[0]),
                THREE.MathUtils.degToRad(ghostRot[1]),
                THREE.MathUtils.degToRad(ghostRot[2])
              );
              ghostMesh.scale.set(ghostScale[0], ghostScale[1], ghostScale[2]);

              scene.add(ghostMesh);
              onionSkinGhosts.current.push(ghostMesh);
            });
          }
        }
      }

      // Handle FPS first-person translation
      if (fpsModeRef.current && camera) {
        const speed = 0.08;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0; // Lock to ground plane
        dir.normalize();
        
        const right = new THREE.Vector3();
        right.crossVectors(camera.up, dir).normalize();

        if (keysPressed.current['KeyW']) camera.position.addScaledVector(dir, speed);
        if (keysPressed.current['KeyS']) camera.position.addScaledVector(dir, -speed);
        if (keysPressed.current['KeyA']) camera.position.addScaledVector(right, speed);
        if (keysPressed.current['KeyD']) camera.position.addScaledVector(right, -speed);
      }

      // Update controllers
      orbitControls.update();

      // Sync Camera Nodes positions and orientations with their physical cameras
      const cameraNodes = objectsRef.current.filter((o) => o.type === 'camera' && o.visible);
      cameraNodes.forEach((node) => {
        const mockGroup = threeObjects.current.get(node.id);
        const realCam = sceneCamerasRef.current.get(node.id);
        if (mockGroup && realCam) {
          mockGroup.getWorldPosition(realCam.position);
          mockGroup.getWorldQuaternion(realCam.quaternion);
        }
      });

      // Render viewport (Scissor test for Camera PiP if active)
      let activePipNode = cameraNodes.find((n) => n.id === selectedIdRef.current);
      if (!activePipNode && cameraNodes.length > 0) {
        activePipNode = cameraNodes[0];
      }

      if (activePipNode) {
        const pipCamera = sceneCamerasRef.current.get(activePipNode.id);
        const mockGroup = threeObjects.current.get(activePipNode.id);
        if (pipCamera && mockGroup) {
          const width = container.clientWidth;
          const height = container.clientHeight;

          renderer.setScissorTest(true);

          // 1. Render Main Viewport
          renderer.setViewport(0, 0, width, height);
          renderer.setScissor(0, 0, width, height);
          renderer.render(scene, camera);

          // 2. Render PiP Preview (Bottom-Left)
          const pipW = Math.min(200, width * 0.35);
          const pipH = Math.round(pipW * (3 / 4)); // 4:3 Aspect ratio
          const pipX = 16;
          const pipY = 16;
          renderer.setViewport(pipX, pipY, pipW, pipH);
          renderer.setScissor(pipX, pipY, pipW, pipH);

          // Temporarily hide the camera's visual helper body so it doesn't render in its own lens
          const oldVis = mockGroup.visible;
          mockGroup.visible = false;

          renderer.render(scene, pipCamera);

          mockGroup.visible = oldVis;

          // Restore settings
          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, width, height);
        } else {
          renderer.render(scene, camera);
        }
      } else {
        renderer.render(scene, camera);
      }
    };

    animate();

    // Drop Object to Ground Handler
    const handleDropEvent = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      const obj3D = threeObjects.current.get(id);
      if (!obj3D) return;

      const raycasterDown = new THREE.Raycaster();
      // start slightly above to find surfaces directly underneath
      const origin = obj3D.position.clone().add(new THREE.Vector3(0, 0.2, 0));
      raycasterDown.set(origin, new THREE.Vector3(0, -1, 0));

      const targets: THREE.Object3D[] = [];
      scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child !== obj3D &&
          !child.userData.isLightHelper &&
          !child.userData.isCameraHelper &&
          !child.userData.isAudioHelper &&
          !obj3D.getObjectById(child.id)
        ) {
          targets.push(child);
        }
      });

      const intersections = raycasterDown.intersectObjects(targets, true);
      let targetY = 0; // default to ground level

      if (intersections.length > 0) {
        targetY = intersections[0].point.y;
      }

      const updatedPos: [number, number, number] = [obj3D.position.x, targetY, obj3D.position.z];
      
      // Keep existing rotation & scale
      const rot: [number, number, number] = [
        THREE.MathUtils.radToDeg(obj3D.rotation.x),
        THREE.MathUtils.radToDeg(obj3D.rotation.y),
        THREE.MathUtils.radToDeg(obj3D.rotation.z),
      ];
      const scale: [number, number, number] = [obj3D.scale.x, obj3D.scale.y, obj3D.scale.z];
      
      onUpdateObjectTransformRef.current(id, updatedPos, rot, scale);
    };

    const handleFocusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.id) return;
      const obj3D = threeObjects.current.get(detail.id);
      const camera = cameraRef.current;
      const orbitControls = orbitControlsRef.current;
      if (obj3D && camera && orbitControls) {
        const pos = new THREE.Vector3();
        obj3D.getWorldPosition(pos);
        orbitControls.target.copy(pos);
        camera.position.set(pos.x + 3, pos.y + 3, pos.z + 5);
        orbitControls.update();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fpsModeRef.current) return;
      keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!fpsModeRef.current) return;
      keysPressed.current[e.code] = false;
    };

    const handlePointerDownFPS = (e: MouseEvent | TouchEvent) => {
      if (!fpsModeRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      lastPointerPos.current = { x: clientX, y: clientY };
    };

    const handlePointerMoveFPS = (e: MouseEvent | TouchEvent) => {
      if (!fpsModeRef.current || !lastPointerPos.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const dx = clientX - lastPointerPos.current.x;
      const dy = clientY - lastPointerPos.current.y;
      lastPointerPos.current = { x: clientX, y: clientY };

      const camera = cameraRef.current;
      if (camera) {
        camera.rotation.order = 'YXZ';
        camera.rotation.y -= dx * 0.003;
        camera.rotation.x -= dy * 0.003;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
      }
    };

    const handlePointerUpFPS = () => {
      lastPointerPos.current = null;
    };

    const handleExportEvent = () => {
      const scene = sceneRef.current;
      if (!scene) return;

      const transformControls = transformControlsRef.current;
      if (transformControls) transformControls.detach();

      const exporter = new OBJExporter();
      const result = exporter.parse(scene);

      const blob = new Blob([result], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SceneForge_Export_${Date.now()}.obj`;
      link.click();
      URL.revokeObjectURL(url);

      if (transformControls && selectedIdRef.current) {
        const activeObj = threeObjects.current.get(selectedIdRef.current);
        const isLocked = objectsRef.current.find((o) => o.id === selectedIdRef.current)?.locked;
        if (activeObj && activeObj.visible && !isLocked && transformMode !== 'select') {
          transformControls.attach(activeObj);
        } else {
          transformControls.detach();
        }
      }
    };

    window.addEventListener('drop-object-to-ground', handleDropEvent);
    window.addEventListener('focus-object-camera', handleFocusEvent);
    window.addEventListener('export-scene-obj', handleExportEvent);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    renderer.domElement.addEventListener('mousedown', handlePointerDownFPS);
    window.addEventListener('mousemove', handlePointerMoveFPS);
    window.addEventListener('mouseup', handlePointerUpFPS);

    renderer.domElement.addEventListener('touchstart', handlePointerDownFPS);
    window.addEventListener('touchmove', handlePointerMoveFPS);
    window.addEventListener('touchend', handlePointerUpFPS);

    // Clean up
    return () => {
      window.removeEventListener('drop-object-to-ground', handleDropEvent);
      window.removeEventListener('focus-object-camera', handleFocusEvent);
      window.removeEventListener('export-scene-obj', handleExportEvent);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      renderer.domElement.removeEventListener('mousedown', handlePointerDownFPS);
      window.removeEventListener('mousemove', handlePointerMoveFPS);
      window.removeEventListener('mouseup', handlePointerUpFPS);

      renderer.domElement.removeEventListener('touchstart', handlePointerDownFPS);
      window.removeEventListener('touchmove', handlePointerMoveFPS);
      window.removeEventListener('touchend', handlePointerUpFPS);

      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousedown', handlePointerDown);
      renderer.domElement.removeEventListener('touchstart', handlePointerDown);
      if (container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Dispose resources
      threeObjects.current.forEach((obj) => {
        scene.remove(obj);
      });
      threeObjects.current.clear();
      textureCache.current.forEach((tex) => tex.dispose());
      textureCache.current.clear();
    };
  }, []);

  // Synchronize 3D Cursor position from props
  useEffect(() => {
    const cursor = sceneRef.current?.getObjectByName('three_d_cursor');
    if (cursor && threeDCursorPosition) {
      cursor.position.set(threeDCursorPosition[0], threeDCursorPosition[1], threeDCursorPosition[2]);
    }
  }, [threeDCursorPosition]);

  // Sync Camera Presets
  useEffect(() => {
    const camera = cameraRef.current;
    const orbitControls = orbitControlsRef.current;
    if (!camera || !orbitControls) return;

    const distance = 10;
    switch (cameraPreset) {
      case 'top':
        camera.position.set(0, distance, 0.001); // Small offset so lookAt works perfectly
        break;
      case 'front':
        camera.position.set(0, 0, distance);
        break;
      case 'right':
        camera.position.set(distance, 0, 0);
        break;
      case 'perspective':
      default:
        camera.position.set(8, 8, 8);
        break;
    }
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();
  }, [cameraPreset]);

  // Synchronize OrbitControls navigation settings when isPanMode changes
  useEffect(() => {
    const orbitControls = orbitControlsRef.current;
    if (orbitControls) {
      if (isPanMode) {
        // Remap left drag to pan and single-finger touch to pan
        orbitControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        if (orbitControls.touches) {
          orbitControls.touches.ONE = THREE.TOUCH.PAN;
        }
      } else {
        // Restore default orbit rotation behavior
        orbitControls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        if (orbitControls.touches) {
          orbitControls.touches.ONE = THREE.TOUCH.ROTATE;
        }
      }
      orbitControls.update();
    }
  }, [isPanMode]);

  const handleZoom = (factor: number) => {
    const controls = orbitControlsRef.current;
    if (controls) {
      const camera = controls.object;
      const target = controls.target;
      const dir = new THREE.Vector3().subVectors(camera.position, target);
      dir.multiplyScalar(factor);
      camera.position.addVectors(target, dir);
      controls.update();
    }
  };

  // Sync Gizmo Transform Mode & Snapping
  useEffect(() => {
    const transformControls = transformControlsRef.current;
    if (!transformControls) return;

    if (transformMode === 'select' || transformMode === 'cursor') {
      transformControls.detach();
    } else {
      transformControls.setMode(transformMode as any);
      // Re-attach to force update
      const activeObj = selectedId ? threeObjects.current.get(selectedId) : null;
      if (activeObj) {
        transformControls.attach(activeObj);
      }
    }
  }, [transformMode, selectedId]);

  useEffect(() => {
    const transformControls = transformControlsRef.current;
    if (!transformControls) return;

    transformControls.setSpace(transformSpace);
    transformControls.size = gizmoSize;

    if (snapEnabled) {
      transformControls.setTranslationSnap(snapTranslation);
      transformControls.setRotationSnap(THREE.MathUtils.degToRad(snapRotation));
      transformControls.setScaleSnap(snapScale);
    } else {
      transformControls.setTranslationSnap(null);
      transformControls.setRotationSnap(null);
      transformControls.setScaleSnap(null);
    }
  }, [snapEnabled, snapTranslation, snapRotation, snapScale, transformSpace, gizmoSize]);

  // Synchronize Camera Orbit Speed settings
  useEffect(() => {
    const orbitControls = orbitControlsRef.current;
    if (orbitControls) {
      orbitControls.rotateSpeed = cameraOrbitSpeed;
      orbitControls.zoomSpeed = cameraOrbitSpeed;
    }
  }, [cameraOrbitSpeed]);

  // Synchronize Fog state
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (fogEnabled) {
      scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    } else {
      scene.fog = null;
    }
  }, [fogEnabled, fogColor, fogDensity]);

  // Synchronize Grid Visibility state
  useEffect(() => {
    const gridHelper = gridHelperRef.current;
    if (gridHelper) {
      gridHelper.visible = gridVisible;
    }
  }, [gridVisible]);

  // Synchronize Skybox Preset backdrop and tint
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer) return;

    let bgColor = 0x0f172a; // Default slate/noon
    if (skyboxPreset === 'sunset') bgColor = 0x3b1c1c;
    else if (skyboxPreset === 'space') bgColor = 0x020205;
    else if (skyboxPreset === 'stormy') bgColor = 0x181024;

    const baseColor = new THREE.Color(bgColor);
    const tintColor = new THREE.Color(skyboxTint || '#ffffff');
    const finalColor = baseColor.multiply(tintColor);

    scene.background = finalColor;
    renderer.setClearColor(finalColor, 1);
  }, [skyboxPreset, skyboxTint]);

  useEffect(() => {
    if (!measureMode) {
      firstMeasurePoint.current = null;
      secondMeasurePoint.current = null;
      const scene = sceneRef.current;
      if (scene && measureLineRef.current) {
        scene.remove(measureLineRef.current);
        measureLineRef.current = null;
      }
    }
  }, [measureMode]);

  // Reconcile Scene Graph between React State and Three.js
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Delete objects removed from React state
    threeObjects.current.forEach((obj, id) => {
      const exists = objects.some((o) => o.id === id);
      if (!exists) {
        scene.remove(obj);
        // Also remove helpers if they are separate in scene
        if (obj.userData.helper) {
          scene.remove(obj.userData.helper);
        }
        threeObjects.current.delete(id);
      }
    });

    // Helper: Apply procedural modifiers (Array & Mirror)
    const applyModifiers = (obj3D: THREE.Object3D, obj: SceneObject) => {
      const toRemove: THREE.Object3D[] = [];
      obj3D.children.forEach((child) => {
        if (child.name && child.name.startsWith('modifier_clone')) {
          toRemove.push(child);
        }
      });
      toRemove.forEach((child) => obj3D.remove(child));

      const baseVisual = obj3D.getObjectByName('base_mesh') || (obj3D instanceof THREE.Mesh ? obj3D : null);
      if (!baseVisual) return;

      const mods = (obj.customProperties?.modifiers as any[]) || [];
      let currentInstances: THREE.Object3D[] = [baseVisual];

      mods.forEach((mod) => {
        const nextInstances: THREE.Object3D[] = [];
        
        if (mod.type === 'array') {
          const count = mod.count ?? 3;
          const offsetX = mod.offsetX ?? 1.5;
          const offsetY = mod.offsetY ?? 0;
          const offsetZ = mod.offsetZ ?? 0;

          currentInstances.forEach((inst) => {
            for (let i = 1; i < count; i++) {
              const clone = inst.clone();
              clone.name = `modifier_clone_array_${i}`;
              clone.position.x = inst.position.x + offsetX * i;
              clone.position.y = inst.position.y + offsetY * i;
              clone.position.z = inst.position.z + offsetZ * i;
              obj3D.add(clone);
              nextInstances.push(clone);
            }
          });
        } else if (mod.type === 'mirror') {
          currentInstances.forEach((inst) => {
            if (mod.mirrorX) {
              const clone = inst.clone();
              clone.name = 'modifier_clone_mirror_x';
              clone.scale.x *= -1;
              clone.position.x *= -1;
              obj3D.add(clone);
              nextInstances.push(clone);
            }
            if (mod.mirrorY) {
              const clone = inst.clone();
              clone.name = 'modifier_clone_mirror_y';
              clone.scale.y *= -1;
              clone.position.y *= -1;
              obj3D.add(clone);
              nextInstances.push(clone);
            }
            if (mod.mirrorZ) {
              const clone = inst.clone();
              clone.name = 'modifier_clone_mirror_z';
              clone.scale.z *= -1;
              clone.position.z *= -1;
              obj3D.add(clone);
              nextInstances.push(clone);
            }
          });
        }

        currentInstances = [...currentInstances, ...nextInstances];
      });
    };

    // Helper: Get or create texture from cache
    const getTexture = (type: SceneObject['texture'], customUrl?: string) => {
      const texType = type || 'default';

      if (texType === 'custom' && customUrl) {
        if (!textureCache.current.has(customUrl)) {
          const loader = new THREE.TextureLoader();
          const tex = loader.load(customUrl);
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(1, 1);
          textureCache.current.set(customUrl, tex);
        }
        return textureCache.current.get(customUrl)!;
      }

      if (!textureCache.current.has(texType)) {
        textureCache.current.set(texType, createProceduralTexture(texType as any));
      }
      return textureCache.current.get(texType)!;
    };

    // 2. Add or update objects
    objects.forEach((obj) => {
      let obj3D = threeObjects.current.get(obj.id);

      if (!obj3D) {
        // Create new Three.js object based on type
        if (
          obj.type === 'cube' ||
          obj.type === 'sphere' ||
          obj.type === 'cylinder' ||
          obj.type === 'torus' ||
          obj.type === 'plane'
        ) {
          // Standard meshes
          let geometry: THREE.BufferGeometry;
          switch (obj.type) {
            case 'sphere':
              geometry = new THREE.SphereGeometry(obj.radius ?? 0.5, obj.segments ?? 32, obj.segments ?? 32);
              break;
            case 'cylinder':
              geometry = new THREE.CylinderGeometry(obj.radius ?? 0.5, obj.radius ?? 0.5, 1, obj.radialSegments ?? 32);
              break;
            case 'torus':
              geometry = new THREE.TorusGeometry(obj.radius ?? 0.4, obj.tubularSegments ?? 0.15, obj.segments ?? 16, obj.radialSegments ?? 64);
              break;
            case 'plane':
              geometry = new THREE.PlaneGeometry(1, 1);
              break;
            case 'cube':
            default:
              geometry = new THREE.BoxGeometry(1, 1, 1);
              break;
          }

          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(obj.color || '#cbd5e1'),
            roughness: obj.roughness ?? 0.5,
            metalness: obj.metalness ?? 0.0,
            opacity: obj.opacity ?? 1.0,
            transparent: (obj.opacity ?? 1.0) < 1.0,
            emissive: new THREE.Color(obj.emissive || '#000000'),
            emissiveIntensity: obj.emissiveIntensity ?? 1.0,
            wireframe: obj.wireframe ?? false,
            map: getTexture(obj.texture, obj.customProperties?.customTexture),
          });

          // Special: rotate plane so it lies flat on ground initially
          if (obj.type === 'plane') {
            geometry.rotateX(-Math.PI / 2);
          }

          const mesh = new THREE.Mesh(geometry, material);
          mesh.name = 'base_mesh';
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const group = new THREE.Group();
          group.add(mesh);
          obj3D = group;

          // Set initial parametric userdata
          obj3D.userData.radius = obj.radius;
          obj3D.userData.segments = obj.segments;
          obj3D.userData.radialSegments = obj.radialSegments;
          obj3D.userData.tubularSegments = obj.tubularSegments;
        } else if (
          obj.type === 'directionalLight' ||
          obj.type === 'pointLight' ||
          obj.type === 'spotLight'
        ) {
          // Lights. We wrap them in a Group so the Gizmo attaches to the group,
          // and we can position the light and a visual helper together.
          const lightGroup = new THREE.Group();
          let light: THREE.Light;
          let helperMesh: THREE.Mesh;
          let helper: THREE.Object3D | null = null;

          const defaultColor = new THREE.Color(obj.color || '#ffffff');
          const intensity = obj.intensity ?? 1.0;

          // Helper Mesh (so the light is visible and clickable in editor)
          const helperGeom = new THREE.OctahedronGeometry(0.2, 0);

          switch (obj.type) {
            case 'directionalLight': {
              const dLight = new THREE.DirectionalLight(defaultColor, intensity);
              dLight.castShadow = true;
              dLight.shadow.mapSize.width = 1024;
              dLight.shadow.mapSize.height = 1024;
              light = dLight;
              
              // Directional light helper mesh (yellow octahedron)
              const helperMat = new THREE.MeshBasicMaterial({ color: 0xeab308, wireframe: true });
              helperMesh = new THREE.Mesh(helperGeom, helperMat);
              helper = new THREE.DirectionalLightHelper(dLight, 0.5, 0xeab308);
              break;
            }
            case 'spotLight': {
              const sLight = new THREE.SpotLight(
                defaultColor,
                intensity,
                obj.distance ?? 10,
                THREE.MathUtils.degToRad(obj.angle ?? 30),
                obj.decay ?? 2
              );
              sLight.castShadow = true;
              light = sLight;

              // Spot light helper mesh (pink octahedron)
              const helperMat = new THREE.MeshBasicMaterial({ color: 0xec4899, wireframe: true });
              helperMesh = new THREE.Mesh(helperGeom, helperMat);
              helper = new THREE.SpotLightHelper(sLight, 0xec4899);
              break;
            }
            case 'pointLight':
            default: {
              const pLight = new THREE.PointLight(
                defaultColor,
                intensity,
                obj.distance ?? 10,
                obj.decay ?? 2
              );
              pLight.castShadow = true;
              light = pLight;

              // Point light helper mesh (orange octahedron)
              const helperMat = new THREE.MeshBasicMaterial({ color: 0xf97316, wireframe: true });
              helperMesh = new THREE.Mesh(helperGeom, helperMat);
              helper = new THREE.PointLightHelper(pLight, 0.2, 0xf97316);
              break;
            }
          }

          // Mark helper mesh so Raycaster can select it
          helperMesh.userData = { id: obj.id, isLightHelper: true };
          lightGroup.add(light);
          lightGroup.add(helperMesh);

          // Save references on the group
          lightGroup.userData = {
            helperMesh: helperMesh,
            light: light,
            helper: helper,
          };

          if (helper) {
            scene.add(helper);
          }

          obj3D = lightGroup;
        } else if (obj.type === 'camera') {
          // Camera Node Mock representation
          const camGroup = new THREE.Group();
          
          // Body
          const bodyGeom = new THREE.BoxGeometry(0.3, 0.2, 0.2);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.8, roughness: 0.2 });
          const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
          bodyMesh.castShadow = true;
          bodyMesh.userData = { id: obj.id, isCameraHelper: true };
          camGroup.add(bodyMesh);

          // Lens
          const lensGeom = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 8);
          lensGeom.rotateX(Math.PI / 2);
          lensGeom.translate(0, 0, -0.15);
          const lensMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });
          const lensMesh = new THREE.Mesh(lensGeom, lensMat);
          lensMesh.castShadow = true;
          lensMesh.userData = { id: obj.id, isCameraHelper: true };
          camGroup.add(lensMesh);

          obj3D = camGroup;

          // Instantiate real secondary camera for scissor rendering
          const pipCamera = new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 100);
          sceneCamerasRef.current.set(obj.id, pipCamera);
        } else if (obj.type === 'audio') {
          // Audio Node Mock representation
          const audioGroup = new THREE.Group();
          
          // Speaker box
          const boxGeom = new THREE.BoxGeometry(0.25, 0.35, 0.2);
          const boxMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.5, roughness: 0.5 });
          const boxMesh = new THREE.Mesh(boxGeom, boxMat);
          boxMesh.castShadow = true;
          boxMesh.userData = { id: obj.id, isAudioHelper: true };
          audioGroup.add(boxMesh);

          // Speaker cone
          const coneGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
          coneGeom.rotateX(Math.PI / 2);
          coneGeom.translate(0, 0.05, 0.1);
          const coneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.2, roughness: 0.8 });
          const coneMesh = new THREE.Mesh(coneGeom, coneMat);
          coneMesh.castShadow = true;
          coneMesh.userData = { id: obj.id, isAudioHelper: true };
          audioGroup.add(coneMesh);

          obj3D = audioGroup;

          // Spatial Audio positional sound binding
          const listener = audioListenerRef.current;
          if (listener) {
            const sound = new THREE.PositionalAudio(listener);
            audioGroup.add(sound);
            audioGroup.userData.sound = sound;

            // Load audio clip
            const audioLoader = new THREE.AudioLoader();
            const soundUrl = obj.customProperties.soundUrl || 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg';
            audioLoader.load(soundUrl, (buffer) => {
              sound.setBuffer(buffer);
              sound.setRefDistance(1.5);
              sound.setVolume(1.0);
              sound.setLoop(true);
              
              // Play if active/playing
              if (isPlayingRef.current) {
                sound.play();
              }
            });
          }
        } else if (obj.type === 'group') {
          // Empty folder or container
          obj3D = new THREE.Group();
        } else if (obj.type === 'gltf') {
          const modelGroup = new THREE.Group();
          obj3D = modelGroup;

          if (obj.customProperties?.modelData) {
            const loader = new GLTFLoader();
            loader.load(
              obj.customProperties.modelData,
              (gltf) => {
                gltf.scene.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                  }
                });
                modelGroup.add(gltf.scene);
              },
              undefined,
              (err) => {
                console.error('Error loading custom GLTF model:', err);
              }
            );
          }
        } else {
          obj3D = new THREE.Object3D();
        }

        // Attach scene graph identifiers
        obj3D.userData = { id: obj.id, type: obj.type };
        scene.add(obj3D);
        threeObjects.current.set(obj.id, obj3D);
      }

      // 3. Update existing object properties in Three.js (if not actively being dragged)
      const isGizmoActive = selectedIdRef.current === obj.id && transformControlsRef.current?.dragging;
      if (!isGizmoActive) {
        const posTrack = obj.tracks.find((t) => t.property === 'position');
        if (!posTrack || posTrack.keyframes.length === 0) {
          obj3D.position.set(obj.position[0], obj.position[1], obj.position[2]);
        } else {
          const val = getInterpolatedValue(posTrack, currentFrame, obj.position);
          obj3D.position.set(val[0], val[1], val[2]);
        }

        const rotTrack = obj.tracks.find((t) => t.property === 'rotation');
        if (!rotTrack || rotTrack.keyframes.length === 0) {
          obj3D.rotation.set(
            THREE.MathUtils.degToRad(obj.rotation[0]),
            THREE.MathUtils.degToRad(obj.rotation[1]),
            THREE.MathUtils.degToRad(obj.rotation[2])
          );
        } else {
          const val = getInterpolatedValue(rotTrack, currentFrame, obj.rotation);
          obj3D.rotation.set(
            THREE.MathUtils.degToRad(val[0]),
            THREE.MathUtils.degToRad(val[1]),
            THREE.MathUtils.degToRad(val[2])
          );
        }

        const scaleTrack = obj.tracks.find((t) => t.property === 'scale');
        if (!scaleTrack || scaleTrack.keyframes.length === 0) {
          obj3D.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
        } else {
          const val = getInterpolatedValue(scaleTrack, currentFrame, obj.scale);
          obj3D.scale.set(val[0], val[1], val[2]);
        }
      }

      // Sync parenting structure
      if (obj.parentId) {
        const parentObj3D = threeObjects.current.get(obj.parentId);
        if (parentObj3D && obj3D.parent !== parentObj3D) {
          parentObj3D.add(obj3D);
        }
      } else {
        if (obj3D.parent && obj3D.parent !== scene) {
          scene.add(obj3D);
        }
      }

      // Sync material details
      const baseMesh = obj3D.getObjectByName('base_mesh') || (obj3D instanceof THREE.Mesh ? obj3D : null);
      if (baseMesh instanceof THREE.Mesh && !(baseMesh.userData.isLightHelper)) {
        const material = baseMesh.material as THREE.MeshStandardMaterial;
        if (material) {
          if (shadingMode === 'solid') {
            material.color.set('#7f7f7f');
            material.roughness = 1.0;
            material.metalness = 0.0;
          } else {
            material.color.set(obj.color || '#cbd5e1');
            material.roughness = obj.roughness ?? 0.5;
            material.metalness = obj.metalness ?? 0.0;
          }
          material.opacity = obj.opacity ?? 1.0;
          material.transparent = (obj.opacity ?? 1.0) < 1.0;
          material.emissive.set(obj.emissive || '#000000');
          material.emissiveIntensity = obj.emissiveIntensity ?? 1.0;
          material.wireframe = shadingMode === 'wireframe' ? true : (obj.wireframe ?? false);

          // Sync texture map
          const newTex = getTexture(obj.texture, obj.customProperties?.customTexture);
          if (material.map !== newTex) {
            material.map = newTex;
            material.needsUpdate = true;
          }
        }

        // Sync parametric geometries
        const ud = obj3D.userData;
        if (
          baseMesh instanceof THREE.Mesh &&
          (ud.radius !== obj.radius ||
           ud.segments !== obj.segments ||
           ud.radialSegments !== obj.radialSegments ||
           ud.tubularSegments !== obj.tubularSegments)
        ) {
          // Dispose of old geometry
          baseMesh.geometry.dispose();

          // Create new geometry
          let newGeom: THREE.BufferGeometry;
          switch (obj.type) {
            case 'sphere':
              newGeom = new THREE.SphereGeometry(obj.radius ?? 0.5, obj.segments ?? 32, obj.segments ?? 32);
              break;
            case 'cylinder':
              newGeom = new THREE.CylinderGeometry(obj.radius ?? 0.5, obj.radius ?? 0.5, 1, obj.radialSegments ?? 32);
              break;
            case 'torus':
              newGeom = new THREE.TorusGeometry(obj.radius ?? 0.4, obj.tubularSegments ?? 0.15, obj.segments ?? 16, obj.radialSegments ?? 64);
              break;
            case 'plane':
              newGeom = new THREE.PlaneGeometry(1, 1);
              newGeom.rotateX(-Math.PI / 2);
              break;
            case 'cube':
            default:
              newGeom = new THREE.BoxGeometry(1, 1, 1);
              break;
          }

          baseMesh.geometry = newGeom;

          // Update cached values
          ud.radius = obj.radius;
          ud.segments = obj.segments;
          ud.radialSegments = obj.radialSegments;
          ud.tubularSegments = obj.tubularSegments;
        }
      }

      // Sync lights details
      if (obj3D.userData.light) {
        const light = obj3D.userData.light as THREE.Light;
        light.color.set(obj.color || '#ffffff');
        
        // Don't fight intensity animations if playing
        if (!isPlayingRef.current) {
          light.intensity = obj.intensity ?? 1.0;
        }

        if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) {
          light.distance = obj.distance ?? 10;
          light.decay = obj.decay ?? 2;
        }
        if (light instanceof THREE.SpotLight) {
          light.angle = THREE.MathUtils.degToRad(obj.angle ?? 30);
        }

        // Update light helpers
        if (obj3D.userData.helper) {
          obj3D.userData.helper.update();
        }
      }

      // Sync Visibility
      obj3D.visible = obj.visible;

      // Apply procedural modifiers (Array, Mirror)
      applyModifiers(obj3D, obj);
    });

    // Toggle play/pause for audio nodes when isPlaying transitions
    threeObjects.current.forEach((obj3D) => {
      if (obj3D.userData.type === 'audio' && obj3D.userData.sound) {
        const sound = obj3D.userData.sound as THREE.PositionalAudio;
        if (sound.buffer) {
          if (isPlaying && !sound.isPlaying) {
            sound.play();
          } else if (!isPlaying && sound.isPlaying) {
            sound.pause();
          }
        }
      }
    });

    // 4. Update the selection gizmo target
    const transformControls = transformControlsRef.current;
    if (transformControls) {
      if (selectedId) {
        const activeObj = threeObjects.current.get(selectedId);
        // Only attach if it exists, is visible, is not locked, and the mode is not 'select'
        const isLocked = objects.find((o) => o.id === selectedId)?.locked;
        if (activeObj && activeObj.visible && !isLocked && transformMode !== 'select') {
          transformControls.attach(activeObj);
        } else {
          transformControls.detach();
        }
      } else {
        transformControls.detach();
      }
    }
  }, [objects, selectedId, transformMode, isPlaying]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', outline: 'none', position: 'relative' }}>
      {/* Floating Viewport Navigation Toolbar (Blender-style) */}
      {!previewMode && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '6px',
          zIndex: 40,
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
        }}>
          {/* Grid Toggle */}
          <button
            onClick={() => onUpdateState?.({ gridVisible: !gridVisible })}
            title="Toggle Grid Helper"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: gridVisible ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
              color: gridVisible ? 'rgb(0, 240, 255)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              if (!gridVisible) e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.background = gridVisible ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              if (!gridVisible) e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = gridVisible ? 'rgba(0, 240, 255, 0.2)' : 'transparent';
            }}
          >
            <Grid size={15} />
          </button>

          {/* Camera View Angle Cycle */}
          <button
            onClick={() => {
              const presets: ('perspective' | 'top' | 'front' | 'right')[] = ['perspective', 'top', 'front', 'right'];
              const nextIdx = (presets.indexOf(cameraPreset) + 1) % presets.length;
              onUpdateState?.({ cameraPreset: presets[nextIdx] });
            }}
            title={`Cycle View Camera (Active: ${cameraPreset.toUpperCase()})`}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: cameraPreset !== 'perspective' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
              color: cameraPreset !== 'perspective' ? 'rgb(0, 240, 255)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              if (cameraPreset === 'perspective') e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.background = cameraPreset !== 'perspective' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              if (cameraPreset === 'perspective') e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = cameraPreset !== 'perspective' ? 'rgba(0, 240, 255, 0.2)' : 'transparent';
            }}
          >
            <Video size={15} />
            {cameraPreset !== 'perspective' && (
              <span style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                fontSize: '7px',
                fontWeight: 'bold',
                background: 'rgb(0, 240, 255)',
                color: '#000',
                padding: '0 2px',
                borderRadius: '2px',
                textTransform: 'uppercase'
              }}>
                {cameraPreset.substring(0, 3)}
              </span>
            )}
          </button>

          {/* Pan Hand Mode */}
          <button
            onClick={() => setIsPanMode(!isPanMode)}
            title={isPanMode ? "Active: Pan Mode (Drag to Pan)" : "Switch to Pan Mode"}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: isPanMode ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
              color: isPanMode ? 'rgb(0, 240, 255)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              if (!isPanMode) e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.background = isPanMode ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              if (!isPanMode) e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = isPanMode ? 'rgba(0, 240, 255, 0.2)' : 'transparent';
            }}
          >
            <Hand size={15} />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => handleZoom(0.85)}
            title="Zoom In"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <ZoomIn size={15} />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => handleZoom(1.15)}
            title="Zoom Out"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <ZoomOut size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
