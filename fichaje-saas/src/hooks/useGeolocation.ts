import { useCallback, useEffect, useState } from "react";
import { getCurrentPosition, type Coords } from "@/lib/geo";

export type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; coords: Coords }
  | { status: "denied" }
  | { status: "unavailable" };

/**
 * Hook ligero sobre navigator.geolocation que pide permisos bajo demanda.
 */
export function useGeolocation(autoRequest = false) {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  const request = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable" });
      return null;
    }
    setState({ status: "loading" });
    const coords = await getCurrentPosition();
    if (!coords) {
      setState({ status: "denied" });
      return null;
    }
    setState({ status: "ok", coords });
    return coords;
  }, []);

  useEffect(() => {
    if (autoRequest) {
      request();
    }
  }, [autoRequest, request]);

  return { state, request };
}
