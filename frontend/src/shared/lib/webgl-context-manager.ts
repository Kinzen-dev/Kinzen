/**
 * WebGL Context Manager
 * Handles WebGL context loss and recovery during responsive changes
 */

interface WebGLContextInfo {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext | null;
  animationFrameId: number | null;
  recoveryCallback: () => void;
}

class WebGLContextManager {
  private contexts: Map<string, WebGLContextInfo> = new Map();
  private isRecoveryInProgress: boolean = false;

  registerContext(
    id: string,
    canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext | null,
    recoveryCallback: () => void
  ) {
    if (this.contexts.has(id)) {
      // If context already registered, update it
      const existing = this.contexts.get(id)!;
      existing.gl = gl;
      existing.recoveryCallback = recoveryCallback;
      return;
    }

    const contextInfo: WebGLContextInfo = {
      canvas,
      gl,
      animationFrameId: null,
      recoveryCallback,
    };
    this.contexts.set(id, contextInfo);

    canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this, id));
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this, id));
  }

  unregisterContext(id: string) {
    const contextInfo = this.contexts.get(id);
    if (contextInfo) {
      contextInfo.canvas.removeEventListener(
        'webglcontextlost',
        this.handleContextLost.bind(this, id)
      );
      contextInfo.canvas.removeEventListener(
        'webglcontextrestored',
        this.handleContextRestored.bind(this, id)
      );
      if (contextInfo.animationFrameId !== null) {
        cancelAnimationFrame(contextInfo.animationFrameId);
      }
      this.contexts.delete(id);
    }
  }

  private handleContextLost(id: string, event: Event) {
    event.preventDefault();
    console.warn(`WebGL context lost for ${id}, attempting recovery...`);
    const contextInfo = this.contexts.get(id);
    if (contextInfo && contextInfo.animationFrameId !== null) {
      cancelAnimationFrame(contextInfo.animationFrameId);
      contextInfo.animationFrameId = null;
    }
    this.isRecoveryInProgress = true;
  }

  private handleContextRestored(id: string) {
    console.log(`WebGL context restored for ${id}`);
    this.isRecoveryInProgress = false;
    const contextInfo = this.contexts.get(id);
    if (contextInfo) {
      contextInfo.recoveryCallback();
    }
  }

  isContextLost(id: string): boolean {
    const contextInfo = this.contexts.get(id);
    if (!contextInfo || !contextInfo.gl) return false;
    return contextInfo.gl.isContextLost();
  }

  forceRecovery() {
    if (this.isRecoveryInProgress) return; // Avoid multiple recovery attempts

    this.isRecoveryInProgress = true;
    console.log('Forcing WebGL context recovery for all registered contexts...');
    this.contexts.forEach((contextInfo, id) => {
      if (contextInfo.gl && contextInfo.gl.isContextLost()) {
        // Attempt to restore context by triggering a re-render or re-initialization
        console.log(`Attempting recovery for ${id}`);
        contextInfo.recoveryCallback();
      } else if (!contextInfo.gl) {
        // If gl context was never properly set, try to re-initialize
        console.log(`Re-initializing context for ${id}`);
        contextInfo.recoveryCallback();
      }
    });
    // Reset flag after a short delay to allow contexts to re-initialize
    setTimeout(() => {
      this.isRecoveryInProgress = false;
    }, 500);
  }

  setAnimationFrameId(id: string, frameId: number) {
    const contextInfo = this.contexts.get(id);
    if (contextInfo) {
      contextInfo.animationFrameId = frameId;
    }
  }
}

export const webglContextManager = new WebGLContextManager();
