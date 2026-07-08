import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { SceneObject, EditorState } from '../types';
import { createProceduralTexture } from '../utils/textures';
import { getInterpolatedValue } from '../utils/animator';

interface ThreeViewportProps {
  objects: SceneObject[];
  selectedId: string | null;
  transformMode: EditorState['transformMode'];
  snapEnabled: boolean;
  snapTranslation: number;
  snapRotation: number;
  snapScale: number;
  currentFrame: number;
  isPlaying: boolean;
  fps: number;
  loop: boolean;
  cameraPreset: EditorState['cameraPreset'];
  onSelectObject: (id: string | null) => void;
  onUpdateObjectTransform: (
    id: string,
    pos: [number, number, number],
    rot: [number, number, number],
    scale: [number, number, number]
  ) => void;
  onFrameChange: (frame: number) => void;
}

export function ThreeViewport({
  objects,
  selectedId,
  transformMode,
  snapEnabled,
  snapTranslation,
  snapRotation,
  snapScale,
  currentFrame,
  isPlaying,
  fps,
  loop,
  cameraPreset,
  onSelectObject,
  onUpdateObjectTransform,
  onFrameChange,
}: ThreeViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // References to core Three.js components
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Maps to track 3D objects and helpers
  const threeObjects = useRef<Map<string, THREE.Object3D>>(new Map());
  const textureCache = useRef<Map<string, THREE.Texture>>(new Map());

  // Keep track of latest props in refs for the animation loop
  const objectsRef = useRef(objects);
  const selectedIdRef = useRef(selectedId);
  const currentFrameRef = useRef(currentFrame);
  const isPlayingRef = useRef(isPlaying);
  const fpsRef = useRef(fps);
  const loopRef = useRef(loop);

  useEffect(() => {
    objectsRef.current = objects;
    selectedIdRef.current = selectedId;
    currentFrameRef.current = currentFrame;
    isPlayingRef.current = isPlaying;
    fpsRef.current = fps;
    loopRef.current = loop;
  }, [objects, selectedId, currentFrame, isPlaying, fps, loop]);

  // Handle initialization of Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x18181b, 1); // Slate-900 background
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x18181b, 0.015);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(8, 8, 8);
    cameraRef.current = camera;

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
        
        onUpdateObjectTransform(id, pos, rot, scale);
      }
    });

    // Touch raycaster for selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      // Don't raycast if user is clicking on/using the transform gizmo
      if (transformControls.dragging || transformControls.axis !== null) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      // Calculate NDC
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

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
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Core Animation / Render Loop
    let lastTime = performance.now();
    let accumulatedTime = 0;

    const animate = () => {
      requestAnimationFrame(animate);

      const time = performance.now();
      const delta = (time - lastTime) / 1000;
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
          const totalFrames = 120; // Default limit, can be customized

          if (nextFrame > totalFrames) {
            if (loopRef.current) {
              onFrameChange(0);
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
      });

      // Update controllers
      orbitControls.update();

      // Render
      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      resizeObserver.disconnect();
      if (rendererRef.current && containerRef.current) {
        rendererRef.current.domElement.removeEventListener('mousedown', handlePointerDown);
        rendererRef.current.domElement.removeEventListener('touchstart', handlePointerDown);
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      // Dispose resources
      threeObjects.current.forEach((obj) => {
        scene.remove(obj);
      });
      threeObjects.current.clear();
      textureCache.current.forEach((tex) => tex.dispose());
      textureCache.current.clear();
    };
  }, []);

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

  // Sync Gizmo Transform Mode & Snapping
  useEffect(() => {
    const transformControls = transformControlsRef.current;
    if (!transformControls) return;

    if (transformMode === 'select') {
      transformControls.detach();
    } else {
      transformControls.setMode(transformMode);
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

    if (snapEnabled) {
      transformControls.setTranslationSnap(snapTranslation);
      transformControls.setRotationSnap(THREE.MathUtils.degToRad(snapRotation));
      transformControls.setScaleSnap(snapScale);
    } else {
      transformControls.setTranslationSnap(null);
      transformControls.setRotationSnap(null);
      transformControls.setScaleSnap(null);
    }
  }, [snapEnabled, snapTranslation, snapRotation, snapScale]);

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

    // Helper: Get or create texture from cache
    const getTexture = (type: SceneObject['texture']) => {
      const texType = type || 'default';
      if (!textureCache.current.has(texType)) {
        textureCache.current.set(texType, createProceduralTexture(texType));
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
              geometry = new THREE.SphereGeometry(0.5, 32, 32);
              break;
            case 'cylinder':
              geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
              break;
            case 'torus':
              geometry = new THREE.TorusGeometry(0.4, 0.15, 16, 64);
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
            wireframe: obj.wireframe ?? false,
            map: getTexture(obj.texture),
          });

          // Special: rotate plane so it lies flat on ground initially
          if (obj.type === 'plane') {
            geometry.rotateX(-Math.PI / 2);
          }

          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          obj3D = mesh;
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
        } else if (obj.type === 'group') {
          // Empty folder or container
          obj3D = new THREE.Group();
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
        obj3D.position.set(obj.position[0], obj.position[1], obj.position[2]);
        obj3D.rotation.set(
          THREE.MathUtils.degToRad(obj.rotation[0]),
          THREE.MathUtils.degToRad(obj.rotation[1]),
          THREE.MathUtils.degToRad(obj.rotation[2])
        );
        obj3D.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
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
      if (obj3D instanceof THREE.Mesh && !(obj3D.userData.isLightHelper)) {
        const material = obj3D.material as THREE.MeshStandardMaterial;
        if (material) {
          material.color.set(obj.color || '#cbd5e1');
          material.roughness = obj.roughness ?? 0.5;
          material.metalness = obj.metalness ?? 0.0;
          material.opacity = obj.opacity ?? 1.0;
          material.transparent = (obj.opacity ?? 1.0) < 1.0;
          material.emissive.set(obj.emissive || '#000000');
          material.wireframe = obj.wireframe ?? false;

          // Sync texture map
          const newTex = getTexture(obj.texture);
          if (material.map !== newTex) {
            material.map = newTex;
            material.needsUpdate = true;
          }
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
    });

    // 4. Update the selection gizmo target
    const transformControls = transformControlsRef.current;
    if (transformControls) {
      if (selectedId) {
        const activeObj = threeObjects.current.get(selectedId);
        // Only attach if it exists, is visible, and the mode is not 'select'
        if (activeObj && activeObj.visible && transformMode !== 'select') {
          transformControls.attach(activeObj);
        } else {
          transformControls.detach();
        }
      } else {
        transformControls.detach();
      }
    }
  }, [objects, selectedId, transformMode]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', outline: 'none' }} />;
}
