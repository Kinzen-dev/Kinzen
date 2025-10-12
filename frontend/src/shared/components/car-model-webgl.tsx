'use client';

import { useRef, useEffect, memo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { Group } from 'three';
import { Car, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { getCarById } from '@/shared/lib/car-data';

interface CarModelProps {
  carId: number;
  className?: string;
}

// Mercedes CLS 300d 3D Model Component - Pure GLB (Memoized with Loading)
const MercedesCLS300dModel = memo(() => {
  const meshRef = useRef<Group>(null);

  // Load the real Mercedes CLS 300d GLB model
  const { scene } = useGLTF('/models/mercedes_cls_300d.glb');

  useEffect(() => {
    if (scene) {
      console.log('Pure Mercedes CLS 300d GLB model loaded - no modifications applied');
      // No material modifications - render as-is
    }
  }, [scene]);

  return (
    <group ref={meshRef} position={[0, 0, 0]} scale={[1, 1, 1]}>
      <primitive object={scene} />
    </group>
  );
});

MercedesCLS300dModel.displayName = 'MercedesCLS300dModel';

// Camera Controller Component
function CameraController() {
  const { camera } = useThree();

  useEffect(() => {
    // Set initial camera position for optimal Mercedes CLS viewing
    camera.position.set(6, 4, 6);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

// Main 3D Car Viewer Component
function CarModelViewer({ carId: _carId }: { carId: number }) {
  const controlsRef = useRef<any>(null);
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
        console.warn('GLB model loading timeout - file may be too large');
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
    <div className="relative h-full w-full rounded-lg bg-gradient-to-br from-muted/20 to-muted/10">
      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [6, 4, 6], fov: 45 }}
        style={{ background: 'transparent' }}
        shadows
        onPointerMissed={() => {
          // Prevent scroll when clicking outside the 3D model
        }}
      >
        {/* Neutral Lighting for Pure GLB */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize={[2048, 2048]}
          color="#ffffff"
        />
        <hemisphereLight args={['#ffffff', '#ffffff', 0.2]} />

        {/* Environment */}
        <Environment preset="apartment" />

        {/* Car Model */}
        <MercedesCLS300dModel />

        {/* Contact Shadows */}
        <ContactShadows position={[0, -1, 0]} opacity={0.25} scale={10} blur={1.5} far={4.5} />

        {/* Orbit Controls for mouse interaction */}
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={15}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI - Math.PI / 6}
          autoRotate={false} // Disabled auto-rotation
          enableDamping={true}
          dampingFactor={0.05}
          touches={{
            ONE: 2, // Single touch for pan
            TWO: 1, // Two touches for zoom/rotate
          }}
        />

        {/* Camera Controller */}
        <CameraController />
      </Canvas>

      {/* Controls Overlay */}
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
      <div className="absolute bottom-4 left-4 z-10">
        <div className="rounded-lg border border-border/20 bg-background/80 px-3 py-2 text-sm text-foreground backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <span>Drag to rotate • Scroll to zoom • WebGL 3D Model</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback component for cars without 3D models
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

// Main Car Model Component (Memoized)
const CarModel = memo(({ carId, className = '' }: CarModelProps) => {
  const car = getCarById(carId);
  // For now, only Mercedes CLS 300d (id: 1) has a 3D model
  const has3DModel = carId === 1;

  console.log('WebGLCarModel rendering:', { carId, has3DModel, car: car?.name });

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
