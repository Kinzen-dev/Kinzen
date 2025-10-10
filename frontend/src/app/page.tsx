import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="z-10 w-full max-w-6xl items-center justify-between">
        {/* Hero Section */}
        <Card className="w-full mb-12 bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardHeader className="text-center">
            <CardTitle className="text-5xl font-bold mb-4">Welcome to Kinzen</CardTitle>
            <CardDescription className="text-xl">
              My personal digital universe - where I build everything that comes to mind
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">
                Register
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>💼 Professional Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Showcase my work, projects, and professional achievements
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>🚗 Car Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Interactive 3D gallery of cars I own with stories and specs
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>📈 US Stocks Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Real-time tracking and analysis of my investment portfolio
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>⚽ Manchester United</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Match stats, player analysis, and my personal commentary
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>📝 Personal Blog</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Life updates, thoughts, and experiences about everything
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>🎨 Creative Showcase</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Photography, art, and creative projects collection
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tech Stack Note */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle className="text-center">Built with Modern Tech Stack</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Next.js 15 • NestJS • TypeScript • PostgreSQL • Redis • Tailwind CSS • Docker • Kubernetes
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Clean Architecture • Domain-Driven Design • Production-Ready
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

