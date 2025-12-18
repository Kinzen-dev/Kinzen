'use client';

import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Navigation } from '@/shared/components/navigation';
import { MobileMenuOverlay } from '@/shared/components/mobile-menu-overlay';
import { PageTransition } from '@/shared/components/page-transition';
import {
  Gamepad2,
  Trophy,
  Users,
  Monitor,
  Sparkles,
  Swords,
  Target,
  Puzzle,
  Dice5,
  Joystick,
  Headphones,
  Zap,
  Cherry,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { CherryBellyTapGame, GameScoreboard } from '@/features/games';

export default function GamesPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scoreboardRefresh, setScoreboardRefresh] = useState(0);

  const handleGameEnd = useCallback(() => {
    // Refresh scoreboard after game ends
    setScoreboardRefresh((prev) => prev + 1);
  }, []);

  const gameCategories = [
    {
      icon: Swords,
      title: 'Action & Adventure',
      description:
        'Epic journeys and thrilling combat. From open-world exploration to intense action sequences.',
      color: 'from-red-500 to-orange-600',
    },
    {
      icon: Target,
      title: 'FPS & Shooters',
      description:
        'Competitive shooters and tactical games. Precision, strategy, and quick reflexes.',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Puzzle,
      title: 'Puzzle & Strategy',
      description: 'Mind-bending puzzles and strategic challenges. Games that make you think.',
      color: 'from-purple-500 to-pink-600',
    },
    {
      icon: Users,
      title: 'Multiplayer & Co-op',
      description:
        'Gaming with friends and online communities. Cooperative adventures and competitive play.',
      color: 'from-green-500 to-teal-600',
    },
    {
      icon: Dice5,
      title: 'RPG & Story-Driven',
      description:
        'Immersive narratives and character development. Epic storylines and meaningful choices.',
      color: 'from-amber-500 to-yellow-600',
    },
    {
      icon: Joystick,
      title: 'Retro & Indie',
      description: 'Classic games and indie gems. Nostalgic favorites and innovative indie titles.',
      color: 'from-cyan-500 to-blue-600',
    },
  ];

  const featuredGames = [
    {
      title: 'Currently Playing',
      description:
        "Games I'm actively enjoying right now. Check back for updates on my current adventures.",
      icon: Gamepad2,
      color: 'from-violet-500 to-purple-600',
    },
    {
      title: 'All-Time Favorites',
      description:
        'The games that defined my gaming journey. Timeless classics and unforgettable experiences.',
      icon: Trophy,
      color: 'from-yellow-500 to-orange-600',
    },
    {
      title: 'Setup & Gear',
      description:
        'My gaming setup, peripherals, and gear recommendations for the ultimate experience.',
      icon: Monitor,
      color: 'from-slate-500 to-gray-600',
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <Navigation onMobileMenuToggle={setIsMobileMenuOpen} isMobileMenuOpen={isMobileMenuOpen} />
        <MobileMenuOverlay isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <section className="py-20 text-center">
            <div className="mx-auto max-w-4xl">
              <div className="mb-8 inline-flex items-center rounded-full border bg-muted/50 px-4 py-2 text-sm">
                <Gamepad2 className="mr-2 h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Gaming & Entertainment</span>
              </div>

              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
                Welcome to My{' '}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Gaming World
                </span>
              </h1>

              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
                Explore my gaming journey, favorite titles, and the experiences that have shaped my
                passion for interactive entertainment. From competitive esports to immersive
                single-player adventures.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
                <Link href="/lifestyle">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    <Zap className="mr-2 h-4 w-4" />
                    Explore Lifestyle
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Mini Game Section */}
          <section className="py-16">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 px-4 py-2 text-white">
                <Cherry className="h-5 w-5" />
                <span className="font-semibold">NEW! Mini Game</span>
                <span className="text-xl">🎮</span>
              </div>
              <h2 className="mb-4 text-3xl font-bold">Cherry Belly Tap</h2>
              <p className="text-muted-foreground">
                Test your tapping skills! How many times can you tap Cherry's belly in 30 seconds?
              </p>
            </div>

            <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-8 lg:flex-row lg:items-start">
              <div className="w-full max-w-md">
                <CherryBellyTapGame onScoreSubmitted={handleGameEnd} />
              </div>
              <div className="w-full max-w-md">
                <GameScoreboard refreshTrigger={scoreboardRefresh} />
              </div>
            </div>
          </section>

          {/* Game Categories Grid */}
          <section className="py-16">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Game Categories</h2>
              <p className="text-muted-foreground">
                Discover the genres and types of games that captivate my attention
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {gameCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <div key={category.title} className="group">
                    <Card className="h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <CardHeader className="pb-4">
                        <div
                          className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${category.color}`}
                        >
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <CardTitle className="transition-colors group-hover:text-primary">
                          {category.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">
                          {category.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Featured Content Section */}
          <section className="py-16">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Featured Content</h2>
              <p className="text-muted-foreground">
                Coming soon: Game reviews, recommendations, and gaming insights
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {featuredGames.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div key={item.title}>
                    <Card className="h-full">
                      <CardHeader>
                        <div
                          className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${item.color}`}
                        >
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle>{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{item.description}</CardDescription>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Gaming Stats Section */}
          <section className="py-16">
            <div className="mx-auto max-w-4xl">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
                      <Headphones className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Gaming Sessions</h3>
                      <p className="text-muted-foreground">Stats and achievements coming soon</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-background/50 p-4 text-center">
                      <div className="text-3xl font-bold text-primary">--</div>
                      <div className="text-sm text-muted-foreground">Hours Played</div>
                    </div>
                    <div className="rounded-lg bg-background/50 p-4 text-center">
                      <div className="text-3xl font-bold text-primary">--</div>
                      <div className="text-sm text-muted-foreground">Games Completed</div>
                    </div>
                    <div className="rounded-lg bg-background/50 p-4 text-center">
                      <div className="text-3xl font-bold text-primary">--</div>
                      <div className="text-sm text-muted-foreground">Achievements</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Call to Action */}
          <section className="py-16 text-center">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-4 text-3xl font-bold">Let's Play Together</h2>
              <p className="mb-8 text-muted-foreground">
                Looking for gaming buddies or want to discuss your favorite titles? I'm always
                excited to connect with fellow gamers.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/lifestyle">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Explore Lifestyle
                  </Button>
                </Link>
                <Link href="/">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </PageTransition>
  );
}
