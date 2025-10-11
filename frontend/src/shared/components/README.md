# Shared Components

This directory contains reusable components that should be used across the application to ensure consistency and prevent common issues.

## PageLayout Component

The `PageLayout` component is a **critical** component that should be used for all new pages to ensure the hamburger menu works correctly on mobile devices.

### Why Use PageLayout?

- **Prevents hamburger menu bugs**: Automatically handles mobile menu state management
- **Consistent navigation**: Ensures all pages have the same navigation behavior
- **Mobile responsiveness**: Guarantees mobile menu overlay works on all pages
- **Reduces boilerplate**: Eliminates the need to manually manage mobile menu state

### Usage

#### Basic Usage (Recommended)

```tsx
import { PageLayout } from '@/shared/components/page-layout';

export default function MyPage() {
  return (
    <PageLayout>
      <main className="container mx-auto p-8">
        <h1>My Page Content</h1>
        {/* Your page content here */}
      </main>
    </PageLayout>
  );
}
```

#### With Custom Styling

```tsx
import { PageLayout } from '@/shared/components/page-layout';

export default function MyPage() {
  return (
    <PageLayout className="custom-background-class">
      <main className="container mx-auto p-8">
        <h1>My Page Content</h1>
      </main>
    </PageLayout>
  );
}
```

#### Without Page Transitions

```tsx
import { PageLayout } from '@/shared/components/page-layout';

export default function MyPage() {
  return (
    <PageLayout showPageTransition={false}>
      <main className="container mx-auto p-8">
        <h1>My Page Content</h1>
      </main>
    </PageLayout>
  );
}
```

### What PageLayout Provides

1. **Mobile Menu State Management**: Automatically handles `isMobileMenuOpen` state
2. **Navigation Component**: Includes the main navigation with hamburger menu
3. **Enhanced Mobile Menu Overlay**: Provides comprehensive mobile menu with:
   - Authentication-aware navigation (shows different items for logged in/out users)
   - Home, Lifestyle, Dashboard (if authenticated), Login/Register (if not authenticated)
   - User welcome message for authenticated users
   - Smooth animations and transitions
   - Proper mobile responsiveness
4. **Consistent Background**: Applies the standard gradient background
5. **Page Transitions**: Optional smooth page transitions
6. **Responsive Design**: Ensures mobile responsiveness

### Migration Guide

If you have existing pages that don't use PageLayout, here's how to migrate:

#### Before (Problematic)

```tsx
export default function MyPage() {
  return (
    <PageTransition>
      <div className="from-background via-background to-muted/20 min-h-screen bg-gradient-to-br">
        <Navigation />
        <main>{/* content */}</main>
      </div>
    </PageTransition>
  );
}
```

#### After (Fixed)

```tsx
import { PageLayout } from '@/shared/components/page-layout';

export default function MyPage() {
  return (
    <PageLayout>
      <main>{/* content */}</main>
    </PageLayout>
  );
}
```

### Important Notes

- **Always use PageLayout for new pages** to prevent hamburger menu issues
- **Don't manually manage mobile menu state** - PageLayout handles this
- **Don't include Navigation or MobileMenuOverlay manually** - PageLayout includes them
- **The hamburger menu will work automatically** on all pages using PageLayout

### Troubleshooting

If the hamburger menu doesn't work on a page:

1. Check if the page is using `PageLayout`
2. Ensure no manual mobile menu state management is interfering
3. Verify the page doesn't have its own `Navigation` or `MobileMenuOverlay` components
4. Check that the page is wrapped in `PageLayout` at the top level

### Examples

See these pages for correct usage:

- `/app/dashboard/page.tsx` (migrated to use PageLayout)
- `/app/lifestyle/page.tsx` (can be migrated)
- `/app/login/page.tsx` (can be migrated)
- `/app/register/page.tsx` (can be migrated)
