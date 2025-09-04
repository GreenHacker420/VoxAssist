'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface VoiceWaveformProps {
  active: boolean
}

export function VoiceWaveform({ active }: VoiceWaveformProps) {
  const [bars] = useState(Array.from({ length: 20 }, (_, i) => i))

  return (
    <div className="flex items-center justify-center h-32 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
      <div className="flex items-center space-x-1">
        {bars.map((bar) => (
          <div
            key={bar}
            className={cn(
              'w-1 bg-primary-600 rounded-full transition-all duration-300',
              active ? 'animate-wave' : 'h-2'
            )}
            style={{
              height: active ? `${Math.random() * 40 + 10}px` : '8px',
              animationDelay: `${bar * 0.1}s`,
              animationDuration: `${Math.random() * 0.5 + 1}s`
            }}
          />
        ))}
      </div>
      
      <div className="absolute">
        <div className={cn(
          'w-16 h-16 rounded-full border-4 border-primary-600 flex items-center justify-center',
          active && 'pulse-glow'
        )}>
          <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  )
}
