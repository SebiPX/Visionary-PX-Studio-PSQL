import { useState, useEffect, useCallback } from 'react';
import { AppView } from '../types';

/**
 * A custom hook that syncs the AppView state with the browser's URL hash.
 * This enables the native browser "Back" button to work seamlessly
 * without unmounting components (preserving their state).
 */
export function useHashRouter(defaultView: AppView = AppView.DASHBOARD) {
  // Read initial view from hash if it exists and is a valid AppView, else default
  const getInitialView = (): AppView => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashVal = window.location.hash.replace('#', '');
      if (Object.values(AppView).includes(hashVal as AppView)) {
        return hashVal as AppView;
      }
    }
    return defaultView;
  };

  const [currentView, setCurrentViewState] = useState<AppView>(getInitialView);

  // When setting view manually (e.g. clicking navigation), update state AND push to history
  const setCurrentView = useCallback((view: AppView) => {
    setCurrentViewState(view);
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash.replace('#', '');
      // Only push state if the hash is actually changing to avoid history spam
      if (currentHash !== view) {
        window.history.pushState(null, '', `#${view}`);
      }
    }
  }, []);

  // Listen to the native 'popstate' (back/forward) events
  useEffect(() => {
    const handleHashChange = () => {
      const hashVal = window.location.hash.replace('#', '');
      if (Object.values(AppView).includes(hashVal as AppView)) {
        setCurrentViewState(hashVal as AppView);
      } else if (!window.location.hash) {
        // If hash is cleared, go to default
        setCurrentViewState(defaultView);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    // Initial setup: ensure the starting state is reflected in the URL
    // Use replaceState so we don't add an extra jump back
    if (typeof window !== 'undefined' && !window.location.hash) {
      window.history.replaceState(null, '', `#${currentView}`);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [defaultView, currentView]);

  return [currentView, setCurrentView] as const;
}
