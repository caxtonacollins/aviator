import { useCallback, useEffect, useState } from "react";
import { useProfile } from "@farcaster/auth-kit";

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp?: string;
  bio?: string;
}

export function useFarcasterAuth() {
  const [user, setUser] = useState<FarcasterUser>({
    fid: 0,
    username: "",
    displayName: "",
    pfp: "",
    bio: "",
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Farcaster user context
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        setIsLoading(true);
        // @ts-ignore - Check if running in Farcaster context
        if (window.farcaster) {
          const user = await useProfile();
          if (user) {
            setUser({
              fid: user.profile.fid || 0,
              username: user.profile.username || "",
              displayName: user.profile.displayName || user.profile.username || "",
              pfp: user.profile.pfpUrl,
              bio: user.profile.bio,
            });
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.warn("Farcaster auth not available in this context:", err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFarcaster();
  }, []);

  // Request user approval (if in iframe)
  const requestUserApproval = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // @ts-ignore
      if (window.farcaster?.requestUserApproval) {
        // @ts-ignore
        const result = await window.farcaster.requestUserApproval();
        if (result?.username) {
          setUser({
            fid: result.fid || 0,
            username: result.username,
            displayName: result.displayName || result.username,
            pfp: result.pfpUrl,
            bio: result.bio,
            });
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to get user approval";
      setError(errorMsg);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    requestUserApproval,
    farcasterUser: user,
  };
}

export default useFarcasterAuth;
