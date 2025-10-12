export interface Car {
  id: number;
  name: string;
  year: number;
  make: string;
  model: string;
  engine: string;
  horsepower: number;
  torque: number;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  seating: number;
  location: string;
  image: string;
  description: string;
  features: string[];
  purchaseDate: string;
  mileage: number;
  favorite: boolean;
  // Additional detailed information
  specifications?: {
    dimensions?: {
      length: string;
      width: string;
      height: string;
      wheelbase: string;
    };
    performance?: {
      acceleration: string;
      topSpeed: string;
      fuelEconomy: string;
    };
    safety?: string[];
    technology?: string[];
  };
  maintenance?: {
    lastService: string;
    nextService: string;
    serviceHistory: string[];
  };
  modifications?: string[];
  stories?: string[];
}

export const myCars: Car[] = [
  {
    id: 1,
    name: 'Mercedes-Benz CLS 300d',
    year: 2019,
    make: 'Mercedes-Benz',
    model: 'CLS 300d',
    engine: '2.0L Turbo Diesel I4',
    horsepower: 245,
    torque: 500,
    fuelType: 'Diesel',
    transmission: '9-Speed Automatic',
    drivetrain: 'RWD',
    seating: 5,
    location: 'Main Garage',
    image: '/cars/mercedes-cls-300d.jpg',
    description:
      'My elegant daily driver. The CLS combines luxury with efficiency, perfect for both city driving and long highway journeys.',
    features: [
      'AMG Line Package',
      'MBUX Infotainment',
      'Burmester Audio',
      'Air Suspension',
      'LED Headlights',
      'Panoramic Sunroof',
    ],
    purchaseDate: '2019-06-15',
    mileage: 45000,
    favorite: true,
    specifications: {
      dimensions: {
        length: '4,988 mm',
        width: '1,881 mm',
        height: '1,421 mm',
        wheelbase: '2,939 mm',
      },
      performance: {
        acceleration: '0-100 km/h in 6.4s',
        topSpeed: '250 km/h (limited)',
        fuelEconomy: '5.5L/100km combined',
      },
      safety: [
        'Active Brake Assist',
        'Blind Spot Assist',
        'Lane Keeping Assist',
        'Attention Assist',
        'Pre-Safe System',
      ],
      technology: [
        'MBUX Voice Control',
        'Mercedes Me Connect',
        'Wireless Charging',
        'Apple CarPlay/Android Auto',
        '360° Camera',
      ],
    },
    maintenance: {
      lastService: '2024-11-15',
      nextService: '2025-05-15',
      serviceHistory: [
        '2024-11-15: Annual service, oil change, brake inspection',
        '2024-05-15: Tire rotation, air filter replacement',
        '2023-11-15: Major service, transmission fluid change',
      ],
    },
    modifications: ['Custom floor mats', 'Window tinting', 'Ceramic coating'],
    stories: [
      'Perfect companion for business trips - the diesel engine provides excellent fuel economy on long highway drives.',
      'The Burmester audio system makes every commute feel like a concert hall experience.',
      'The panoramic sunroof is perfect for weekend drives through scenic routes.',
    ],
  },
  {
    id: 2,
    name: 'Isuzu MU-X',
    year: 2025,
    make: 'Isuzu',
    model: 'MU-X',
    engine: '3.0L Turbo Diesel I4',
    horsepower: 190,
    torque: 450,
    fuelType: 'Diesel',
    transmission: '6-Speed Automatic',
    drivetrain: '4WD',
    seating: 7,
    location: 'Driveway',
    image: '/cars/isuzu-mux.jpg',
    description:
      'My adventure companion and family hauler. Perfect for weekend getaways and off-road adventures with its robust 4WD system.',
    features: [
      '4WD System',
      'Hill Descent Control',
      'Traction Control',
      '7-Seat Configuration',
      'Towing Package',
      'All-Terrain Tires',
      'Roof Rails',
    ],
    purchaseDate: '2025-01-20',
    mileage: 2500,
    favorite: true,
    specifications: {
      dimensions: {
        length: '4,825 mm',
        width: '1,860 mm',
        height: '1,840 mm',
        wheelbase: '2,845 mm',
      },
      performance: {
        acceleration: '0-100 km/h in 12.5s',
        topSpeed: '180 km/h',
        fuelEconomy: '8.5L/100km combined',
      },
      safety: [
        'Electronic Stability Control',
        'Hill Start Assist',
        'Anti-lock Braking System',
        'Electronic Brake Distribution',
        'Rear Parking Sensors',
      ],
      technology: [
        'Apple CarPlay/Android Auto',
        'Bluetooth Connectivity',
        'USB Ports',
        'Climate Control',
        'Keyless Entry',
      ],
    },
    maintenance: {
      lastService: '2025-01-20',
      nextService: '2025-07-20',
      serviceHistory: ['2025-01-20: Pre-delivery inspection', '2025-01-20: Initial service check'],
    },
    modifications: ['All-terrain tires', 'Roof rack installation', 'Towing hitch'],
    stories: [
      'Brand new addition to the family! Perfect for our upcoming camping trips.',
      'The 7-seat configuration is ideal for family outings with friends.',
      'The 4WD system gives me confidence for any adventure, rain or shine.',
    ],
  },
  {
    id: 3,
    name: 'Suzuki Swift',
    year: 2020,
    make: 'Suzuki',
    model: 'Swift',
    engine: '1.2L Naturally Aspirated I4',
    horsepower: 90,
    torque: 120,
    fuelType: 'Gasoline',
    transmission: '5-Speed Manual',
    drivetrain: 'FWD',
    seating: 5,
    location: 'Street Parking',
    image: '/cars/suzuki-swift.jpg',
    description:
      'My nimble city car and fuel-efficient commuter. Perfect for navigating tight city streets and parking spaces.',
    features: [
      'Manual Transmission',
      'Fuel Efficient',
      'Compact Design',
      'Easy Parking',
      'Low Maintenance',
      'City-Friendly Size',
    ],
    purchaseDate: '2020-03-10',
    mileage: 32000,
    favorite: false,
    specifications: {
      dimensions: {
        length: '3,840 mm',
        width: '1,735 mm',
        height: '1,490 mm',
        wheelbase: '2,450 mm',
      },
      performance: {
        acceleration: '0-100 km/h in 11.9s',
        topSpeed: '165 km/h',
        fuelEconomy: '4.8L/100km combined',
      },
      safety: [
        'Dual Airbags',
        'Anti-lock Braking System',
        'Electronic Brake Distribution',
        'Hill Hold Control',
        'Rear Parking Sensors',
      ],
      technology: [
        'Bluetooth Audio',
        'USB Port',
        'Steering Wheel Controls',
        'Digital Clock',
        'Central Locking',
      ],
    },
    maintenance: {
      lastService: '2024-10-15',
      nextService: '2025-04-15',
      serviceHistory: [
        '2024-10-15: Regular service, oil change, brake pads',
        '2024-04-15: Tire replacement, air filter',
        '2023-10-15: Major service, timing belt',
        '2023-04-15: Regular service, spark plugs',
      ],
    },
    modifications: ['Custom seat covers', 'Phone mount', 'Dash cam installation'],
    stories: [
      'My trusty city companion - never fails to find a parking spot in the tightest spaces.',
      'The manual transmission keeps driving engaging even in city traffic.',
      'Incredibly fuel-efficient - perfect for daily commuting without breaking the bank.',
    ],
  },
];

export function getCarById(id: number): Car | undefined {
  return myCars.find((car) => car.id === id);
}

export function getCarBySlug(slug: string): Car | undefined {
  return myCars.find((car) => {
    const carSlug = `${car.make.toLowerCase()}-${car.model.toLowerCase().replace(/\s+/g, '-')}`;
    return carSlug === slug;
  });
}

export function getAllCars(): Car[] {
  return myCars;
}
