'use client';

import React from 'react';
import Link from 'next/link';
import { PageLayout } from '@/shared/components/page-layout';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

/**
 * Test component to verify mobile menu functionality
 * This component can be used to test the hamburger menu on different screen sizes
 */
export function MobileMenuTest() {
  return (
    <PageLayout>
      <main className="container mx-auto p-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Mobile Menu Test</CardTitle>
              <CardDescription>
                Test the hamburger menu functionality on mobile devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold">✅ What Should Work:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Hamburger menu button visible on mobile (md:hidden)</li>
                    <li>• Clicking hamburger opens full-screen overlay</li>
                    <li>• Menu shows appropriate items based on auth status</li>
                    <li>• Clicking outside overlay closes menu</li>
                    <li>• Clicking X button closes menu</li>
                    <li>• Clicking menu items navigates and closes menu</li>
                    <li>• Smooth animations and transitions</li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">📱 Test Instructions:</h3>
                  <ol className="space-y-1 text-sm text-muted-foreground">
                    <li>1. Resize browser to mobile width (&lt;768px)</li>
                    <li>2. Look for hamburger menu (☰) in top-right</li>
                    <li>3. Click hamburger menu button</li>
                    <li>4. Verify overlay appears with menu items</li>
                    <li>5. Test navigation and closing functionality</li>
                    <li>6. Test on actual mobile device</li>
                  </ol>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-2 font-semibold">🔧 Technical Details:</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <strong>Breakpoint:</strong> md:hidden (768px and below)
                  </p>
                  <p>
                    <strong>Z-index:</strong> z-[9999] for overlay
                  </p>
                  <p>
                    <strong>State Management:</strong> Automatic via PageLayout
                  </p>
                  <p>
                    <strong>Authentication:</strong> Dynamic menu based on auth status
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Different Pages</CardTitle>
              <CardDescription>
                Navigate to different pages to test hamburger menu consistency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href="/">Home</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/lifestyle">Lifestyle</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/register">Register</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageLayout>
  );
}
