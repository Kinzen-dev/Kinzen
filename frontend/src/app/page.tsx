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
import { WebGLHeroBanner } from '@/shared/components/webgl-hero-banner';
import { ArrowRight, Github, Linkedin, Mail, Zap } from 'lucide-react';
import {
  SiNextdotjs,
  SiNestjs,
  SiTypescript,
  SiPostgresql,
  SiRedis,
  SiTailwindcss,
  SiDocker,
  SiKubernetes,
  SiPrisma,
  SiFramer,
  SiReact,
  SiNodedotjs,
} from 'react-icons/si';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <Navigation onMobileMenuToggle={setIsMobileMenuOpen} isMobileMenuOpen={isMobileMenuOpen} />
        <MobileMenuOverlay isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

        {/* WebGL Hero Banner with Particle Effects */}
        <WebGLHeroBanner
          title="Building Everything That Comes to Mind"
          subtitle="Welcome to my digital universe"
          description="A personal portfolio showcasing my journey through technology, creativity, and passion projects"
          ctaText="Get Started"
        />

        <main className="container mx-auto px-4 py-8">
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
          <motion.section
            className="py-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            viewport={{ once: true }}
          >
            <Card className="border-0 bg-gradient-to-br from-muted/50 to-background">
              <CardHeader className="pb-8 text-center">
                <motion.div
                  className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  viewport={{ once: true }}
                >
                  <Zap className="mr-2 h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Modern Tech Stack</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <CardTitle className="text-3xl font-bold">Built with Excellence</CardTitle>
                  <CardDescription className="mx-auto max-w-2xl text-lg">
                    Leveraging cutting-edge technologies and best practices to deliver exceptional
                    user experiences
                  </CardDescription>
                </motion.div>
              </CardHeader>
              <CardContent className="text-center">
                <motion.div
                  className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  {[
                    {
                      name: 'Next.js 15',
                      icon: SiNextdotjs,
                      color: 'text-black dark:text-white',
                      bgColor: 'bg-white dark:bg-black',
                    },
                    {
                      name: 'NestJS',
                      icon: SiNestjs,
                      color: 'text-red-500',
                      bgColor: 'bg-red-50 dark:bg-red-950',
                    },
                    {
                      name: 'TypeScript',
                      icon: SiTypescript,
                      color: 'text-blue-600',
                      bgColor: 'bg-blue-50 dark:bg-blue-950',
                    },
                    {
                      name: 'PostgreSQL',
                      icon: SiPostgresql,
                      color: 'text-blue-700',
                      bgColor: 'bg-blue-50 dark:bg-blue-950',
                    },
                    {
                      name: 'Redis',
                      icon: SiRedis,
                      color: 'text-red-600',
                      bgColor: 'bg-red-50 dark:bg-red-950',
                    },
                    {
                      name: 'Tailwind CSS',
                      icon: SiTailwindcss,
                      color: 'text-cyan-500',
                      bgColor: 'bg-cyan-50 dark:bg-cyan-950',
                    },
                    {
                      name: 'Docker',
                      icon: SiDocker,
                      color: 'text-blue-500',
                      bgColor: 'bg-blue-50 dark:bg-blue-950',
                    },
                    {
                      name: 'Kubernetes',
                      icon: SiKubernetes,
                      color: 'text-blue-600',
                      bgColor: 'bg-blue-50 dark:bg-blue-950',
                    },
                    {
                      name: 'Prisma',
                      icon: SiPrisma,
                      color: 'text-gray-800 dark:text-gray-200',
                      bgColor: 'bg-gray-50 dark:bg-gray-900',
                    },
                    {
                      name: 'Framer Motion',
                      icon: SiFramer,
                      color: 'text-purple-600',
                      bgColor: 'bg-purple-50 dark:bg-purple-950',
                    },
                    {
                      name: 'React',
                      icon: SiReact,
                      color: 'text-blue-500',
                      bgColor: 'bg-blue-50 dark:bg-blue-950',
                    },
                    {
                      name: 'Node.js',
                      icon: SiNodedotjs,
                      color: 'text-green-600',
                      bgColor: 'bg-green-50 dark:bg-green-950',
                    },
                  ].map((tech, index) => (
                    <motion.div
                      key={tech.name}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: 0.5 + index * 0.1,
                        duration: 0.6,
                        type: 'spring',
                        stiffness: 100,
                      }}
                      whileHover={{
                        y: -8,
                        scale: 1.05,
                        transition: { duration: 0.2 },
                      }}
                      viewport={{ once: true }}
                      className="group"
                    >
                      <div
                        className={`tech-card rounded-xl border border-border/50 bg-background/50 p-4 transition-all duration-300 hover:border-border hover:shadow-lg ${tech.bgColor}`}
                      >
                        <div className="flex flex-col items-center space-y-3">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110`}
                          >
                            <tech.icon className={`tech-icon h-8 w-8 ${tech.color}`} />
                          </div>
                          <div className="text-center">
                            <h3 className="text-sm font-semibold text-foreground">{tech.name}</h3>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                <motion.div
                  className="mt-8 text-xs text-muted-foreground"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  viewport={{ once: true }}
                >
                  Clean Architecture • Domain-Driven Design • Production-Ready
                </motion.div>
              </CardContent>
            </Card>
          </motion.section>

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
