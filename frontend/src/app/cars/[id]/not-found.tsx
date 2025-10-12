'use client';

import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { PageLayout } from '@/shared/components/page-layout';
import { Car, ArrowLeft, Home } from 'lucide-react';

export default function CarNotFound() {
  return (
    <PageLayout>
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-8 text-center">
          <div>
            <Car className="mx-auto mb-6 h-24 w-24 text-muted-foreground" />
            <h1 className="mb-4 text-4xl font-bold">Car Not Found</h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Sorry, we couldn't find the car you're looking for.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/cars">
              <Button size="lg" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Cars
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
