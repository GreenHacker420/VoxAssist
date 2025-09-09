'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { isAuthenticated, isLoading, enableDemoMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen landing-animated-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="py-6">
          <nav className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-100 to-gray-100 flex items-center justify-center premium-card">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-gray-900">VoxAssist</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  enableDemoMode();
                  router.push('/dashboard');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 ease-out link-underline hover-glow"
              >
                Try Demo
              </button>
              <Link
                href="/login"
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors link-underline hover-glow"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition-all duration-200 ease-out"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="py-20 text-center relative">
          {/* Minimal abstract hero illustration */}
          <div className="absolute inset-0 -z-10 element-3d opacity-70 pointer-events-none select-none">
            <svg
              className="absolute left-1/2 top-10 -translate-x-1/2 w-[720px] h-[360px] md:w-[900px] md:h-[420px]"
              viewBox="0 0 900 420"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <filter id="blur10" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
                </filter>
                <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              <g filter="url(#blur10)">
                <rect x="80" y="60" width="160" height="120" rx="16" stroke="url(#lg1)" strokeWidth="2" />
                <rect x="300" y="110" width="180" height="140" rx="18" stroke="#94a3b8" strokeOpacity="0.15" strokeWidth="2" />
                <rect x="540" y="50" width="160" height="120" rx="16" stroke="#3b82f6" strokeOpacity="0.12" strokeWidth="2" />
                <rect x="180" y="220" width="170" height="110" rx="14" stroke="#64748b" strokeOpacity="0.12" strokeWidth="2" />
                <rect x="430" y="230" width="210" height="120" rx="20" stroke="#60a5fa" strokeOpacity="0.10" strokeWidth="2" />
              </g>
            </svg>
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-900 tracking-tight hover-glow transition-colors duration-200">
            Build delightful
            <span className="gradient-text"> voice experiences</span>
          </h1>
          <p className="text-lg sm:text-xl text-premium-secondary mt-5 max-w-3xl mx-auto">
            A modern platform for AI-assisted calling. Clean analytics, real-time insights, and effortless integrations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/register"
              className="px-8 py-3 rounded-xl text-base font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 ease-out"
            >
              Start Free Trial
            </Link>
            <button
              onClick={() => {
                enableDemoMode();
                router.push('/dashboard');
              }}
              className="px-8 py-3 rounded-xl text-base font-medium text-gray-800 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 ease-out"
            >
              Try Demo Now
            </button>
          </div>
        </section>

        {/* Credibility / Logo bar */}
        <section className="pb-10 -mt-6">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-sm text-premium-secondary">Trusted by teams at</p>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 items-center justify-items-center">
              {[
                { name: 'Acme', w: 72 },
                { name: 'Base', w: 64 },
                { name: 'Capsule', w: 88 },
                { name: 'Echo', w: 64 },
                { name: 'Quartz', w: 80 },
              ].map((logo) => (
                <div key={logo.name} className="opacity-70 hover:opacity-90 transition-opacity duration-200">
                  <div className="h-8 flex items-center">
                    <svg
                      width={logo.w}
                      height="24"
                      viewBox="0 0 100 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect x="0" y="6" width="24" height="12" rx="3" fill="#e5e7eb" />
                      <text x="30" y="16" fontFamily="Inter, system-ui, sans-serif" fontSize="10" fill="#6b7280">
                        {logo.name}
                      </text>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Everything you need</h2>
            <p className="text-premium-secondary mt-2">Purposefully designed tooling to keep your operations sharp.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature card */}
            {[
              {
                title: 'Real-time Transcription',
                desc: 'Instant, accurate transcripts for every interaction.',
                color: 'text-blue-600',
                bg: 'bg-blue-100',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v8a3 3 0 01-3 3H7a3 3 0 01-3-3V2a1 1 0 011-1m0 0h10" />
                ),
              },
              {
                title: 'AI Analytics',
                desc: 'Clarity on sentiment, performance, and outcomes.',
                color: 'text-emerald-600',
                bg: 'bg-emerald-100',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                ),
              },
              {
                title: 'CRM Integration',
                desc: 'Seamless sync with Salesforce, HubSpot and more.',
                color: 'text-purple-600',
                bg: 'bg-purple-100',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                ),
              },
              {
                title: 'Campaign Management',
                desc: 'Create, schedule, and track outreach with ease.',
                color: 'text-blue-600',
                bg: 'bg-blue-100',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                ),
              },
              {
                title: 'Smart Scripts',
                desc: 'Adaptive prompts that guide conversations.',
                color: 'text-amber-600',
                bg: 'bg-amber-100',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                ),
              },
              {
                title: 'Real-time Monitoring',
                desc: 'Observe calls live with actionable insights.',
                color: 'text-rose-600',
                bg: 'bg-rose-100',
                icon: (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </>
                ),
              },
            ].map((f) => (
              <div key={f.title} className="premium-card rounded-xl p-6 border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.03] transition-transform duration-200 ease-out element-3d">
                <div className={`h-12 w-12 ${f.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <svg className={`h-6 w-6 ${f.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    {f.icon}
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 hover-glow transition-colors duration-200">{f.title}</h3>
                <p className="text-premium-secondary">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <div className="premium-chart rounded-2xl p-10 element-3d">
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Ready to get started?</h2>
            <p className="text-premium-secondary mt-2 max-w-2xl mx-auto">Join teams using VoxAssist to deliver consistent, high‑quality voice experiences.</p>
            <Link
              href="/register"
              className="mt-6 inline-block px-7 py-3 rounded-xl text-base font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 ease-out"
            >
              Start Your Free Trial
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
