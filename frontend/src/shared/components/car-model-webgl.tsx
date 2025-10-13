'use client';

import { useRef, useEffect, memo, useState, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { Car, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { getCarById } from '@/shared/lib/car-data';
import WebGLErrorBoundary from './webgl-error-boundary';
import { webglContextManager } from '@/shared/lib/webgl-context-manager';

interface CarModelProps {
  carId: number;
  className?: string;
}

// Mercedes CLS 300d 3D Model Component
const MercedesCLS300dModel = memo(() => {
  const { scene } = useGLTF('/models/mercedes_cls_300d.glb');

  if (!scene) {
    return null;
  }

  return <primitive object={scene} />;
});

MercedesCLS300dModel.displayName = 'MercedesCLS300dModel';

// Main 3D Car Viewer Component
function CarModelViewer({ carId: _carId }: { carId: number }) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const zoomIn = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyIn(0.5);
    }
  };

  const zoomOut = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyOut(0.5);
    }
  };

  // Handle loading timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setLoadError(true);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Handle successful load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Show loading for at least 2 seconds

    return () => clearTimeout(timer);
  }, []);

  // Simple periodic check to ensure controls stay enabled
  useEffect(() => {
    const interval = setInterval(() => {
      if (controlsRef.current && !controlsRef.current.enabled) {
        controlsRef.current.enabled = true;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Context recovery callback
  const handleContextRecovery = useCallback(() => {
    setIsLoading(false);
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  }, []);

  // Register with context manager
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      webglContextManager.registerContext(
        `car-model-${_carId}`,
        canvas,
        null,
        handleContextRecovery
      );
    }

    return () => {
      webglContextManager.unregisterContext(`car-model-${_carId}`);
    };
  }, [_carId, handleContextRecovery]);

  // Handle window resize and orientation changes
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Force a re-render when window resizes or orientation changes
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        // Force WebGL recovery if context is lost
        webglContextManager.forceRecovery();
      }, 50); // Reduced timeout for faster response
    };

    const handleOrientationChange = () => {
      // Immediate response for orientation changes
      setTimeout(() => {
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        webglContextManager.forceRecovery();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  if (loadError) {
    return (
      <div className="relative h-full w-full rounded-lg bg-gradient-to-br from-muted/20 to-muted/10">
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-sm text-muted-foreground">3D Model Loading Failed</div>
            <div className="text-xs text-muted-foreground">File may be too large</div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative h-full w-full rounded-lg bg-gradient-to-br from-muted/20 to-muted/10">
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <div className="text-sm text-muted-foreground">Loading 3D Model...</div>
            <div className="text-xs text-muted-foreground">38MB file - please wait</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg bg-gradient-to-br from-muted/20 to-muted/10"
      style={{
        outline: 'none',
        border: 'none',
        minHeight: '300px',
        aspectRatio: '4/3',
      }}
    >
      {/* Three.js Canvas */}
      <WebGLErrorBoundary>
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <div className="text-sm text-muted-foreground">Loading 3D Model...</div>
              </div>
            </div>
          }
        >
          <Canvas
            ref={canvasRef}
            camera={{ position: [6, 4, 6], fov: 45 }}
            style={
              {
                background: 'transparent',
                pointerEvents: 'auto',
                touchAction: 'none',
                userSelect: 'none',
                outline: 'none',
                border: 'none',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties
            }
            shadows
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              preserveDrawingBuffer: true,
            }}
            onCreated={({ gl, scene: _scene, camera: _camera }) => {
              try {
                // Ensure WebGL context is properly initialized
                gl.setClearColor('#000000', 0);

                // Update context manager with the actual WebGL context
                const canvas = gl.domElement;
                webglContextManager.registerContext(
                  `car-model-${_carId}`,
                  canvas,
                  gl.getContext() as WebGLRenderingContext,
                  handleContextRecovery
                );

                // Ensure canvas works properly
                canvas.style.pointerEvents = 'auto';
                canvas.style.touchAction = 'none';
                canvas.style.userSelect = 'none';
                canvas.style.outline = 'none';
                canvas.style.border = 'none';
                (
                  canvas.style as CSSStyleDeclaration & { WebkitTapHighlightColor?: string }
                ).WebkitTapHighlightColor = 'transparent';
                canvas.tabIndex = 0;

                // Ensure canvas receives events
                canvas.addEventListener('pointerdown', () => {
                  canvas.focus();
                });
              } catch (error) {
                console.error('WebGL initialization error:', error);
              }
            }}
            onPointerMissed={() => {
              // Prevent scroll when clicking outside the 3D model
            }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={1.0}
              castShadow
              shadow-mapSize={[2048, 2048]}
              color="#ffffff"
            />
            <hemisphereLight args={['#ffffff', '#ffffff', 0.2]} />

            <Environment preset="apartment" />
            <MercedesCLS300dModel />
            <ContactShadows position={[0, -1, 0]} opacity={0.25} scale={10} blur={1.5} far={4.5} />

            <OrbitControls
              ref={controlsRef}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={2}
              maxDistance={15}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI - Math.PI / 6}
              autoRotate={false}
              enableDamping={true}
              dampingFactor={0.05}
              screenSpacePanning={false}
              makeDefault={false}
            />
          </Canvas>
        </Suspense>
      </WebGLErrorBoundary>

      {/* Controls */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={resetCamera}
          className="border-border/20 bg-background/80 text-foreground backdrop-blur-sm hover:bg-background/90"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={zoomIn}
          className="border-border/20 bg-background/80 text-foreground backdrop-blur-sm hover:bg-background/90"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={zoomOut}
          className="border-border/20 bg-background/80 text-foreground backdrop-blur-sm hover:bg-background/90"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Instructions */}
      <div className="webgl-controls-overlay absolute bottom-4 left-4 z-10">
        <div className="webgl-controls-content rounded-lg border border-border/20 bg-background/80 px-3 py-2 text-sm text-foreground backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <span className="webgl-controls-text">
              <span className="hidden sm:inline">
                Drag to rotate • Scroll to zoom • WebGL 3D Model
              </span>
              <span className="sm:hidden">Drag • Scroll • 3D</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback for cars without 3D models
function CarModelFallback({ carName }: { carName: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600">
      <div className="text-center">
        <Car className="mx-auto mb-4 h-16 w-16 text-gray-500 dark:text-gray-400" />
        <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">{carName}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">3D Model Coming Soon</p>
      </div>
    </div>
  );
}

// Main Car Model Component
const CarModel = memo(({ carId, className = '' }: CarModelProps) => {
  const car = getCarById(carId);
  // For now, only Mercedes CLS 300d (id: 1) has a 3D model
  const has3DModel = carId === 1;

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {has3DModel ? (
        <CarModelViewer carId={carId} />
      ) : (
        <CarModelFallback carName={car?.name || `Car ${carId}`} />
      )}
    </div>
  );
});

CarModel.displayName = 'CarModel';

export default CarModel;
