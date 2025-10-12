'use client';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { PageLayout } from '@/shared/components/page-layout';
import {
  ArrowLeft,
  Calendar,
  Fuel,
  Gauge,
  Users,
  MapPin,
  Star,
  Settings,
  Smartphone,
  Home,
  ChevronRight,
  Clock,
  CheckCircle,
  Info,
  Wrench,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getCarById } from '@/shared/lib/car-data';
import CarModel from '@/shared/components/car-model-webgl';
import { use, memo, useState, useEffect } from 'react';

interface CarDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default memo(function CarDetailPage({ params }: CarDetailPageProps) {
  const resolvedParams = use(params);
  const carId = parseInt(resolvedParams.id);
  const car = getCarById(carId);
  const [shouldLoad3D, setShouldLoad3D] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side before rendering WebGL components
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Lazy load 3D model after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad3D(true);
    }, 1000); // Load 3D model after 1 second

    return () => clearTimeout(timer);
  }, []);

  if (!car) {
    notFound();
  }

  const springConfig = { stiffness: 120, damping: 25, restDelta: 0.001 };

  return (
    <PageLayout>
      <div className="car-detail-page relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-muted/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 via-transparent to-orange-500/5" />

        <main className="relative z-10">
          {/* Breadcrumb Navigation */}
          <motion.section
            className="py-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="container mx-auto px-4">
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Link href="/" className="transition-colors hover:text-primary">
                  <Home className="h-4 w-4" />
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/cars" className="transition-colors hover:text-primary">
                  Cars
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-foreground">{car.name}</span>
              </nav>
            </div>
          </motion.section>

          {/* Hero Section - 3D Model */}
          <motion.section
            className="relative py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.0, ...springConfig }}
          >
            <div className="container mx-auto px-4">
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
                {/* 3D Car Model */}
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  <div className="relative h-96 overflow-hidden rounded-2xl shadow-2xl">
                    {/* 3D Model with Lazy Loading and Client-Side Check */}
                    {shouldLoad3D && isClient ? (
                      <CarModel carId={car.id} className="h-full w-full" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted/20">
                        <div className="text-center">
                          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          <div className="text-sm text-muted-foreground">Preparing 3D Model...</div>
                          <div className="text-xs text-muted-foreground">
                            Large file - optimizing load
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Car Info */}
                <motion.div
                  className="space-y-8"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                >
                  <div>
                    <motion.h1
                      className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl"
                      whileHover={{ scale: 1.02 }}
                    >
                      {car.name}
                    </motion.h1>
                    <motion.p
                      className="text-xl text-muted-foreground"
                      whileHover={{ x: 5 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      {car.make} {car.model}
                    </motion.p>
                  </div>

                  <motion.p
                    className="text-lg leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
                    transition={{ duration: 0.3 }}
                  >
                    {car.description}
                  </motion.p>

                  {/* Key Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: Gauge, label: 'Power', value: `${car.horsepower} HP` },
                      { icon: Fuel, label: 'Fuel', value: car.fuelType },
                      { icon: Users, label: 'Seats', value: `${car.seating}` },
                      { icon: MapPin, label: 'Location', value: car.location },
                    ].map((stat, idx) => (
                      <motion.div
                        key={stat.label}
                        className="flex items-center gap-3 rounded-lg bg-muted/50 p-4 backdrop-blur-sm transition-colors hover:bg-muted/70"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + idx * 0.1, duration: 0.5 }}
                        whileHover={{
                          scale: 1.05,
                        }}
                      >
                        <stat.icon className="h-6 w-6 text-primary" />
                        <div>
                          <div className="text-sm text-muted-foreground">{stat.label}</div>
                          <div className="text-lg font-semibold">{stat.value}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <motion.div
                    className="flex flex-col gap-4 sm:flex-row"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0, duration: 0.5 }}
                  >
                    <Link href="/cars">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full border-2 transition-all duration-300 hover:bg-primary hover:text-primary-foreground sm:w-auto"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Cars
                      </Button>
                    </Link>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-red-500 to-orange-600 shadow-lg transition-all duration-300 hover:from-red-600 hover:to-orange-700 hover:shadow-xl sm:w-auto"
                      >
                        <Star className="mr-2 h-4 w-4" />
                        Add to Favorites
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.section>

          {/* Detailed Information */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="grid gap-8 lg:grid-cols-3">
                {/* Specifications */}
                {car.specifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full border-0 bg-gradient-to-br from-card/50 to-card/20 shadow-xl backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-primary" />
                          <h3 className="text-xl font-semibold">Specifications</h3>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {car.specifications.dimensions && (
                          <div>
                            <h4 className="mb-2 font-semibold">Dimensions</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {car.specifications.dimensions.length && (
                                <div>Length: {car.specifications.dimensions.length}</div>
                              )}
                              {car.specifications.dimensions.width && (
                                <div>Width: {car.specifications.dimensions.width}</div>
                              )}
                              {car.specifications.dimensions.height && (
                                <div>Height: {car.specifications.dimensions.height}</div>
                              )}
                              {car.specifications.dimensions.wheelbase && (
                                <div>Wheelbase: {car.specifications.dimensions.wheelbase}</div>
                              )}
                            </div>
                          </div>
                        )}
                        {car.specifications.performance && (
                          <div>
                            <h4 className="mb-2 font-semibold">Performance</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {car.specifications.performance.acceleration && (
                                <div>0-100 km/h: {car.specifications.performance.acceleration}</div>
                              )}
                              {car.specifications.performance.topSpeed && (
                                <div>Top Speed: {car.specifications.performance.topSpeed}</div>
                              )}
                              {car.specifications.performance.fuelEconomy && (
                                <div>
                                  Fuel Economy: {car.specifications.performance.fuelEconomy}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Features & Technology */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-0 bg-gradient-to-br from-card/50 to-card/20 shadow-xl backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-semibold">Features & Technology</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="mb-2 font-semibold">Key Features</h4>
                        <div className="space-y-2">
                          {car.features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {car.specifications?.technology && (
                        <div>
                          <h4 className="mb-2 font-semibold">Technology</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {car.specifications.technology.map((tech, index) => (
                              <div key={index}>• {tech}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Maintenance & Stories */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-0 bg-gradient-to-br from-card/50 to-card/20 shadow-xl backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-semibold">Maintenance & Stories</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {car.maintenance && (
                        <div>
                          <h4 className="mb-2 font-semibold">Maintenance</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-500" />
                              <span>Last Service: {car.maintenance.lastService}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span>Next Service: {car.maintenance.nextService}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {car.stories && car.stories.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-semibold">Stories</h4>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {car.stories.map((story, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                                <span>{story}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </PageLayout>
  );
});
