'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/use-auth';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { gamesApi } from '../api/games.api';
import { GAME_NAMES, SubmitScoreResponse } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Play, LogIn, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';

const GAME_DURATION = 30; // seconds
const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;

interface GameResult {
  score: number;
  rank: number | null;
}

interface CherryBellyTapGameProps {
  onScoreSubmitted?: () => void;
}

// Global callback holder (needed because Phaser scene class can't easily access React state)
let gameEndCallback: ((score: number) => void) | null = null;

// Create the Phaser scene class dynamically
function createCherryScene(Phaser: typeof import('phaser')) {
  return class CherryScene extends Phaser.Scene {
    private cherry!: Phaser.GameObjects.Container;
    private belly!: Phaser.GameObjects.Ellipse;
    private face!: Phaser.GameObjects.Container;
    private scoreText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private tapCountText!: Phaser.GameObjects.Text;
    private score: number = 0;
    private timeLeft: number = GAME_DURATION;
    private timerEvent!: Phaser.Time.TimerEvent;
    private isGameActive: boolean = false;
    private bellyScale: number = 1;

    constructor() {
      super({ key: 'CherryScene' });
    }

    create() {
      // Reset state
      this.score = 0;
      this.timeLeft = GAME_DURATION;
      this.isGameActive = true;
      this.bellyScale = 1;

      // Background gradient
      const bg = this.add.graphics();
      bg.fillGradientStyle(0xffecd2, 0xffecd2, 0xfcb69f, 0xfcb69f, 1);
      bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Add decorative elements
      this.createDecorations();

      // Create Cherry character
      this.createCherry();

      // Create UI
      this.createUI();

      // Start timer
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: this.updateTimer,
        callbackScope: this,
        loop: true,
      });

      // Make belly interactive
      this.belly.setInteractive({ useHandCursor: true });
      this.belly.on('pointerdown', () => this.onBellyTap());
    }

    private createDecorations() {
      // Add cute floating hearts/stars
      for (let i = 0; i < 8; i++) {
        const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
        const y = Phaser.Math.Between(20, 100);
        const heart = this.add.text(x, y, ['💖', '⭐', '✨', '💕'][i % 4], {
          fontSize: '20px',
        });
        this.tweens.add({
          targets: heart,
          y: y - 10,
          duration: 1000 + i * 200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    private createCherry() {
      this.cherry = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);

      // Body (dress)
      const dress = this.add.ellipse(0, 40, 120, 100, 0xff69b4);
      dress.setStrokeStyle(3, 0xff1493);

      // Belly (tappable area) - made larger and more prominent
      this.belly = this.add.ellipse(0, 20, 100, 90, 0xffb6c1);
      this.belly.setStrokeStyle(4, 0xff69b4);

      // Add belly button
      const bellyButton = this.add.circle(0, 30, 8, 0xff69b4);

      // Head
      const head = this.add.circle(0, -60, 45, 0xffe4c4);
      head.setStrokeStyle(2, 0xdeb887);

      // Face container
      this.face = this.add.container(0, -60);

      // Eyes
      const leftEye = this.add.ellipse(-15, -5, 12, 16, 0xffffff);
      const rightEye = this.add.ellipse(15, -5, 12, 16, 0xffffff);
      const leftPupil = this.add.circle(-15, -3, 5, 0x4a4a4a);
      const rightPupil = this.add.circle(15, -3, 5, 0x4a4a4a);

      // Cute blush
      const leftBlush = this.add.ellipse(-30, 10, 15, 8, 0xffb6c1, 0.6);
      const rightBlush = this.add.ellipse(30, 10, 15, 8, 0xffb6c1, 0.6);

      // Smile
      const smile = this.add.arc(0, 15, 15, 0, 180, false, 0xff69b4);
      smile.setStrokeStyle(3, 0xff69b4);

      this.face.add([leftEye, rightEye, leftPupil, rightPupil, leftBlush, rightBlush, smile]);

      // Hair
      const hair = this.add.ellipse(0, -85, 55, 35, 0x8b4513);
      const hairBow = this.add.text(-35, -100, '🎀', { fontSize: '30px' });

      // Arms
      const leftArm = this.add.ellipse(-65, 30, 20, 50, 0xffe4c4);
      leftArm.setStrokeStyle(2, 0xdeb887);
      const rightArm = this.add.ellipse(65, 30, 20, 50, 0xffe4c4);
      rightArm.setStrokeStyle(2, 0xdeb887);

      // Legs
      const leftLeg = this.add.ellipse(-25, 110, 25, 45, 0xffe4c4);
      leftLeg.setStrokeStyle(2, 0xdeb887);
      const rightLeg = this.add.ellipse(25, 110, 25, 45, 0xffe4c4);
      rightLeg.setStrokeStyle(2, 0xdeb887);

      // Shoes
      const leftShoe = this.add.ellipse(-25, 140, 30, 15, 0xff69b4);
      const rightShoe = this.add.ellipse(25, 140, 30, 15, 0xff69b4);

      // Add name tag
      const nameTag = this.add.text(0, -140, '🍒 Cherry 🍒', {
        fontSize: '18px',
        fontFamily: 'Comic Sans MS, cursive',
        color: '#ff1493',
      });
      nameTag.setOrigin(0.5);

      this.cherry.add([
        leftLeg,
        rightLeg,
        leftShoe,
        rightShoe,
        dress,
        this.belly,
        bellyButton,
        leftArm,
        rightArm,
        hair,
        head,
        this.face,
        hairBow,
        nameTag,
      ]);
    }

    private createUI() {
      // Timer display
      const timerBg = this.add.graphics();
      timerBg.fillStyle(0xffffff, 0.9);
      timerBg.fillRoundedRect(GAME_WIDTH / 2 - 60, 10, 120, 50, 15);
      timerBg.lineStyle(3, 0xff69b4);
      timerBg.strokeRoundedRect(GAME_WIDTH / 2 - 60, 10, 120, 50, 15);

      this.timerText = this.add.text(GAME_WIDTH / 2, 35, `⏱️ ${this.timeLeft}s`, {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ff1493',
        fontStyle: 'bold',
      });
      this.timerText.setOrigin(0.5);

      // Score display
      const scoreBg = this.add.graphics();
      scoreBg.fillStyle(0xffffff, 0.9);
      scoreBg.fillRoundedRect(10, 10, 100, 50, 15);
      scoreBg.lineStyle(3, 0xff69b4);
      scoreBg.strokeRoundedRect(10, 10, 100, 50, 15);

      this.scoreText = this.add.text(60, 35, `💖 ${this.score}`, {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#ff1493',
        fontStyle: 'bold',
      });
      this.scoreText.setOrigin(0.5);

      // Tap instruction
      this.tapCountText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '👆 Tap her belly!', {
        fontSize: '18px',
        fontFamily: 'Comic Sans MS, cursive',
        color: '#ff1493',
      });
      this.tapCountText.setOrigin(0.5);
    }

    private onBellyTap() {
      if (!this.isGameActive) return;

      this.score++;
      this.bellyScale = Math.min(this.bellyScale + 0.02, 2);

      // Update score display
      this.scoreText.setText(`💖 ${this.score}`);

      // Belly growing animation
      this.belly.setScale(this.bellyScale);

      // Bounce animation
      this.tweens.add({
        targets: this.cherry,
        scaleX: 1.05,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        ease: 'Bounce.easeOut',
      });

      // Screen shake effect (mild)
      this.cameras.main.shake(50, 0.003);

      // Add floating score text
      const floatingScore = this.add.text(
        GAME_WIDTH / 2 + Phaser.Math.Between(-30, 30),
        GAME_HEIGHT / 2 + Phaser.Math.Between(-20, 20),
        '+1',
        { fontSize: '20px', color: '#ff69b4', fontStyle: 'bold' }
      );
      floatingScore.setOrigin(0.5);
      this.tweens.add({
        targets: floatingScore,
        y: floatingScore.y - 50,
        alpha: 0,
        duration: 500,
        onComplete: () => floatingScore.destroy(),
      });

      // Change expression based on belly size
      if (this.bellyScale > 1.5) {
        this.tapCountText.setText('😵 So full!');
      } else if (this.bellyScale > 1.3) {
        this.tapCountText.setText('😰 Getting big!');
      }
    }

    private updateTimer() {
      this.timeLeft--;
      this.timerText.setText(`⏱️ ${this.timeLeft}s`);

      // Warning animation when time is low
      if (this.timeLeft <= 5) {
        this.timerText.setColor('#ff0000');
        this.tweens.add({
          targets: this.timerText,
          scale: 1.2,
          duration: 100,
          yoyo: true,
        });
      }

      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }

    private endGame() {
      this.isGameActive = false;
      this.timerEvent.remove();
      this.belly.removeInteractive();

      // Epic explosion animation!
      this.cameras.main.shake(500, 0.02);

      // Flash effect
      this.cameras.main.flash(500, 255, 192, 203);

      // Belly explosion animation
      this.tweens.add({
        targets: this.belly,
        scaleX: 3,
        scaleY: 3,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
      });

      // Cherry flying up
      this.tweens.add({
        targets: this.cherry,
        y: -200,
        rotation: Math.PI * 2,
        duration: 1000,
        ease: 'Power2',
      });

      // Show BOOM text
      const boomText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '💥 BOOM! 💥', {
        fontSize: '48px',
        fontFamily: 'Arial Black',
        color: '#ff1493',
        stroke: '#ffffff',
        strokeThickness: 6,
      });
      boomText.setOrigin(0.5);
      boomText.setScale(0);

      this.tweens.add({
        targets: boomText,
        scale: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });

      // Add confetti emojis
      for (let i = 0; i < 20; i++) {
        const emoji = this.add.text(
          Phaser.Math.Between(0, GAME_WIDTH),
          -50,
          ['🎉', '🎊', '⭐', '💖', '🍒'][Phaser.Math.Between(0, 4)],
          { fontSize: '30px' }
        );
        this.tweens.add({
          targets: emoji,
          y: GAME_HEIGHT + 50,
          x: emoji.x + Phaser.Math.Between(-100, 100),
          rotation: Math.PI * Phaser.Math.Between(1, 3),
          duration: 2000,
          delay: i * 50,
        });
      }

      // Callback after animation - use the global callback
      const finalScore = this.score;
      this.time.delayedCall(1500, () => {
        if (gameEndCallback) {
          gameEndCallback(finalScore);
        }
      });
    }
  };
}

