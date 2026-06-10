import React, { createContext, useContext, useEffect, useState } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications_enabled');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });

  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  useEffect(() => {
    try {
      localStorage.setItem('notifications_enabled', enabled ? 'true' : 'false');
    } catch (e) {}
  }, [enabled]);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const status = await Notification.requestPermission();
      setPermission(status);
      return status === 'granted';
    }
    return false;
  };

  const toggleNotifications = async () => {
    if (!enabled) {
      // Toggle ON
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const granted = await requestPermission();
          if (granted) {
            setEnabled(true);
            triggerToast('🔔 Push Notifications Enabled!', 'success');
            try {
              new Notification('RedditGapFinder', {
                body: 'You will now receive real-time intelligence & analysis alerts!',
                icon: '/logo.svg'
              });
            } catch (err) {}
          } else {
            triggerToast('Permission denied. Please enable notifications in your browser settings.', 'error');
          }
        } else if (Notification.permission === 'granted') {
          setEnabled(true);
          triggerToast('🔔 Push Notifications Enabled!', 'success');
        } else {
          triggerToast('Browser blocked notifications. Reset site permissions in your URL bar.', 'error');
        }
      } else {
        triggerToast('Notifications are not supported in this browser.', 'error');
      }
    } else {
      // Toggle OFF
      setEnabled(false);
      triggerToast('🔕 Push Notifications Disabled', 'info');
    }
  };

  const triggerToast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
  };

  const sendNotification = (title, body, options = {}) => {
    if (enabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/logo.svg',
          ...options
        });
      } catch (e) {
        console.error('Failed to trigger notification:', e);
      }
    }
    // Always trigger the global in-app toast too so the visual experience is seamless!
    triggerToast(`${title}: ${body}`, 'success');
  };

  return (
    <NotificationContext.Provider value={{ enabled, permission, toggleNotifications, sendNotification, triggerToast }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
