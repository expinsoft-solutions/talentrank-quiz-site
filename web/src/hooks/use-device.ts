'use client';

import { useState, useEffect } from 'react';

export type Device = 'desktop' | 'mobile' | 'tablet';

const MOBILE_MAX = 767;
const TABLET_MAX = 1023;

export function useDevice(): Device {
  const [device, setDevice] = useState<Device>('desktop');

  useEffect(() => {
    const update = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
      if (w <= MOBILE_MAX) setDevice('mobile');
      else if (w <= TABLET_MAX) setDevice('tablet');
      else setDevice('desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return device;
}