export function CherryBellyTapGame({ onScoreSubmitted }: CherryBellyTapGameProps) {
  const gameRef = useRef<import('phaser').Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<typeof import('phaser') | null>(null);
  const { isAuthenticated, user } = useAuth();
  const [gameState, setGameState] = useState<'idle' | 'loading' | 'playing' | 'ended'>('idle');
  const [result, setResult] = useState<GameResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Phaser only when user clicks Start Game (lazy loading)
  const loadPhaser = useCallback(async () => {
    if (phaserRef.current) return true;

    try {
      const Phaser = await import('phaser');
      phaserRef.current = Phaser.default;
      return true;
    } catch (error) {
      console.error('Failed to load Phaser:', error);
      return false;
    }
  }, []);

  const handleGameEnd = useCallback(
    async (score: number) => {
      setGameState('ended');
      setIsSubmitting(true);

      try {
        const response: SubmitScoreResponse = await gamesApi.submitScore({
          gameName: GAME_NAMES.CHERRY_BELLY_TAP,
          score,
          duration: GAME_DURATION,
        });
        setResult({ score, rank: response.rank });
        onScoreSubmitted?.();
      } catch (error) {
        console.error('Failed to submit score:', error);
        setResult({ score, rank: null });
      } finally {
        setIsSubmitting(false);
      }
    },
    [onScoreSubmitted]
  );

  // Update the global callback whenever handleGameEnd changes
  useEffect(() => {
    gameEndCallback = handleGameEnd;
    return () => {
      gameEndCallback = null;
    };
  }, [handleGameEnd]);

  const startGame = useCallback(async () => {
    // Show loading state
    setGameState('loading');
    setResult(null);

    // Load Phaser if not already loaded
    const loaded = await loadPhaser();
    if (!loaded) {
      setGameState('idle');
      return;
    }

    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    setGameState('playing');
  }, [loadPhaser]);

  // Initialize Phaser game when state changes to 'playing' and container is ready
  useEffect(() => {
    if (gameState !== 'playing' || !phaserRef.current) return;

    // Wait for next frame to ensure container is rendered
    const initGame = () => {
      if (!containerRef.current || !phaserRef.current) {
        // Retry after a short delay if container isn't ready
        requestAnimationFrame(initGame);
        return;
      }

      const Phaser = phaserRef.current;
      const CherryScene = createCherryScene(Phaser);

      const config: import('phaser').Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent: containerRef.current,
        backgroundColor: '#ffecd2',
        scene: [CherryScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      gameRef.current = new Phaser.Game(config);
    };

    requestAnimationFrame(initGame);
  }, [gameState]);

  const resetGame = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    setGameState('idle');
    setResult(null);
  }, []);

  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <Card className="mx-auto max-w-md overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-400 to-pink-600 text-white">
          <CardTitle className="flex items-center gap-2 text-center text-2xl">
            <span>🍒</span> Cherry Belly Tap
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="mb-6 text-6xl">🔒</div>
          <h3 className="mb-4 text-xl font-semibold">Login Required</h3>
          <p className="mb-6 text-muted-foreground">
            Please log in to play this game and compete on the leaderboard!
          </p>
          <Link href="/login">
            <Button className="bg-pink-500 hover:bg-pink-600">
              <LogIn className="mr-2 h-4 w-4" />
              Login to Play
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-pink-400 to-pink-600 text-white">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <span>🍒</span> Cherry Belly Tap <span>🍒</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <AnimatePresence mode="wait">
          {gameState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="mb-6 text-8xl">🍒</div>
              <h3 className="mb-4 text-xl font-semibold text-pink-600">
                Welcome, {user?.firstName || user?.email?.split('@')[0]}!
              </h3>
              <p className="mb-6 text-muted-foreground">
                Tap Cherry's belly as many times as you can in {GAME_DURATION} seconds! Watch her
                tummy grow bigger until it explodes! 💥
              </p>
              <Button onClick={startGame} size="lg" className="bg-pink-500 hover:bg-pink-600">
                <Play className="mr-2 h-5 w-5" />
                Start Game
              </Button>
            </motion.div>
          )}

          {gameState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-pink-500" />
              <p className="text-muted-foreground">Loading game...</p>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-center"
            >
              <div
                ref={containerRef}
                style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
                className="overflow-hidden rounded-lg shadow-lg"
              />
            </motion.div>
          )}

          {gameState === 'ended' && (
            <motion.div
              key="ended"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="mb-4 text-7xl"
              >
                🎉
              </motion.div>
              <h3 className="mb-2 text-2xl font-bold text-pink-600">Game Over!</h3>

              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                  <span className="text-muted-foreground">Saving score...</span>
                </div>
              ) : result ? (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-6 w-6 text-yellow-500" />
                    <span className="text-4xl font-bold text-pink-600">{result.score} taps!</span>
                    <Sparkles className="h-6 w-6 text-yellow-500" />
                  </div>

                  {result.rank && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-center gap-2 text-lg"
                    >
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span>
                        You're ranked{' '}
                        <span className="font-bold text-pink-600">#{result.rank}</span>
                      </span>
                    </motion.div>
                  )}
                </div>
              ) : (
                <p className="py-4 text-muted-foreground">Game completed!</p>
              )}

              <div className="flex justify-center gap-3">
                <Button onClick={startGame} className="bg-pink-500 hover:bg-pink-600">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
                <Button onClick={resetGame} variant="outline">
                  Back
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
