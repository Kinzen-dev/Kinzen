'use client';

import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { PageLayout } from '@/shared/components/page-layout';
import {
  Car,
  ArrowLeft,
  Calendar,
  Fuel,
  Gauge,
  Users,
  MapPin,
  Star,
  Heart,
  ExternalLink,
  Zap,
  TrendingUp,
  Award,
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

export default function CarsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Simplified scroll animations for better performance
  const { scrollYProgress: heroScrollY } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const { scrollYProgress: statsScrollY } = useScroll({
    target: statsRef,
    offset: ['start end', 'end start'],
  });

  // Reduced transform calculations for smoother performance
  const heroOpacity = useTransform(heroScrollY, [0, 0.5, 1], [1, 0.8, 0]);
  const statsOpacity = useTransform(statsScrollY, [0, 0.3, 1], [0, 1, 1]);

  // Advanced spring configurations for different interaction types
  const gentleSpring = { stiffness: 120, damping: 25, restDelta: 0.001 };
  const bouncySpring = { stiffness: 200, damping: 15, restDelta: 0.001 };
  const smoothSpring = { stiffness: 100, damping: 30, restDelta: 0.001 };

  // Simplified particle system for maximum performance
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; size: number }>
  >([]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Initialize static particles (no animation for better performance)
  useEffect(() => {
    const particleCount = isReducedMotion ? 0 : 15; // Much fewer particles
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
    }));
    setParticles(newParticles);
  }, [isReducedMotion]);

  // Sample car data - you can replace this with your actual cars
  const myCars = [
    {
      id: 1,
      name: 'BMW M3 Competition',
      year: 2023,
      make: 'BMW',
      model: 'M3 Competition',
      engine: '3.0L Twin-Turbo I6',
      horsepower: 503,
      torque: 479,
      fuelType: 'Gasoline',
      transmission: '8-Speed Automatic',
      drivetrain: 'RWD',
      seating: 5,
      location: 'Garage 1',
      image: '/cars/bmw-m3.jpg', // You'll need to add actual images
      description:
        'My daily driver and weekend track weapon. The perfect balance of luxury and performance.',
      features: [
        'M Sport Package',
        'Carbon Fiber Trim',
        'Harman Kardon Audio',
        'Adaptive Suspension',
      ],
      purchaseDate: '2023-03-15',
      mileage: 8500,
      favorite: true,
    },
    {
      id: 2,
      name: 'Porsche 911 Turbo S',
      year: 2022,
      make: 'Porsche',
      model: '911 Turbo S',
      engine: '3.8L Twin-Turbo H6',
      horsepower: 640,
      torque: 590,
      fuelType: 'Gasoline',
      transmission: '8-Speed PDK',
      drivetrain: 'AWD',
      seating: 4,
      location: 'Garage 2',
      image: '/cars/porsche-911.jpg',
      description:
        'The ultimate supercar for special occasions. Incredible acceleration and handling.',
      features: ['Sport Chrono Package', 'PASM Suspension', 'Bose Audio', 'Carbon Ceramic Brakes'],
      purchaseDate: '2022-08-20',
      mileage: 3200,
      favorite: true,
    },
    {
      id: 3,
      name: 'Mercedes-AMG GT 63 S',
      year: 2023,
      make: 'Mercedes-Benz',
      model: 'AMG GT 63 S',
      engine: '4.0L Twin-Turbo V8',
      horsepower: 630,
      torque: 664,
      fuelType: 'Gasoline',
      transmission: '9-Speed AMG Speedshift',
      drivetrain: 'AWD',
      seating: 4,
      location: 'Garage 1',
      image: '/cars/mercedes-amg-gt.jpg',
      description:
        'The perfect grand tourer. Comfortable for long trips yet aggressive when needed.',
      features: [
        'AMG Performance Package',
        'AMG Track Package',
        'Burmester Audio',
        'AMG Ride Control',
      ],
      purchaseDate: '2023-01-10',
      mileage: 12000,
      favorite: false,
    },
  ];

  return (
    <PageLayout>
      <div ref={containerRef} className="cars-page relative overflow-hidden">
        {/* Simplified Static Background Particles */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full bg-gradient-to-r from-red-400/20 to-orange-400/20"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
              }}
            />
          ))}

          {/* Static gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5" />
        </div>

        <main className="relative z-10">
          {/* Simplified Hero Section for Better Performance */}
          <motion.section
            ref={heroRef}
            className="relative flex min-h-screen items-center justify-center overflow-hidden"
            style={{ opacity: heroOpacity }}
          >
            {/* Simplified background */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-muted/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 via-transparent to-orange-500/10" />

            <div className="container relative z-10 mx-auto px-4 text-center">
              <motion.div
                className="mb-8 inline-flex items-center rounded-full border bg-muted/50 px-6 py-3 text-sm backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ...gentleSpring }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={!isReducedMotion ? { rotate: [0, 360] } : {}}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <Car className="mr-2 h-5 w-5 text-primary" />
                </motion.div>
                <span className="font-medium text-muted-foreground">My Automotive Collection</span>
              </motion.div>

              <motion.h1
                className="mb-8 text-4xl font-bold tracking-tight sm:text-6xl md:text-8xl lg:text-9xl"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 1, ...bouncySpring }}
              >
                <motion.span
                  className="block bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-transparent"
                  whileHover={{
                    scale: 1.02,
                  }}
                >
                  My Own
                </motion.span>
                <motion.span
                  className="mt-2 block"
                  initial={{ opacity: 0, x: -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8, duration: 0.8, ...smoothSpring }}
                  whileHover={{
                    scale: 1.05,
                    textShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
                  }}
                >
                  Cars
                </motion.span>
              </motion.h1>

              <motion.p
                className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-muted-foreground"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                Discover the cars I own, each with its own story, specifications, and the
                experiences that make them special to me. From daily drivers to weekend warriors.
              </motion.p>

              <motion.div
                className="flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                <motion.div
                  whileHover={{
                    scale: 1.05,
                    y: -5,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={gentleSpring}
                >
                  <Link href="/lifestyle">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-2 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 sm:w-auto"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Lifestyle
                    </Button>
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.05,
                    y: -5,
                    boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={bouncySpring}
                >
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-red-500 to-orange-600 shadow-lg transition-all duration-300 hover:from-red-600 hover:to-orange-700 hover:shadow-xl sm:w-auto"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Explore Collection
                  </Button>
                </motion.div>
              </motion.div>
            </div>

            {/* Enhanced Scroll Indicator */}
            {!isReducedMotion && (
              <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 transform"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                <motion.div
                  className="flex h-10 w-6 justify-center rounded-full border-2 border-muted-foreground/30 backdrop-blur-sm"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.1 }}
                >
                  <motion.div
                    className="mt-2 h-3 w-1 rounded-full bg-gradient-to-b from-primary to-primary/50"
                    animate={{ scaleY: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
              </motion.div>
            )}
          </motion.section>

          {/* Enhanced Cars Grid with Performance Optimization */}
          <section className="relative py-16 sm:py-24 lg:py-32">
            <div className="container mx-auto px-4">
              <motion.div
                className="mb-12 text-center sm:mb-16 lg:mb-20"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: '-100px' }}
              >
                <motion.h2
                  className="mb-4 text-3xl font-bold sm:mb-6 sm:text-4xl lg:text-5xl"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ...bouncySpring }}
                  viewport={{ once: true }}
                >
                  My Collection
                </motion.h2>
                <motion.p
                  className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  {myCars.length} cars that represent my passion for automotive excellence
                </motion.p>
              </motion.div>

              <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-12">
                {myCars.map((car, index) => (
                  <motion.div
                    key={car.id}
                    className="group"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.1,
                      duration: 0.6,
                      ease: 'easeOut',
                    }}
                    viewport={{ once: true, margin: '-50px' }}
                    whileHover={
                      !isReducedMotion
                        ? {
                            y: -10,
                            scale: 1.02,
                          }
                        : {}
                    }
                  >
                    <div className="relative h-full">
                      <Card className="h-full overflow-hidden border-0 bg-gradient-to-br from-card/50 to-card/20 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
                        {/* Simplified Car Image Placeholder */}
                        <div className="relative h-48 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 sm:h-56 lg:h-64">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Car className="h-16 w-16 text-gray-500 dark:text-gray-400 sm:h-20 sm:w-20" />
                          </div>

                          {car.favorite && (
                            <div className="absolute right-6 top-6">
                              <div className="rounded-full bg-gradient-to-r from-red-500 to-pink-500 p-3 shadow-lg">
                                <Heart className="h-5 w-5 fill-white text-white" />
                              </div>
                            </div>
                          )}

                          <div className="absolute bottom-6 left-6">
                            <div className="rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                              {car.year}
                            </div>
                          </div>
                        </div>

                        <CardHeader className="pb-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <motion.h3
                                className="text-2xl font-bold transition-colors group-hover:text-primary"
                                whileHover={{ scale: 1.05 }}
                              >
                                {car.name}
                              </motion.h3>
                              <motion.p
                                className="text-lg font-medium text-muted-foreground"
                                whileHover={{ x: 5 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                              >
                                {car.make} {car.model}
                              </motion.p>
                            </div>
                            <motion.div className="text-right" whileHover={{ scale: 1.1 }}>
                              <div className="text-sm text-muted-foreground">Mileage</div>
                              <div className="text-lg font-bold">
                                {car.mileage.toLocaleString()} mi
                              </div>
                            </motion.div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          {/* Description */}
                          <motion.p
                            className="text-base leading-relaxed text-muted-foreground"
                            whileHover={{ color: 'hsl(var(--foreground))' }}
                            transition={{ duration: 0.3 }}
                          >
                            {car.description}
                          </motion.p>

                          {/* Specifications with Icons */}
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { icon: Gauge, label: 'Power', value: `${car.horsepower} HP` },
                              { icon: Fuel, label: 'Fuel', value: car.fuelType },
                              { icon: Users, label: 'Seats', value: `${car.seating}` },
                              { icon: MapPin, label: 'Location', value: car.location },
                            ].map((spec, idx) => (
                              <motion.div
                                key={spec.label}
                                className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 backdrop-blur-sm"
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 + idx * 0.1, duration: 0.5 }}
                                viewport={{ once: true }}
                                whileHover={{
                                  scale: 1.05,
                                  backgroundColor: 'hsl(var(--muted))',
                                }}
                              >
                                <spec.icon className="h-5 w-5 text-primary" />
                                <div>
                                  <div className="text-xs text-muted-foreground">{spec.label}</div>
                                  <div className="font-semibold">{spec.value}</div>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Key Features */}
                          <div>
                            <h4 className="mb-3 text-sm font-semibold">Key Features</h4>
                            <div className="flex flex-wrap gap-2">
                              {car.features.slice(0, 3).map((feature, idx) => (
                                <motion.span
                                  key={idx}
                                  className="inline-flex items-center rounded-full bg-gradient-to-r from-primary/20 to-primary/10 px-3 py-1 text-xs font-medium"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: index * 0.1 + idx * 0.1, duration: 0.5 }}
                                  viewport={{ once: true }}
                                  whileHover={{
                                    scale: 1.1,
                                    backgroundColor: 'hsl(var(--primary))',
                                    color: 'hsl(var(--primary-foreground))',
                                  }}
                                >
                                  {feature}
                                </motion.span>
                              ))}
                              {car.features.length > 3 && (
                                <motion.span
                                  className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs"
                                  whileHover={{ scale: 1.1 }}
                                >
                                  +{car.features.length - 3} more
                                </motion.span>
                              )}
                            </div>
                          </div>

                          {/* Purchase Info */}
                          <motion.div
                            className="flex items-center justify-between border-t pt-4"
                            whileHover={{ x: 5 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                          >
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Purchased {new Date(car.purchaseDate).toLocaleDateString()}
                              </span>
                            </div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button size="sm" variant="outline" className="backdrop-blur-sm">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Details
                              </Button>
                            </motion.div>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Simplified Collection Stats */}
          <motion.section
            ref={statsRef}
            className="relative py-32"
            style={{ opacity: statsOpacity }}
          >
            <div className="container mx-auto px-4">
              <motion.div
                className="mb-20 text-center"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <motion.h2
                  className="mb-6 text-5xl font-bold"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, type: 'spring' }}
                  viewport={{ once: true }}
                >
                  Collection Statistics
                </motion.h2>
                <motion.p
                  className="text-xl text-muted-foreground"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  A quick overview of my automotive passion
                </motion.p>
              </motion.div>

              <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                {[
                  {
                    icon: Car,
                    value: myCars.length,
                    label: 'Total Cars',
                    color: 'from-blue-500 to-cyan-500',
                    description: 'Vehicles in collection',
                  },
                  {
                    icon: Zap,
                    value: myCars.reduce((sum, car) => sum + car.horsepower, 0),
                    label: 'Total HP',
                    color: 'from-red-500 to-orange-500',
                    description: 'Combined power',
                  },
                  {
                    icon: TrendingUp,
                    value: myCars.reduce((sum, car) => sum + car.mileage, 0),
                    label: 'Total Miles',
                    color: 'from-green-500 to-emerald-500',
                    description: 'Miles driven',
                  },
                  {
                    icon: Award,
                    value: myCars.filter((car) => car.favorite).length,
                    label: 'Favorites',
                    color: 'from-purple-500 to-pink-500',
                    description: 'Top picks',
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className="group"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.1,
                      duration: 0.6,
                      ease: 'easeOut',
                    }}
                    viewport={{ once: true }}
                    whileHover={{
                      y: -10,
                      scale: 1.02,
                    }}
                  >
                    <Card className="h-full overflow-hidden border-0 bg-gradient-to-br from-card/50 to-card/20 shadow-xl backdrop-blur-sm">
                      <CardContent className="relative p-8 text-center">
                        {/* Icon */}
                        <div
                          className={`mx-auto mb-6 h-16 w-16 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}
                        >
                          <stat.icon className="h-8 w-8 text-white" />
                        </div>

                        {/* Value */}
                        <div
                          className={`mb-2 bg-gradient-to-r text-4xl font-bold ${stat.color} bg-clip-text text-transparent`}
                        >
                          {stat.value.toLocaleString()}
                        </div>

                        {/* Label */}
                        <h3 className="mb-2 text-lg font-semibold">{stat.label}</h3>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground">{stat.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Call to Action with Morphing Effects */}
          <section className="relative py-32">
            <div className="container mx-auto px-4">
              <motion.div
                className="mx-auto max-w-4xl text-center"
                initial={{ opacity: 0, y: 100 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, type: 'spring' }}
                viewport={{ once: true }}
              >
                <motion.h2
                  className="mb-8 text-6xl font-bold"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, type: 'spring' }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                >
                  Want to Know More?
                </motion.h2>

                <motion.p
                  className="mb-12 text-xl leading-relaxed text-muted-foreground"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  Each car has its own story and unique characteristics. Let me know if you'd like
                  to learn more about any specific vehicle in my collection.
                </motion.p>

                <motion.div
                  className="flex flex-col gap-6 sm:flex-row sm:justify-center"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <motion.div
                    whileHover={{
                      scale: 1.05,
                      y: -10,
                      rotateY: 10,
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <Link href="/lifestyle">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full border-2 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 sm:w-auto"
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back to Lifestyle
                      </Button>
                    </Link>
                  </motion.div>

                  <motion.div
                    whileHover={{
                      scale: 1.05,
                      y: -10,
                      rotateY: -10,
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <Link href="/">
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-2xl hover:from-primary/90 hover:to-primary/70 sm:w-auto"
                      >
                        <Star className="mr-2 h-5 w-5" />
                        Back to Home
                      </Button>
                    </Link>
                  </motion.div>
                </motion.div>

                {/* Floating elements */}
                <motion.div
                  className="absolute left-1/4 top-1/2 h-4 w-4 rounded-full bg-primary/20"
                  animate={{
                    y: [-20, 20, -20],
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute right-1/4 top-1/3 h-6 w-6 rounded-full bg-secondary/20"
                  animate={{
                    y: [20, -20, 20],
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute bottom-1/4 left-1/3 h-3 w-3 rounded-full bg-accent/30"
                  animate={{
                    y: [-15, 15, -15],
                    scale: [1, 1.1, 1],
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
          </section>
        </main>
      </div>
    </PageLayout>
  );
}
