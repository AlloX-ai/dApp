import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { apiCall } from "../utils/api";
import { useAuth } from "./useAuth";

// Module-level cache so multiple components (PortfolioPage header badge,
// Points page "Create Portfolio" card, the shared PortfolioInfoModal) can
// share a single in-flight request and the most recent response without
// hammering /gems/status on every mount.
let cachedStatus = null;
let lastFetchedAt = 0;
let inFlight = null;

const CACHE_MS = 30_000;

export const fetchGemsStatus = async (force = false) => {
  if (!force && cachedStatus && Date.now() - lastFetchedAt < CACHE_MS) {
    return cachedStatus;
  }
  if (inFlight) return inFlight;
  inFlight = apiCall("/gems/status")
    .then((res) => {
      cachedStatus = res;
      lastFetchedAt = Date.now();
      return res;
    })
    .catch((err) => {
      throw err;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
};

export const fetchGemsTiers = async () => {
  return apiCall("/gems/tiers");
};

export const clearGemsStatusCache = () => {
  cachedStatus = null;
  lastFetchedAt = 0;
};

export const useGemsStatus = () => {
  const { token } = useAuth();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const [status, setStatus] = useState(cachedStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!token) return null;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchGemsStatus(true);
      setStatus(next);
      return next;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus(null);
      clearGemsStatusCache();
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGemsStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, isConnected]);

  return { status, loading, error, refresh };
};
