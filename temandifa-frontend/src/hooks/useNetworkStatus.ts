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
    checkConnection();

    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    isConnected,
    isChecking,
    checkConnection,
  };
}
