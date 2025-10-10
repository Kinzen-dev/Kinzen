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
  Heart,
  Coffee,
  BookOpen,
  Music,
  Camera,
  Utensils,
  Mountain,
  Palette,
  Gamepad2,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function LifestylePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const lifestyleCategories = [
    {
      icon: Coffee,
      title: 'Coffee Culture',
      description: 'Discover the art of brewing, coffee shops, and the perfect morning routine.',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: BookOpen,
      title: 'Reading & Learning',
      description: 'Book recommendations, learning resources, and personal growth insights.',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Music,
      title: 'Music & Audio',
      description: 'Playlists, music discovery, and audio equipment reviews.',
      color: 'from-purple-500 to-pink-600',
    },
    {
      icon: Camera,
      title: 'Photography',
      description: "Tips, techniques, and inspiration for capturing life's moments.",
      color: 'from-green-500 to-teal-600',
    },
    {
      icon: Utensils,
      title: 'Culinary Adventures',
      description: 'Recipes, restaurant reviews, and cooking techniques.',
      color: 'from-red-500 to-rose-600',
    },
    {
      icon: Mountain,
      title: 'Outdoor & Travel',
      description: 'Adventure stories, travel guides, and outdoor activities.',
      color: 'from-emerald-500 to-green-600',
    },
    {
      icon: Palette,
      title: 'Art & Creativity',
      description: 'Creative projects, art inspiration, and design thinking.',
      color: 'from-violet-500 to-purple-600',
    },
    {
      icon: Gamepad2,
      title: 'Gaming & Tech',
      description: 'Gaming experiences, tech reviews, and digital lifestyle.',
      color: 'from-cyan-500 to-blue-600',
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <Navigation onMobileMenuToggle={setIsMobileMenuOpen} isMobileMenuOpen={isMobileMenuOpen} />
        <MobileMenuOverlay isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <motion.section
            className="py-20 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="mx-auto max-w-4xl">
              <motion.div
                className="animate-fade-in mb-8 inline-flex items-center rounded-full border bg-muted/50 px-4 py-2 text-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <Heart className="mr-2 h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Lifestyle & Personal Interests</span>
              </motion.div>

              <motion.h1
                className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                Discover My{' '}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Lifestyle
                </span>
              </motion.h1>

              <motion.p
                className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                Explore the passions, hobbies, and interests that shape my daily life. From coffee
                culture to creative pursuits, discover what inspires and motivates me.
              </motion.p>

              <motion.div
                className="flex flex-col gap-4 sm:flex-row sm:justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                <Link href="/">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.section>

          {/* Lifestyle Categories Grid */}
          <motion.section
            className="py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Lifestyle Categories</h2>
              <p className="text-muted-foreground">
                Click on any category to explore more about my interests and experiences
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lifestyleCategories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <motion.div
                    key={category.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1, duration: 0.6 }}
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-lg">
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
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* Featured Content Section */}
          <motion.section
            className="py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Featured Content</h2>
              <p className="text-muted-foreground">
                Coming soon: Personal stories, recommendations, and insights
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.3, duration: 0.6 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                      <Coffee className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>Morning Routine</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Discover my perfect morning routine that sets the tone for a productive day.
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, duration: 0.6 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>Reading List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Books that have shaped my thinking and continue to inspire my journey.
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.6 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                      <Music className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>Music Discovery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Playlists and music discoveries that fuel my creativity and focus.
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.section>

          {/* Call to Action */}
          <motion.section
            className="py-16 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.8 }}
          >
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-4 text-3xl font-bold">Let's Connect</h2>
              <p className="mb-8 text-muted-foreground">
                Interested in any of these topics? I'd love to share more about my experiences and
                learn about yours too.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </PageTransition>
  );
}
