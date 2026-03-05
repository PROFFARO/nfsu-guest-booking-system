'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Calendar,
  Shield,
  Wifi,
  Clock,
  Star,
  ArrowRight,
  BedDouble,
  Users,
  MapPin,
} from 'lucide-react';

const features = [
  {
    icon: BedDouble,
    title: '78 Premium Rooms',
    description: 'Single and double rooms across 6 floors with modern amenities.',
  },
  {
    icon: Calendar,
    title: 'Instant Booking',
    description: 'Real-time availability with instant confirmation and flexible dates.',
  },
  {
    icon: Shield,
    title: 'Secure & Trusted',
    description: 'JWT-secured platform with role-based access for guests and staff.',
  },
  {
    icon: Wifi,
    title: 'Modern Amenities',
    description: 'WiFi, AC, gym access, TV, and more across all room types.',
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'Round-the-clock assistance for check-in, check-out, and more.',
  },
  {
    icon: MapPin,
    title: 'Prime Location',
    description: 'Located within NFSU campus, Gandhinagar with easy connectivity.',
  },
];

const stats = [
  { value: '78', label: 'Total Rooms' },
  { value: '6', label: 'Floors' },
  { value: '24/7', label: 'Support' },
  { value: '₹1500', label: 'Starting From' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin' || user.role === 'staff') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  // Don't render landing page for authenticated users
  if (loading || user) return null;

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        {/* Animated gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-background to-blue-600/10" />
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Star className="mr-1.5 h-3.5 w-3.5 text-yellow-500" />
              NFSU Guest House
            </Badge>

            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your Stay at{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Campus
              </span>
              , Redefined
            </h1>

            <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
              Premium accommodation for NFSU guests and visitors. Browse rooms, book
              instantly, and enjoy a comfortable stay with modern amenities.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                className="w-full sm:w-auto"
                variant="cta"
                size="lg"
                asChild
              >
                <Link href="/rooms">
                  Browse Rooms <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="mx-auto mt-20 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/40 bg-card/50 p-4 text-center backdrop-blur-sm"
              >
                <p className="text-2xl font-bold text-cyan-400">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold">Why CampusStay?</h2>
            <p className="text-muted-foreground">
              Everything you need for a comfortable and hassle-free stay.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="group h-full border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5">
                    <CardContent className="p-6">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10 transition-colors group-hover:from-cyan-500/20 group-hover:to-blue-600/20">
                        <Icon className="h-6 w-6 text-cyan-500" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl rounded-2xl border border-border/40 bg-gradient-to-br from-cyan-500/10 via-card to-blue-600/10 p-8 text-center sm:p-12"
          >
            <Building2 className="mx-auto mb-4 h-12 w-12 text-cyan-500" />
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Ready to Book?</h2>
            <p className="mb-6 text-muted-foreground">
              Explore our available rooms and secure your stay at NFSU Guest House today.
            </p>
            <Button
              variant="cta"
              size="lg"
              asChild
            >
              <Link href="/rooms">
                View All Rooms <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
