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
import { PageTransition } from '@/shared/components/page-transition';
import { ArrowRight, Github, Linkedin, Mail, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <Navigation />

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
                <Star className="mr-2 h-4 w-4 text-yellow-500" />
                Welcome to my digital universe
              </motion.div>
              <motion.h1
                className="animate-fade-in-up mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                Building Everything That{' '}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Comes to Mind
                </span>
              </motion.h1>
              <motion.p
                className="animate-fade-in-up mb-8 text-balance text-xl text-muted-foreground sm:text-2xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                A personal portfolio showcasing my journey through technology, creativity, and
                passion projects
              </motion.p>
              <motion.div
                className="animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:justify-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                <Link href="/login">
                  <Button size="lg" className="group">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="outline">
                    Explore Portfolio
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.section>

          {/* Features Grid */}
          <motion.section
            className="py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <motion.div
              className="mb-16 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                What You'll Discover
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                From professional achievements to personal passions, explore the diverse world of my
                projects and interests
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: '💼',
                  title: 'Professional Portfolio',
                  description:
                    'Showcase my work, projects, and professional achievements with interactive demos and detailed case studies',
                  color: 'from-blue-500 to-blue-600',
                  delay: 0.8,
                },
                {
                  icon: '🚗',
                  title: 'Car Collection',
                  description:
                    'Interactive 3D gallery of cars I own with stories, specifications, and personal experiences',
                  color: 'from-red-500 to-red-600',
                  delay: 0.9,
                },
                {
                  icon: '📈',
                  title: 'US Stocks Tracker',
                  description:
                    'Real-time tracking and analysis of my investment portfolio with detailed insights and performance metrics',
                  color: 'from-green-500 to-green-600',
                  delay: 1.0,
                },
                {
                  icon: '⚽',
                  title: 'Manchester United',
                  description:
                    'Match stats, player analysis, and my personal commentary on the beautiful game',
                  color: 'from-yellow-500 to-yellow-600',
                  delay: 1.1,
                },
                {
                  icon: '📝',
                  title: 'Personal Blog',
                  description:
                    'Life updates, thoughts, and experiences about everything that matters in my journey',
                  color: 'from-purple-500 to-purple-600',
                  delay: 1.2,
                },
                {
                  icon: '🎨',
                  title: 'Creative Showcase',
                  description:
                    'Photography, art, and creative projects collection showcasing my artistic side',
                  color: 'from-pink-500 to-pink-600',
                  delay: 1.3,
                },
              ].map((feature, _index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: feature.delay,
                    duration: 0.6,
                    type: 'spring',
                    stiffness: 100,
                  }}
                  whileHover={{
                    y: -8,
                    scale: 1.02,
                    transition: { duration: 0.2 },
                  }}
                >
                  <Card className="group border-0 bg-gradient-to-br from-card to-card/50 transition-all duration-300 hover:shadow-xl">
                    <CardHeader className="pb-4">
                      <div
                        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}
                      >
                        <span className="text-2xl">{feature.icon}</span>
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Tech Stack Section */}
          <section className="py-20">
            <Card className="border-0 bg-gradient-to-br from-muted/50 to-background">
              <CardHeader className="pb-8 text-center">
                <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2">
                  <Zap className="mr-2 h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Modern Tech Stack</span>
                </div>
                <CardTitle className="text-3xl font-bold">Built with Excellence</CardTitle>
                <CardDescription className="mx-auto max-w-2xl text-lg">
                  Leveraging cutting-edge technologies and best practices to deliver exceptional
                  user experiences
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground md:grid-cols-4 lg:grid-cols-8">
                  <div className="rounded-lg bg-background/50 p-3">Next.js 15</div>
                  <div className="rounded-lg bg-background/50 p-3">NestJS</div>
                  <div className="rounded-lg bg-background/50 p-3">TypeScript</div>
                  <div className="rounded-lg bg-background/50 p-3">PostgreSQL</div>
                  <div className="rounded-lg bg-background/50 p-3">Redis</div>
                  <div className="rounded-lg bg-background/50 p-3">Tailwind CSS</div>
                  <div className="rounded-lg bg-background/50 p-3">Docker</div>
                  <div className="rounded-lg bg-background/50 p-3">Kubernetes</div>
                </div>
                <div className="mt-6 text-xs text-muted-foreground">
                  Clean Architecture • Domain-Driven Design • Production-Ready
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA Section */}
          <section className="py-20 text-center">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to Explore?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Join me on this journey through technology, creativity, and innovation
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/login">
                  <Button size="lg" className="group">
                    Start Your Journey
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="icon">
                    <Github className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </PageTransition>
  );
}
