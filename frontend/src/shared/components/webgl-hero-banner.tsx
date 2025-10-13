'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { useTheme } from '@/shared/contexts/theme-context';
import { webglContextManager } from '@/shared/lib/webgl-context-manager';

interface WebGLHeroBannerProps {
  title: string;
  subtitle: string;
  description: string;
  ctaText?: string;
  className?: string;
}

/**
 * WebGL Hero Banner Component with Particle Effects
 *
 * Features:
 * - WebGL-powered particle system
 * - Tech-themed floating particles
 * - Smooth animations and transitions
 * - Theme-aware colors
 * - Performance optimized
 * - Graceful fallback for non-WebGL devices
 */
export function WebGLHeroBanner({
  title,
  subtitle,
  description,
  ctaText = 'Get Started',
  className = '',
}: WebGLHeroBannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isWebGLSupported, setIsWebGLSupported] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { theme } = useTheme();

  // Context recovery callback
  const handleContextRecovery = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Determine if we're in light theme
  const isLightTheme =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  // WebGL shaders
  const vertexShaderSource = useCallback(
    () => `
    attribute vec2 a_position;
    attribute float a_size;
    attribute float a_alpha;
    attribute vec3 a_color;
    attribute float a_particleId;
    
    uniform float u_time;
    uniform vec2 u_resolution;
    
    varying float v_alpha;
    varying vec3 v_color;
    varying float v_size;
    
    void main() {
      // Create floating animation
      float time = u_time * 0.5;
      float particleId = a_particleId;
      
      // Create wave-like movement with more amplitude
      vec2 position = a_position;
      position.x += sin(time + particleId * 6.28) * 30.0;
      position.y += cos(time * 0.7 + particleId * 4.0) * 25.0;
      
      // Convert to clip space
      vec2 clipSpace = ((position / u_resolution) * 2.0) - 1.0;
      clipSpace.y *= -1.0; // Flip Y axis
      
      gl_Position = vec4(clipSpace, 0.0, 1.0);
      gl_PointSize = a_size * (1.0 + sin(time + particleId * 3.14) * 0.5);
      
      v_alpha = a_alpha;
      v_color = a_color;
      v_size = a_size;
    }
  `,
    []
  );

  const fragmentShaderSource = useCallback(
    () => `
    precision mediump float;
    
    varying float v_alpha;
    varying vec3 v_color;
    varying float v_size;
    
    void main() {
      // Create circular particles with strong contrast and glow
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      
      // Stronger, more defined circle with enhanced glow
      float alpha = v_alpha * (1.0 - smoothstep(0.0, 0.3, dist));
      alpha *= (1.0 + sin(v_size * 4.0) * 0.4); // Stronger pulsing
      
      // Enhanced color intensity for maximum contrast
      vec3 color = v_color * (1.0 + dist * 1.2);
      
      // Stronger glow effect for better visibility
      float glow = 1.0 - smoothstep(0.0, 0.7, dist);
      color += v_color * glow * 0.5;
      
      // Add extra contrast boost
      color = mix(color, v_color * 2.0, 0.3);
      
      gl_FragColor = vec4(color, alpha);
    }
  `,
    []
  );

  // Register with context manager
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      webglContextManager.registerContext('hero-banner', canvas, null, handleContextRecovery);
    }

    return () => {
      webglContextManager.unregisterContext('hero-banner');
    };
  }, [handleContextRecovery]);

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset loading state when theme changes
    setIsLoaded(false);

    const gl = (canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    }) ||
      canvas.getContext('experimental-webgl', {
        preserveDrawingBuffer: true,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })) as WebGLRenderingContext | null;

    if (!gl) {
      console.log('WebGL not supported, using fallback');
      return;
    }

    // Update context manager with the actual WebGL context
    webglContextManager.registerContext('hero-banner', canvas, gl, handleContextRecovery);

    setIsWebGLSupported(true);

    // Initialize canvas size immediately
    const initializeCanvasSize = () => {
      // Get the actual container dimensions
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Use the actual container width and height
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      // Set canvas size to match container exactly
      canvas.width = containerWidth * dpr;
      canvas.height = containerHeight * dpr;

      // Set CSS size to match container exactly
      canvas.style.width = containerWidth + 'px';
      canvas.style.height = containerHeight + 'px';

      // Set viewport
      gl.viewport(0, 0, canvas.width, canvas.height);

      return { width: canvas.width, height: canvas.height };
    };

    // Initial size setup with multiple attempts to ensure DOM is ready
    const setupCanvasSize = () => {
      const canvasSize = initializeCanvasSize();
      // If canvas size is still 0, try again
      if (canvasSize.width === 0 || canvasSize.height === 0) {
        setTimeout(setupCanvasSize, 50);
      }
    };

    // Try immediately, then with delays
    setupCanvasSize();
    setTimeout(setupCanvasSize, 100);
    setTimeout(setupCanvasSize, 300);

    // Create shader
    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    }

    // Create program
    function createProgram(
      gl: WebGLRenderingContext,
      vertexShader: WebGLShader,
      fragmentShader: WebGLShader
    ) {
      const program = gl.createProgram();
      if (!program) return null;

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }

      return program;
    }

    // Create shaders and program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource());
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource());

    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const sizeLocation = gl.getAttribLocation(program, 'a_size');
    const alphaLocation = gl.getAttribLocation(program, 'a_alpha');
    const colorLocation = gl.getAttribLocation(program, 'a_color');
    const particleIdLocation = gl.getAttribLocation(program, 'a_particleId');

    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    // Animation loop
    let time = 0;
    let lastCanvasSize = { width: 0, height: 0 };

    // Initialize particles with proper canvas size
    const currentCanvasSize = initializeCanvasSize();
    lastCanvasSize = currentCanvasSize;

    // Create particle data - optimized count for better performance
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 2);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const particleIds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random positions across the canvas
      positions[i * 2] = Math.random() * currentCanvasSize.width;
      positions[i * 2 + 1] = Math.random() * currentCanvasSize.height;

      // Random sizes (4-16 pixels for maximum visibility)
      sizes[i] = 4 + Math.random() * 12;

      // Random alphas (0.8-1.0 for maximum visibility)
      alphas[i] = 0.8 + Math.random() * 0.2;

      // Particle ID for animation
      particleIds[i] = i / particleCount;

      // Theme-aware colors
      if (isLightTheme) {
        // Light theme: DARK, high-contrast colors for maximum visibility
        const colorVariation = Math.random();
        if (colorVariation < 0.35) {
          // Deep blue particles - very dark for contrast
          colors[i * 3] = 0.0; // R - pure black
          colors[i * 3 + 1] = 0.1 + Math.random() * 0.2; // G - very dark
          colors[i * 3 + 2] = 0.4 + Math.random() * 0.3; // B - dark blue
        } else if (colorVariation < 0.65) {
          // Deep purple particles - very dark for contrast
          colors[i * 3] = 0.2 + Math.random() * 0.2; // R - dark red
          colors[i * 3 + 1] = 0.0; // G - pure black
          colors[i * 3 + 2] = 0.3 + Math.random() * 0.2; // B - dark purple
        } else {
          // Deep teal particles - very dark for contrast
          colors[i * 3] = 0.0; // R - pure black
          colors[i * 3 + 1] = 0.3 + Math.random() * 0.2; // G - dark green
          colors[i * 3 + 2] = 0.3 + Math.random() * 0.2; // B - dark teal
        }
      } else {
        // Dark theme: bright whites and blues
        colors[i * 3] = 0.8 + Math.random() * 0.2; // R
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1; // G
        colors[i * 3 + 2] = 1.0; // B
      }
    }

    // Create buffers
    const positionBuffer = gl.createBuffer();
    const sizeBuffer = gl.createBuffer();
    const alphaBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    const particleIdBuffer = gl.createBuffer();

    function animate() {
      if (!canvas || !gl || webglContextManager.isContextLost('hero-banner')) return;

      time += 0.016; // ~60fps - optimized frame rate

      // Check if canvas size needs updating (only every 2 seconds to optimize performance)
      if (Math.floor(time) % 2 === 0 && time % 1 < 0.016) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const newWidth = rect.width * dpr;
        const newHeight = rect.height * dpr;

        if (canvas.width !== newWidth || canvas.height !== newHeight) {
          canvas.width = newWidth;
          canvas.height = newHeight;
          canvas.style.width = rect.width + 'px';
          canvas.style.height = rect.height + 'px';
          gl.viewport(0, 0, newWidth, newHeight);
          lastCanvasSize = { width: newWidth, height: newHeight };
        }
      }

      // Clear canvas
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Use program
      gl.useProgram(program);

      // Set uniforms
      gl.uniform1f(timeLocation, time);
      gl.uniform2f(resolutionLocation, lastCanvasSize.width, lastCanvasSize.height);

      // Bind and update buffers
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(sizeLocation);
      gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(alphaLocation);
      gl.vertexAttribPointer(alphaLocation, 1, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, particleIdBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, particleIds, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(particleIdLocation);
      gl.vertexAttribPointer(particleIdLocation, 1, gl.FLOAT, false, 0, 0);

      // Enable blending for transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Draw particles
      gl.drawArrays(gl.POINTS, 0, particleCount);

      animationRef.current = requestAnimationFrame(animate);
    }

    // Start animation
    animate();
    setIsLoaded(true);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (gl && program && vertexShader && fragmentShader) {
        try {
          gl.deleteProgram(program);
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [isLightTheme, vertexShaderSource, fragmentShaderSource, handleContextRecovery]);

  // Handle window resize and container size changes with debouncing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let resizeTimeout: NodeJS.Timeout;
    let isResizing = false;

    const handleResize = () => {
      // Debounce resize events to prevent rapid firing during DevTools responsive mode
      if (isResizing) return;
      isResizing = true;

      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        const newWidth = containerWidth * dpr;
        const newHeight = containerHeight * dpr;

        if (canvas.width !== newWidth || canvas.height !== newHeight) {
          canvas.width = newWidth;
          canvas.height = newHeight;
          canvas.style.width = containerWidth + 'px';
          canvas.style.height = containerHeight + 'px';

          // Update WebGL viewport
          const webglContext =
            canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (webglContext && 'viewport' in webglContext) {
            (webglContext as WebGLRenderingContext).viewport(0, 0, newWidth, newHeight);
          }
        }

        isResizing = false;
      }, 16); // ~60fps debounce
    };

    // Use ResizeObserver for more reliable container size detection
    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver((entries) => {
        // Only trigger if the canvas element itself is being resized
        for (const entry of entries) {
          if (entry.target === canvas) {
            handleResize();
            break;
          }
        }
      });
      resizeObserver.observe(canvas);
    }

    // Handle orientation change with immediate response
    const handleOrientationChange = () => {
      setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        const newWidth = containerWidth * dpr;
        const newHeight = containerHeight * dpr;

        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';

        // Update viewport immediately
        const webglContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (webglContext && 'viewport' in webglContext) {
          (webglContext as WebGLRenderingContext).viewport(0, 0, newWidth, newHeight);
        }

        // Force WebGL recovery if context is lost
        webglContextManager.forceRecovery();
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  return (
    <section className={`hero-banner-section relative h-screen overflow-hidden ${className}`}>
      {/* WebGL Canvas Background */}
      <canvas
        ref={canvasRef}
        className="webgl-canvas-container absolute inset-0 h-full w-full"
        style={{
          background: isLightTheme
            ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 30%, #e2e8f0 70%, #cbd5e1 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      />

      {/* Fallback for non-WebGL devices */}
      {!isWebGLSupported && (
        <div
          className="absolute inset-0 h-full w-full"
          style={{
            background: isLightTheme
              ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 30%, #e2e8f0 70%, #cbd5e1 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          }}
        >
          {/* Animated CSS particles as fallback */}
          <div className="absolute inset-0">
            {Array.from({ length: 80 }).map((_, i) => {
              const isBlue = Math.random() < 0.5;
              return (
                <div
                  key={i}
                  className={`absolute rounded-full ${
                    isLightTheme ? (isBlue ? 'bg-blue-900/90' : 'bg-purple-900/90') : 'bg-white/30'
                  }`}
                  style={{
                    width: `${4 + Math.random() * 12}px`,
                    height: `${4 + Math.random() * 12}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Overlay for better text readability */}
      <div className={`absolute inset-0 ${isLightTheme ? 'bg-white/10' : 'bg-black/20'}`} />
      <div
        className={`absolute inset-0 ${
          isLightTheme
            ? 'bg-gradient-to-t from-white/30 via-transparent to-white/10'
            : 'bg-gradient-to-t from-black/40 via-transparent to-black/20'
        }`}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            className="mx-auto max-w-4xl"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Badge */}
            <motion.div
              className={`mb-8 inline-flex items-center rounded-full border px-4 py-2 text-sm backdrop-blur-sm transition-all duration-300 ${
                isLightTheme
                  ? 'border-blue-200/50 bg-white/90 text-gray-900 shadow-xl'
                  : 'border-white/20 bg-white/10 text-white'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="mr-2">✨</span>
              {subtitle}
            </motion.div>

            {/* Main Title */}
            <motion.h1
              className={`mb-6 text-5xl font-bold tracking-tight transition-colors duration-300 sm:text-6xl lg:text-7xl ${
                isLightTheme ? 'text-gray-900 drop-shadow-lg' : 'text-white'
              }`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {title.split(' ').map((word, index) => (
                <span key={index}>
                  {word === 'Everything' || word === 'Comes' ? (
                    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {word}
                    </span>
                  ) : (
                    word
                  )}
                  {index < title.split(' ').length - 1 && ' '}
                </span>
              ))}
            </motion.h1>

            {/* Description */}
            <motion.p
              className={`mb-8 text-balance text-xl transition-colors duration-300 sm:text-2xl ${
                isLightTheme ? 'text-gray-800 drop-shadow-md' : 'text-white/90'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {description}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col gap-4 sm:flex-row sm:justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <Button size="lg" className="group shadow-lg">
                {isLightTheme ? (
                  <>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-semibold text-transparent">
                      {ctaText}
                    </span>
                    <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </>
                ) : (
                  <>
                    <span className="bg-white font-semibold text-black">{ctaText}</span>
                    <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={`shadow-xl transition-all duration-300 ${
                  isLightTheme
                    ? 'border-2 border-blue-300 bg-white/90 text-gray-900 backdrop-blur-sm hover:border-blue-400 hover:bg-white hover:text-gray-900'
                    : 'border-2 border-white/80 bg-white/10 text-white backdrop-blur-sm hover:border-white hover:bg-white hover:text-black'
                }`}
              >
                Explore Portfolio
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
        </div>
      )}
    </section>
  );
}
