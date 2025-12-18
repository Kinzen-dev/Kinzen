'use client';

import Link from 'next/link';
import { X, Home, Heart, Gamepad2, User, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/hooks/use-auth';

interface MobileMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenuOverlay({ isOpen, onClose }: MobileMenuOverlayProps) {
  const { isAuthenticated, user } = useAuth();

  const menuItems = [
    {
      href: '/',
      label: 'Home',
      icon: Home,
      show: true,
    },
    {
      href: '/lifestyle',
      label: 'Lifestyle',
      icon: Heart,
      show: true,
    },
    {
      href: '/games',
      label: 'Games',
      icon: Gamepad2,
      show: true,
    },
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: User,
      show: isAuthenticated,
    },
    {
      href: '/login',
      label: 'Login',
      icon: LogIn,
      show: !isAuthenticated,
    },
    {
      href: '/register',
      label: 'Register',
      icon: UserPlus,
      show: !isAuthenticated,
    },
  ].filter((item) => item.show);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full w-full flex-col items-center justify-center bg-background">
              {/* Close button */}
              <div className="absolute right-4 top-4">
                <Button variant="ghost" size="icon" onClick={onClose} title="Close menu">
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* User info for authenticated users */}
              {isAuthenticated && user && (
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-8 text-center"
                >
                  <div className="mb-2 text-sm text-muted-foreground">Welcome back</div>
                  <div className="text-lg font-semibold">{user.firstName || user.email}</div>
                </motion.div>
              )}

              {/* Menu items - Centered */}
              <div className="flex flex-col items-center space-y-6">
                {menuItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                    >
                      <Link href={item.href} onClick={onClose}>
                        <Button
                          variant="ghost"
                          className="flex items-center space-x-3 px-8 py-4 text-xl font-medium"
                        >
                          <IconComponent className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Button>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
