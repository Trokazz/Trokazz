"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Heart, PlusCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const fabVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, y: 20 },
};

const DesktopFab: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Hide FAB on specific pages (e.g., admin, auth, chat, make offer, report ad, boost ad, redeem, buy credits, professional setup, submit review, verification request, support ticket)
  const hideOnPaths = [
    '/admin', '/auth', '/chat', '/make-offer', '/report-ad', '/boost', '/redeem', '/buy-credits',
    '/onboarding/professional-setup', '/submit-review', '/profile/verify', '/support', '/profile/support-tickets'
  ];
  const shouldHideFab = hideOnPaths.some(path => location.pathname.startsWith(path));

  if (shouldHideFab) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 hidden md:flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={fabVariants}
            transition={{ staggerChildren: 0.1, duration: 0.2 }}
            className="flex flex-col items-end gap-3"
          >
            <motion.div variants={itemVariants}>
              <Button asChild className="w-auto px-4 py-2 rounded-full shadow-lg bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to="/sell" onClick={() => setIsOpen(false)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Publicar Anúncio
                </Link>
              </Button>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button asChild className="w-auto px-4 py-2 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600 text-white">
                <Link to={user ? "/messages" : "/auth"} onClick={() => setIsOpen(false)}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Mensagens
                </Link>
              </Button>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button asChild className="w-auto px-4 py-2 rounded-full shadow-lg bg-red-500 hover:bg-red-600 text-white">
                <Link to={user ? "/profile/favorites" : "/auth"} onClick={() => setIsOpen(false)}>
                  <Heart className="mr-2 h-4 w-4" /> Favoritos
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
          isOpen ? "bg-primary hover:bg-primary/90 rotate-45" : "bg-accent hover:bg-accent/90"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plus className="h-6 w-6 text-white" />
        <span className="sr-only">Toggle FAB</span>
      </Button>
    </div>
  );
};

export default DesktopFab;