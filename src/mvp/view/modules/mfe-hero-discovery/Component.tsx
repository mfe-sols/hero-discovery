import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";

import type { HeroDiscoveryDetailHotspot, HeroDiscoveryViewModel } from "./model";

type HeroDiscoveryProps = {
  vm: HeroDiscoveryViewModel;
  isAuthenticated: boolean;
  commentLoginHint: string;
};

const DEG2RAD = Math.PI / 180;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clampRating = (value: number) => Math.max(1, Math.min(5, Math.round(value)));

// Center an active button inside its own scroll container (rail) WITHOUT ever
// scrolling the page. Native scrollIntoView bubbles to the window and, on mobile
// where the rail only scrolls horizontally, drags the whole document up to the
// hero whenever the banner auto-advances. We scroll the container directly instead.
const centerButtonInRail = (button: HTMLElement | null) => {
  const track = button?.parentElement;
  if (!button || !track) return;
  const canScrollX = track.scrollWidth > track.clientWidth + 1;
  const canScrollY = track.scrollHeight > track.clientHeight + 1;
  if (!canScrollX && !canScrollY) return;
  const trackRect = track.getBoundingClientRect();
  const btnRect = button.getBoundingClientRect();
  if (canScrollX) {
    const delta = btnRect.left + btnRect.width / 2 - (trackRect.left + trackRect.width / 2);
    track.scrollBy({ left: delta, behavior: "smooth" });
  } else {
    const delta = btnRect.top + btnRect.height / 2 - (trackRect.top + trackRect.height / 2);
    track.scrollBy({ top: delta, behavior: "smooth" });
  }
};

const proxyUrl = (src: string, w: number, h: number, q: number, fmt = "jpg") =>
  `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${w}&h=${h}&q=${q}&output=${fmt}`;

const previewUrl = (src: string) => proxyUrl(src, 2048, 1024, 72, "jpg");
const fullUrl = (src: string) => proxyUrl(src, 4096, 2048, 84, "jpg");
const bannerPreviewUrl = (src: string) => proxyUrl(src, 2048, 1024, 70, "jpg");

const hotspotToVector = (longitude: number, latitude: number) => {
  const phi = (90 - latitude) * DEG2RAD;
  const theta = longitude * DEG2RAD;

  return new THREE.Vector3(
    500 * Math.sin(phi) * Math.cos(theta),
    500 * Math.cos(phi),
    500 * Math.sin(phi) * Math.sin(theta),
  );
};

const sharedLoader = new THREE.TextureLoader();
sharedLoader.setCrossOrigin("anonymous");

const textureCache = new Map<string, THREE.Texture>();
const FEATURE_BANNER_TIMING = {
  skeletonMinMs: 720,
  autoAdvanceMs: 10_000,
  rotationDurationMs: 45_000,
} as const;

type ViewerRuntime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sphere: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
};

