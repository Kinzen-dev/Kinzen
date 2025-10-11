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
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function CarsPage() {
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
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <motion.section
          className="py-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="mx-auto max-w-4xl">
            <motion.div
              className="mb-6 inline-flex items-center rounded-full border bg-muted/50 px-4 py-2 text-sm"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Car className="mr-2 h-4 w-4 text-primary" />
              <span className="text-muted-foreground">My Car Collection</span>
            </motion.div>

            <motion.h1
              className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              My Own{' '}
              <span className="bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-transparent">
                Cars
              </span>
            </motion.h1>

            <motion.p
              className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Discover the cars I own, each with its own story, specifications, and the experiences
              that make them special to me.
            </motion.p>

            <motion.div
              className="flex flex-col gap-4 sm:flex-row sm:justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <Link href="/lifestyle">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Lifestyle
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* Cars Grid */}
        <motion.section
          className="py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">My Collection</h2>
            <p className="text-muted-foreground">
              {myCars.length} cars that represent my passion for automotive excellence
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
            {myCars.map((car, index) => (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1, duration: 0.6 }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl">
                  {/* Car Image Placeholder */}
                  <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Car className="h-16 w-16 text-gray-400" />
                    </div>
                    {car.favorite && (
                      <div className="absolute right-4 top-4">
                        <div className="rounded-full bg-red-500 p-2">
                          <Heart className="h-4 w-4 fill-white text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4">
                      <div className="rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                        {car.year}
                      </div>
                    </div>
                  </div>

                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl transition-colors group-hover:text-primary">
                          {car.name}
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-muted-foreground">
                          {car.make} {car.model}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Mileage</div>
                        <div className="font-semibold">{car.mileage.toLocaleString()} mi</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Description */}
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {car.description}
                    </p>

                    {/* Specifications */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <span>{car.horsepower} HP</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                        <span>{car.fuelType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{car.seating} Seats</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{car.location}</span>
                      </div>
                    </div>

                    {/* Key Features */}
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Key Features</h4>
                      <div className="flex flex-wrap gap-2">
                        {car.features.slice(0, 3).map((feature, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs"
                          >
                            {feature}
                          </span>
                        ))}
                        {car.features.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs">
                            +{car.features.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Purchase Info */}
                    <div className="flex items-center justify-between border-t pt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Purchased {new Date(car.purchaseDate).toLocaleDateString()}</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Collection Stats */}
        <motion.section
          className="py-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <Card className="bg-gradient-to-br from-muted/50 to-background">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Collection Statistics</CardTitle>
              <CardDescription>A quick overview of my automotive passion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{myCars.length}</div>
                  <div className="text-sm text-muted-foreground">Total Cars</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {myCars.reduce((sum, car) => sum + car.horsepower, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total HP</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {myCars.reduce((sum, car) => sum + car.mileage, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Miles</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {myCars.filter((car) => car.favorite).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Favorites</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Call to Action */}
        <motion.section
          className="py-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-3xl font-bold">Want to Know More?</h2>
            <p className="mb-8 text-muted-foreground">
              Each car has its own story and unique characteristics. Let me know if you'd like to
              learn more about any specific vehicle in my collection.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/lifestyle">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Lifestyle
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" className="w-full sm:w-auto">
                  <Star className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>
      </main>
    </PageLayout>
  );
}
