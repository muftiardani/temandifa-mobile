import { useState, useEffect, useCallback } from "react";

/**
 * Simple network status hook using fetch to check connectivity
 * Note: Install @react-native-community/netinfo for more robust solution
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      // Try to fetch a known endpoint with a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch("https://www.google.com/generate_204", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkConnection();

    // Check periodically every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    isConnected,
    isChecking,
    checkConnection,
  };
}

/**
 * Hook to check if backend API is reachable
 */
export function useApiHealth() {
  const [isApiReachable, setIsApiReachable] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkApiHealth = useCallback(async () => {
    const API_URL =
      process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080/api/v1";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setIsApiReachable(response.ok);
      setLastChecked(new Date());
    } catch {
      setIsApiReachable(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    checkApiHealth();
  }, [checkApiHealth]);

  return {
    isApiReachable,
    lastChecked,
    checkApiHealth,
  };
}