function loadTexture(
  url: string,
  onLoad: (texture: THREE.Texture) => void,
  onProgress?: (pct: number) => void,
  onError?: () => void,
): () => void {
  let cancelled = false;
  const cached = textureCache.get(url);

  if (cached) {
    queueMicrotask(() => {
      if (!cancelled) onLoad(cached);
    });
    return () => {
      cancelled = true;
    };
  }

  sharedLoader.load(
    url,
    (texture) => {
      if (cancelled) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      textureCache.set(url, texture);
      onLoad(texture);
    },
    (event) => {
      if (!onProgress || cancelled) return;
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
    () => {
      if (!cancelled) onError?.();
    },
  );

  return () => {
    cancelled = true;
  };
}

export const HeroDiscovery = ({ vm, isAuthenticated, commentLoginHint }: HeroDiscoveryProps): JSX.Element => {
  const detailRef = useRef<HTMLDivElement | null>(null);
  const featureRef = useRef<HTMLElement | null>(null);
  const discoveryBarHostRef = useRef<HTMLDivElement | null>(null);
  const discoveryBarRef = useRef<HTMLFormElement | null>(null);
  const featureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hotspotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const featureButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const roomButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const featureViewerRef = useRef<ViewerRuntime | null>(null);
  const viewerRef = useRef<ViewerRuntime | null>(null);
  const featureSkeletonTimerRef = useRef<number | null>(null);
  const featureHasLoadedRef = useRef(false);
  const isDetailOpenRef = useRef(false);
  const autoRotateRef = useRef(false);
  const featureCameraRef = useRef({ lon: 0, lat: -2, fov: 68 });
  const cameraRef = useRef({ lon: 0, lat: 0, fov: 75 });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startLon: 0,
    startLat: 0,
  });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isDetailFullscreen, setIsDetailFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(vm.detailRooms[0]?.id ?? "");
  const [isViewerLoading, setIsViewerLoading] = useState(false);
  const [viewerLoadProgress, setViewerLoadProgress] = useState(0);
  const [viewerError, setViewerError] = useState(false);
  const [isFeatureViewerLoading, setIsFeatureViewerLoading] = useState(true);
  const [isFeatureViewerReady, setIsFeatureViewerReady] = useState(false);
  const [displayedFeaturePanoramaUrl, setDisplayedFeaturePanoramaUrl] = useState<string | null>(null);
  const [activeFeatureId, setActiveFeatureId] = useState(vm.featureArticles[0]?.id ?? "");
  const [isFeatureRailPaused, setIsFeatureRailPaused] = useState(false);
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [activeDiscoveryFilter, setActiveDiscoveryFilter] = useState(vm.discoveryFilters[0] ?? "");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentRating, setCommentRating] = useState(() => clampRating(vm.detailComments[0]?.rating ?? 5));
  const [submittedComment, setSubmittedComment] = useState<string | null>(null);
  const [submittedRating, setSubmittedRating] = useState<number | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileFeedbackOpen, setIsMobileFeedbackOpen] = useState(false);
  const [isDiscoveryBarPinned, setIsDiscoveryBarPinned] = useState(false);

  const activeRoom = useMemo(
    () => vm.detailRooms.find((room) => room.id === activeRoomId) ?? vm.detailRooms[0],
    [activeRoomId, vm.detailRooms],
  );

  const featurePanoramaUrl = vm.featurePanoramaUrl || vm.detailRooms[0]?.panoramaUrl;

  const activeFeatureArticle = useMemo(
    () => vm.featureArticles.find((article) => article.id === activeFeatureId) ?? vm.featureArticles[0],
    [activeFeatureId, vm.featureArticles],
  );

  const activeFeatureCoverUrl = activeFeatureArticle?.heroImageUrl ?? activeFeatureArticle?.imageUrl ?? vm.featureImageUrl;
  const activeFeatureCoverAlt = activeFeatureArticle?.imageAlt ?? vm.featureImageAlt;
  const activeFeatureTitle = activeFeatureArticle?.title ?? vm.featureTitle;
  const activeFeaturePanoramaUrl = activeFeatureArticle?.panoramaUrl ?? featurePanoramaUrl;
  const shouldUseFeaturePanorama = Boolean(activeFeaturePanoramaUrl);
  const isActiveFeaturePanoramaReady = !activeFeaturePanoramaUrl || displayedFeaturePanoramaUrl === activeFeaturePanoramaUrl;

  const detailComments = useMemo(() => {
    if (!isAuthenticated || !submittedComment?.trim()) return vm.detailComments;

    return [
      {
        id: "current-user-comment",
        author: vm.detailCommentAuthorName,
        role: vm.detailCommentAuthorRole,
        rating: submittedRating ?? commentRating,
        body: submittedComment.trim(),
      },
      ...vm.detailComments,
    ];
  }, [commentRating, isAuthenticated, submittedComment, submittedRating, vm.detailCommentAuthorName, vm.detailCommentAuthorRole, vm.detailComments]);

  const resetViewpoint = useCallback(() => {
    cameraRef.current = { lon: 0, lat: 0, fov: 75 };
  }, []);

  const handleSelectRoom = useCallback((roomId: string) => {
    if (roomId === activeRoomId) {
      resetViewpoint();
      return;
    }

    setActiveRoomId(roomId);
  }, [activeRoomId, resetViewpoint]);

  const handleFeatureSelect = useCallback((articleId: string) => {
    setActiveFeatureId(articleId);
  }, []);

  const handleDiscoverySubmit = useCallback((event: { preventDefault: () => void }) => {
    event.preventDefault();
    setIsFeatureRailPaused(true);
  }, []);

  const handleDiscoveryFilter = useCallback((filter: string) => {
    setActiveDiscoveryFilter(filter);
    setDiscoveryQuery(filter);
    setIsFeatureRailPaused(true);
  }, []);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    isDetailOpenRef.current = isDetailOpen;
  }, [isDetailOpen]);

  const openDetail = () => {
    if (!activeRoom && vm.detailRooms[0]) {
      setActiveRoomId(vm.detailRooms[0].id);
    }
    setIsMobileFeedbackOpen(false);
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    if (typeof document !== "undefined" && document.fullscreenElement === detailRef.current) {
      void document.exitFullscreen?.();
    }
    setIsDetailOpen(false);
    setIsPanelExpanded(false);
    setAutoRotate(false);
  };

  const toggleDetailFullscreen = async () => {
    const node = detailRef.current;
    if (!node || typeof document === "undefined") return;

    try {
      if (document.fullscreenElement === node) {
        await document.exitFullscreen?.();
      } else {
        await node.requestFullscreen?.();
      }
    } catch {
      // Ignore fullscreen failures and keep the detail overlay usable.
    }
  };

  const enterDetailVrMode = async () => {
    setAutoRotate(true);
    if (typeof document !== "undefined" && document.fullscreenElement !== detailRef.current) {
      await toggleDetailFullscreen();
    }
  };

  useEffect(() => {
    setActiveRoomId(vm.detailRooms[0]?.id ?? "");
    setActiveFeatureId(vm.featureArticles[0]?.id ?? "");
    setActiveDiscoveryFilter(vm.discoveryFilters[0] ?? "");
    setDiscoveryQuery("");
    setCommentDraft("");
    setSubmittedComment(null);
    setSubmittedRating(null);
    setCommentRating(clampRating(vm.detailComments[0]?.rating ?? 5));
  }, [vm.detailComments, vm.detailRooms, vm.discoveryFilters, vm.featureArticles]);

  useEffect(() => {
    if (isDetailOpen || isFeatureRailPaused || isFeatureViewerLoading || !isActiveFeaturePanoramaReady || vm.featureArticles.length < 2) return undefined;

    const timeout = window.setTimeout(() => {
      setActiveFeatureId((currentId) => {
        const currentIndex = vm.featureArticles.findIndex((article) => article.id === currentId);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % vm.featureArticles.length : 0;
        return vm.featureArticles[nextIndex]?.id ?? currentId;
      });
    }, FEATURE_BANNER_TIMING.autoAdvanceMs);

    return () => window.clearTimeout(timeout);
  }, [activeFeatureId, isActiveFeaturePanoramaReady, isDetailOpen, isFeatureRailPaused, isFeatureViewerLoading, vm.featureArticles]);

  useEffect(() => {
    if (!activeFeatureId) return;

    centerButtonInRail(featureButtonRefs.current[activeFeatureId]);
  }, [activeFeatureId]);

  const onSubmitComment = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!isAuthenticated) return;

    const nextComment = commentDraft.trim();
    if (!nextComment) return;

    setSubmittedComment(nextComment);
    setSubmittedRating(commentRating);
    setCommentDraft("");
  };

  const isFeedbackOpen = !isMobileViewport || isMobileFeedbackOpen;

  useEffect(() => {
    if (!isDetailOpen || !activeRoomId) return;

    centerButtonInRail(roomButtonRefs.current[activeRoomId]);
  }, [activeRoomId, isDetailOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onChange = () => {
      setIsDetailFullscreen(document.fullscreenElement === detailRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(max-width: 720px)");
    const updateViewport = (event?: MediaQueryListEvent | MediaQueryList) => {
      const nextIsMobile = (event ?? media).matches;
      setIsMobileViewport(nextIsMobile);
      if (!nextIsMobile) {
        setIsMobileFeedbackOpen(true);
      }
    };

    updateViewport(media);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateViewport);
      return () => media.removeEventListener("change", updateViewport);
    }

    media.addListener(updateViewport);
    return () => media.removeListener(updateViewport);
  }, []);

  useEffect(() => {
    if (!isDetailOpen || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDetailOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const preloadedImages = vm.featureArticles.map((article) => {
      const image = new Image();
      image.decoding = "async";
      image.src = article.heroImageUrl ?? article.imageUrl;
      return image;
    });

    return () => {
      preloadedImages.length = 0;
    };
  }, [vm.featureArticles]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const canvas = featureCanvasRef.current;
    const container = featureRef.current;
    if (!canvas || !container) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);

    const geometry = new THREE.SphereGeometry(500, 48, 32);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    featureViewerRef.current = { renderer, scene, camera, sphere, material };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let previousFrameAt = 0;
    const degreesPerMs = 360 / FEATURE_BANNER_TIMING.rotationDurationMs;
    const animate = (frameAt = 0) => {
      const runtime = featureViewerRef.current;
      const frameDeltaMs = previousFrameAt > 0 ? Math.min(frameAt - previousFrameAt, 64) : 0;
      previousFrameAt = frameAt;

      if (!runtime || isDetailOpenRef.current || document.hidden) return;

      const cam = featureCameraRef.current;
      cam.lon = (cam.lon + frameDeltaMs * degreesPerMs) % 360;
      const phi = (90 - cam.lat) * DEG2RAD;
      const theta = cam.lon * DEG2RAD;

      runtime.camera.fov = cam.fov;
      runtime.camera.updateProjectionMatrix();
      runtime.camera.lookAt(
        new THREE.Vector3(
          500 * Math.sin(phi) * Math.cos(theta),
          500 * Math.cos(phi),
          500 * Math.sin(phi) * Math.sin(theta),
        ),
      );
      runtime.renderer.render(runtime.scene, runtime.camera);
    };

    renderer.setAnimationLoop(animate);

    return () => {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      material.dispose();
      geometry.dispose();
      if (featureSkeletonTimerRef.current !== null) {
        window.clearTimeout(featureSkeletonTimerRef.current);
        featureSkeletonTimerRef.current = null;
      }
      featureViewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeFeaturePanoramaUrl || typeof window === "undefined") {
      setIsFeatureViewerLoading(false);
      setIsFeatureViewerReady(false);
      setDisplayedFeaturePanoramaUrl(null);
      return undefined;
    }

    const runtime = featureViewerRef.current;
    if (!runtime) return undefined;

    if (featureSkeletonTimerRef.current !== null) {
      window.clearTimeout(featureSkeletonTimerRef.current);
      featureSkeletonTimerRef.current = null;
    }

    const isInitialLoad = !featureHasLoadedRef.current;
    const skeletonStartedAt = window.performance.now();

    if (isInitialLoad) {
      setIsFeatureViewerLoading(true);
      setIsFeatureViewerReady(false);
    }

    const finishInitialLoad = (ready: boolean) => {
      const remainingMs = Math.max(0, FEATURE_BANNER_TIMING.skeletonMinMs - (window.performance.now() - skeletonStartedAt));

      featureSkeletonTimerRef.current = window.setTimeout(() => {
        featureHasLoadedRef.current = true;
        setIsFeatureViewerLoading(false);
        setIsFeatureViewerReady(ready);
        featureSkeletonTimerRef.current = null;
      }, remainingMs);
    };

    const cleanupTexture = loadTexture(
      bannerPreviewUrl(activeFeaturePanoramaUrl),
      (texture) => {
        runtime.material.map = texture;
        runtime.material.color.set(0xffffff);
        runtime.material.needsUpdate = true;
        setDisplayedFeaturePanoramaUrl(activeFeaturePanoramaUrl);

        if (isInitialLoad) {
          finishInitialLoad(true);
          return;
        }

        setIsFeatureViewerLoading(false);
        setIsFeatureViewerReady(true);
      },
      undefined,
      () => {
        setDisplayedFeaturePanoramaUrl(activeFeaturePanoramaUrl);

        if (isInitialLoad) {
          finishInitialLoad(false);
          return;
        }

        setIsFeatureViewerLoading(false);
      },
    );

    return () => {
      cleanupTexture();
    };
  }, [activeFeaturePanoramaUrl]);

  useEffect(() => {
    if (!isDetailOpen || typeof document === "undefined") return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        setIsDetailOpen(false);
        setIsPanelExpanded(false);
        setAutoRotate(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isDetailOpen]);

  useEffect(() => {
    if (!isDetailOpen) return undefined;

    const canvas = canvasRef.current;
    const container = detailRef.current;
    if (!canvas || !container) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const sphere = new THREE.Mesh(geometry, material);

    scene.add(sphere);
    viewerRef.current = { renderer, scene, camera, sphere, material };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const animate = () => {
      const runtime = viewerRef.current;
      if (!runtime) return;

      const cam = cameraRef.current;
      if (autoRotateRef.current && !dragRef.current.active) {
        cam.lon += 0.05;
      }
      const phi = (90 - cam.lat) * DEG2RAD;
      const theta = cam.lon * DEG2RAD;

      runtime.camera.fov = cam.fov;
      runtime.camera.updateProjectionMatrix();
      runtime.camera.lookAt(
        new THREE.Vector3(
          500 * Math.sin(phi) * Math.cos(theta),
          500 * Math.cos(phi),
          500 * Math.sin(phi) * Math.sin(theta),
        ),
      );
      runtime.renderer.render(runtime.scene, runtime.camera);

      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width > 0 && height > 0) {
        for (const hotspot of activeRoom?.hotspots ?? []) {
          const node = hotspotRefs.current[hotspot.id];
          if (!node) continue;

          const projected = hotspotToVector(hotspot.longitude, hotspot.latitude).project(runtime.camera);
          const visible = projected.z < 1;
          if (!visible) {
            node.style.display = "none";
            continue;
          }

          node.style.display = "flex";
          node.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
          node.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
        }
      }
    };

    renderer.setAnimationLoop(animate);

    return () => {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      material.dispose();
      geometry.dispose();
      viewerRef.current = null;
    };
  }, [activeRoom, isDetailOpen]);

  useEffect(() => {
    if (!isDetailOpen || !activeRoom) return undefined;
    const runtime = viewerRef.current;
    if (!runtime) return undefined;

    const lowUrl = previewUrl(activeRoom.panoramaUrl);
    const highUrl = fullUrl(activeRoom.panoramaUrl);

    resetViewpoint();
    setViewerError(false);
    setViewerLoadProgress(0);
    setIsViewerLoading(true);

    const applyTexture = (texture: THREE.Texture) => {
      runtime.material.map = texture;
      runtime.material.color.set(0xffffff);
      runtime.material.needsUpdate = true;
    };

    const cleanups: Array<() => void> = [];

    cleanups.push(
      loadTexture(
        lowUrl,
        (previewTexture) => {
          applyTexture(previewTexture);
          setIsViewerLoading(false);
          cleanups.push(
            loadTexture(
              highUrl,
              (fullTexture) => {
                applyTexture(fullTexture);
                setViewerLoadProgress(100);
              },
              (pct) => setViewerLoadProgress(pct),
              () => undefined,
            ),
          );
        },
        undefined,
        () => {
          cleanups.push(
            loadTexture(
              highUrl,
              (fullTexture) => {
                applyTexture(fullTexture);
                setIsViewerLoading(false);
                setViewerLoadProgress(100);
              },
              (pct) => setViewerLoadProgress(pct),
              () => {
                setIsViewerLoading(false);
                setViewerError(true);
              },
            ),
          );
        },
      ),
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [activeRoom, isDetailOpen, resetViewpoint]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startLon: cameraRef.current.lon,
      startLat: cameraRef.current.lat,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;

    cameraRef.current.lon = dragRef.current.startLon - dx * 0.2;
    cameraRef.current.lat = clamp(dragRef.current.startLat + dy * 0.2, -85, 85);
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  useEffect(() => {
    if (!isDetailOpen) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cameraRef.current.fov = clamp(cameraRef.current.fov + event.deltaY * 0.05, 35, 95);
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [isDetailOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let frame = 0;
    const syncDiscoveryBar = () => {
      frame = 0;

      const host = discoveryBarHostRef.current;
      const bar = discoveryBarRef.current;
      if (!host || !bar) return;

      const header = document.querySelector(".hdr-shell") as HTMLElement | null;
      const headerBottom = Math.max(header?.getBoundingClientRect().bottom ?? 0, 0);
      const hostRect = host.getBoundingClientRect();
      const nextPinned = hostRect.top <= headerBottom + 12;

      if (nextPinned) {
        bar.style.setProperty("--ts-hero-discovery-bar-top", `${Math.round(headerBottom + 12)}px`);
        bar.style.setProperty("--ts-hero-discovery-bar-left", `${Math.round(hostRect.left)}px`);
        bar.style.setProperty("--ts-hero-discovery-bar-width", `${Math.round(hostRect.width)}px`);
      } else {
        bar.style.removeProperty("--ts-hero-discovery-bar-top");
        bar.style.removeProperty("--ts-hero-discovery-bar-left");
        bar.style.removeProperty("--ts-hero-discovery-bar-width");
      }

      setIsDiscoveryBarPinned((prev) => (prev === nextPinned ? prev : nextPinned));
    };

    syncDiscoveryBar();

    const onViewportChange = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(syncDiscoveryBar);
    };

    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    };
  }, []);

  return (
    <section className="ts-hero-discovery" aria-labelledby="ts-hero-discovery-title">
      <article
        ref={featureRef}
        className={`ts-hero-discovery__feature${isFeatureViewerLoading ? " ts-hero-discovery__feature--loading" : ""}`}
        aria-busy={isFeatureViewerLoading}
      >
        <button
          type="button"
          className="ts-hero-discovery__cover-link"
          onClick={openDetail}
          aria-label={activeFeatureTitle}
        >
          <canvas className={`ts-hero-discovery__cover-canvas${shouldUseFeaturePanorama ? "" : " is-hidden"}`} ref={featureCanvasRef} aria-hidden="true" />
          <img
            className={`ts-hero-discovery__cover-fallback${isFeatureViewerReady && shouldUseFeaturePanorama ? " is-hidden" : ""}`}
            src={activeFeatureCoverUrl}
            alt={activeFeatureCoverAlt}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <span className="ts-hero-discovery__cover-overlay" />
        </button>

        {isFeatureViewerLoading ? (
          <span className="ts-hero-discovery__cover-skeleton" aria-hidden="true">
            <span className="ts-hero-discovery__cover-skeleton-band" />
            <span className="ts-hero-discovery__cover-skeleton-title" />
            <span className="ts-hero-discovery__cover-skeleton-action" />
          </span>
        ) : null}

        <div ref={discoveryBarHostRef} className="ts-hero-discovery__discovery-bar-host" aria-hidden="true" />
        <form
          ref={discoveryBarRef}
          className={`ts-hero-discovery__discovery-bar${isDiscoveryBarPinned ? " ts-hero-discovery__discovery-bar--pinned" : ""}`}
          role="search"
          onSubmit={handleDiscoverySubmit}
        >
          <label className="ts-hero-discovery__discovery-label" htmlFor="ts-hero-discovery-search">
            {vm.discoverySearchLabel}
          </label>
          <div className="ts-hero-discovery__search-row">
            <input
              id="ts-hero-discovery-search"
              className="ts-hero-discovery__search-input"
              type="search"
              value={discoveryQuery}
              onChange={(event) => setDiscoveryQuery(event.currentTarget.value)}
              placeholder={vm.discoverySearchPlaceholder}
              autoComplete="off"
            />
            <button className="ts-hero-discovery__search-submit" type="submit" aria-label={vm.discoverySearchActionLabel}>
              <span className="ts-hero-discovery__search-icon" aria-hidden="true">
                <span className="ts-hero-discovery__search-icon-bezel" />
                <span className="ts-hero-discovery__search-icon-needle" />
                <span className="ts-hero-discovery__search-icon-hub" />
                <span className="ts-hero-discovery__search-icon-spark" />
              </span>
            </button>
          </div>
          <div className="ts-hero-discovery__quick-filters" aria-label={vm.discoveryQuickFiltersLabel}>
            <span className="ts-hero-discovery__quick-filters-label">{vm.discoveryQuickFiltersLabel}:</span>
            {vm.discoveryFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`ts-hero-discovery__quick-filter${filter === activeDiscoveryFilter ? " ts-hero-discovery__quick-filter--active" : ""}`}
                onClick={() => handleDiscoveryFilter(filter)}
                aria-pressed={filter === activeDiscoveryFilter}
              >
                {filter}
              </button>
            ))}
          </div>
        </form>

        <span className="ts-hero-discovery__vr-badge">{vm.featureVrBadgeLabel}</span>

        {vm.featureArticles.length > 0 ? (
          <nav
            className="ts-hero-discovery__feature-rail"
            aria-label={vm.detailScenePickerLabel}
            onMouseEnter={() => setIsFeatureRailPaused(true)}
            onMouseLeave={() => setIsFeatureRailPaused(false)}
            onFocus={() => setIsFeatureRailPaused(true)}
            onBlur={() => setIsFeatureRailPaused(false)}
          >
            <div className="ts-hero-discovery__feature-rail-track">
              {vm.featureArticles.map((article, index) => {
                const active = article.id === activeFeatureArticle?.id;
                return (
                  <button
                    key={article.id}
                    ref={(node) => {
                      featureButtonRefs.current[article.id] = node;
                    }}
                    type="button"
                    className={`ts-hero-discovery__feature-card${active ? " ts-hero-discovery__feature-card--active" : ""}`}
                    onClick={() => handleFeatureSelect(article.id)}
                    aria-current={active ? "true" : undefined}
                  >
                    <img src={article.imageUrl} alt={article.imageAlt} loading={index === 0 ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" draggable={false} />
                    <span className="ts-hero-discovery__feature-card-shade" aria-hidden="true" />
                    <span className="ts-hero-discovery__feature-card-kicker">{article.kicker}</span>
                    <span className="ts-hero-discovery__feature-card-name">{article.title}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        ) : null}

        <div className="ts-hero-discovery__content">
          <h1 id="ts-hero-discovery-title" className="ts-hero-discovery__title">
            <button type="button" className="ts-hero-discovery__title-link" onClick={openDetail}>
              {activeFeatureTitle}
            </button>
          </h1>
          <button type="button" className="ts-hero-discovery__view-more" onClick={openDetail}>
            {vm.featureActionLabel}
          </button>
        </div>
      </article>

      {isDetailOpen && activeRoom && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={detailRef}
              className={[
                "ts-hero-discovery__detail",
                isPanelExpanded ? "ts-hero-discovery__detail--panel-expanded" : "",
                isDetailFullscreen ? "ts-hero-discovery__detail--fullscreen" : "",
              ].filter(Boolean).join(" ")}
            >
              <div className="ts-hero-discovery__detail-scene">
                <canvas
                  ref={canvasRef}
                  className="ts-hero-discovery__detail-canvas"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                />
                <span className="ts-hero-discovery__detail-top-gradient" aria-hidden="true" />
                <span className="ts-hero-discovery__detail-bottom-gradient" aria-hidden="true" />
                <div className="ts-hero-discovery__detail-hint">{vm.detailViewerHint}</div>
                {isViewerLoading ? (
                  <div className="ts-hero-discovery__detail-loading">
                    <div className="ts-hero-discovery__detail-spinner" aria-hidden="true" />
                    <span>
                      {vm.detailLoadingLabel}
                      {viewerLoadProgress > 0 && viewerLoadProgress < 100 ? ` ${viewerLoadProgress}%` : ""}
                    </span>
                  </div>
                ) : null}
                {viewerError ? (
                  <div className="ts-hero-discovery__detail-loading ts-hero-discovery__detail-loading--error">
                    <span>{vm.detailErrorLabel}</span>
                  </div>
                ) : null}
              </div>

              <header className="ts-hero-discovery__detail-topbar">
                <button type="button" className="ts-hero-discovery__detail-back-btn" onClick={closeDetail}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M12.5 15 7.5 10l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{vm.detailBackLabel}</span>
                </button>

                <h2 className="ts-hero-discovery__detail-title">{vm.detailSceneTitle}</h2>

                <div className="ts-hero-discovery__detail-actions">
                  <button
                    type="button"
                    className={`ts-hero-discovery__detail-icon-btn${autoRotate ? " is-active" : ""}`}
                    onClick={() => setAutoRotate((value) => !value)}
                    aria-label={vm.detailAutoRotateLabel}
                    title={vm.detailAutoRotateLabel}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 4a8 8 0 1 0 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="ts-hero-discovery__detail-icon-btn"
                    onClick={toggleDetailFullscreen}
                    aria-label={isDetailFullscreen ? vm.detailExitFullscreenLabel : vm.detailEnterFullscreenLabel}
                    title={isDetailFullscreen ? vm.detailExitFullscreenLabel : vm.detailEnterFullscreenLabel}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      {isDetailFullscreen ? (
                        <path d="M9 4H5a1 1 0 0 0-1 1v4m0 10v-4a1 1 0 0 1 1-1h4m10-10h-4a1 1 0 0 0-1 1v4m0 10v-4a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="ts-hero-discovery__detail-icon-btn ts-hero-discovery__detail-icon-btn--vr"
                    onClick={() => { void enterDetailVrMode(); }}
                    aria-label={vm.detailVrModeLabel}
                    title={vm.detailVrModeLabel}
                  >
                    <svg width="20" height="18" viewBox="0 0 24 16" fill="none" aria-hidden="true">
                      <rect x="1" y="1" width="22" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                      <circle cx="7" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M10 12c.5.8 3.5.8 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </header>

              <aside className="ts-hero-discovery__detail-panel" aria-label={vm.detailPanelAriaLabel}>
                <div className="ts-hero-discovery__detail-panel-scroll">
                  <div className="ts-hero-discovery__detail-panel-head">
                    <span className="ts-hero-discovery__detail-kicker">{vm.detailCurrentViewLabel}</span>
                    <button
                      type="button"
                      className={`ts-hero-discovery__detail-panel-toggle${isPanelExpanded ? " is-active" : ""}`}
                      onClick={() => setIsPanelExpanded((value) => !value)}
                      aria-label={isPanelExpanded ? vm.detailCollapseLabel : vm.detailExpandLabel}
                      title={isPanelExpanded ? vm.detailCollapseLabel : vm.detailExpandLabel}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        {isPanelExpanded ? (
                          <path d="M9 4H5a1 1 0 0 0-1 1v4m0 10v-4a1 1 0 0 1 1-1h4m10-10h-4a1 1 0 0 0-1 1v4m0 10v-4a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                          <path d="M15 4h4a1 1 0 0 1 1 1v4m-16 6v4a1 1 0 0 0 1 1h4m6-16v4a1 1 0 0 0 1 1h4m-16 6h4a1 1 0 0 1 1 1v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                      </svg>
                    </button>
                  </div>

                  <h3 className="ts-hero-discovery__detail-room-title">{activeRoom.name}</h3>
                  <p className="ts-hero-discovery__detail-address">{vm.detailAddress}</p>
                  <p className="ts-hero-discovery__detail-summary">{activeRoom.summary}</p>

                  <div className={`ts-hero-discovery__detail-feedback${isFeedbackOpen ? " is-open" : ""}`}>
                    <button
                      type="button"
                      className="ts-hero-discovery__detail-feedback-toggle"
                      onClick={() => setIsMobileFeedbackOpen((current) => !current)}
                      aria-expanded={isFeedbackOpen}
                    >
                      <span>{isFeedbackOpen ? vm.detailFeedbackHideLabel : vm.detailFeedbackShowLabel}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d={isFeedbackOpen ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    <div className={`ts-hero-discovery__detail-feedback-content${isFeedbackOpen ? " is-open" : ""}`}>
                      <section className="ts-hero-discovery__detail-review-block">
                        <div className="ts-hero-discovery__detail-review-head">
                          <span className="ts-hero-discovery__detail-review-label">{vm.detailReviewLabel}</span>
                          <span className="ts-hero-discovery__detail-review-summary">
                            <svg className="ts-hero-discovery__detail-review-rating-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M12 3.75l2.547 5.162 5.697.828-4.122 4.018.973 5.675L12 16.754l-5.095 2.679.973-5.675L3.756 9.74l5.697-.828L12 3.75z" fill="currentColor" />
                            </svg>
                            <span>{vm.detailReviewSummary}</span>
                          </span>
                        </div>

                        <div className="ts-hero-discovery__detail-review-list">
                          {detailComments.map((comment) => (
                            <article key={comment.id} className="ts-hero-discovery__detail-review-item">
                              <div className="ts-hero-discovery__detail-review-item-head">
                                <p className="ts-hero-discovery__detail-review-author">{comment.author} · {comment.role}</p>
                                <span className="ts-hero-discovery__detail-review-item-rating">
                                  <svg className="ts-hero-discovery__detail-review-rating-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M12 3.75 14.547 8.912l5.697.828-4.122 4.018.973 5.675L12 16.754l-5.095 2.679.973-5.675L3.756 9.74l5.697-.828L12 3.75z" fill="currentColor" />
                                  </svg>
                                  <span>{comment.rating.toFixed(1)}</span>
                                </span>
                              </div>
                              <p className="ts-hero-discovery__detail-review-text">“{comment.body}”</p>
                            </article>
                          ))}
                        </div>
                      </section>

                      {isAuthenticated ? (
                        <form className="ts-hero-discovery__detail-comment-form" onSubmit={onSubmitComment}>
                          <div className="ts-hero-discovery__detail-comment-rating" role="group" aria-label={vm.detailCommentRatingLabel}>
                            <span className="ts-hero-discovery__detail-comment-form-label">{vm.detailCommentRatingLabel}</span>
                            <div className="ts-hero-discovery__detail-comment-stars">
                              {[1, 2, 3, 4, 5].map((ratingValue) => {
                                const active = ratingValue <= commentRating;
                                return (
                                  <button
                                    key={ratingValue}
                                    type="button"
                                    className={`ts-hero-discovery__detail-comment-star${active ? " ts-hero-discovery__detail-comment-star--active" : ""}`}
                                    onClick={() => setCommentRating(ratingValue)}
                                    aria-label={`${vm.detailCommentRatingLabel} ${ratingValue}`}
                                    aria-pressed={active}
                                  >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                      <path d="M12 3.75l2.547 5.162 5.697.828-4.122 4.018.973 5.675L12 16.754l-5.095 2.679.973-5.675L3.756 9.74l5.697-.828L12 3.75z" fill="currentColor" />
                                    </svg>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <label className="ts-hero-discovery__detail-comment-form-label" htmlFor="ts-hero-discovery-comment-input">
                            {vm.detailCommentFormLabel}
                          </label>
                          <textarea
                            id="ts-hero-discovery-comment-input"
                            className="ts-hero-discovery__detail-comment-textarea"
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                            placeholder={vm.detailCommentFormPlaceholder}
                            rows={3}
                          />
                          <button
                            type="submit"
                            className="ts-hero-discovery__detail-comment-submit"
                            disabled={!commentDraft.trim()}
                          >
                            <span>{vm.detailCommentFormAction}</span>
                          </button>
                        </form>
                      ) : (
                        <div className="ts-hero-discovery__detail-comment-login-hint" role="note">
                          {commentLoginHint}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>

              {activeRoom.hotspots.map((hotspot) => (
                <HotspotArrow
                  key={hotspot.id}
                  hotspot={hotspot}
                  onNavigate={handleSelectRoom}
                  elRef={(node) => {
                    hotspotRefs.current[hotspot.id] = node;
                  }}
                />
              ))}

              <nav className="ts-hero-discovery__detail-room-bar" aria-label={vm.detailScenePickerLabel}>
                {vm.detailRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    ref={(node) => {
                      roomButtonRefs.current[room.id] = node;
                    }}
                    className={[
                      "ts-hero-discovery__detail-room-btn",
                      room.id === activeRoom.id ? "ts-hero-discovery__detail-room-btn--active" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => handleSelectRoom(room.id)}
                    aria-pressed={room.id === activeRoom.id}
                    title={room.id === activeRoom.id ? `${room.name} · current view` : room.name}
                  >
                    <img
                      className="ts-hero-discovery__detail-room-thumb"
                      src={room.thumbnailUrl}
                      alt={room.name}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="ts-hero-discovery__detail-room-name">{room.name}</span>
                  </button>
                ))}
              </nav>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
};

function HotspotArrow({
  hotspot,
  onNavigate,
  elRef,
}: {
  hotspot: HeroDiscoveryDetailHotspot;
  onNavigate: (id: string) => void;
  elRef: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={elRef}
      type="button"
      className="ts-hero-discovery__detail-arrow"
      style={{ display: "none" }}
      onClick={() => onNavigate(hotspot.targetRoomId)}
      title={hotspot.label}
    >
      <span className="ts-hero-discovery__detail-arrow-pulse" />
      <svg className="ts-hero-discovery__detail-arrow-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="ts-hero-discovery__detail-arrow-label">{hotspot.label}</span>
    </button>
  );
}
