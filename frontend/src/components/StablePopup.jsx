'use client';
import { useRef, useEffect, useState } from 'react';
import ServiceRecommendPopup from './ServiceRecommendPopup';

// Yeh component KABHI unmount nahi hoga
export default function StablePopup() {
  const [user, setUser] = useState({});
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    
    // localStorage se user lo — API call ki zaroorat nahi
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(u);
    } catch {
      setUser({});
    }
  }, []);

  return <ServiceRecommendPopup user={user} />;
}