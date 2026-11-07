"use client";

import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/api";

type FetchState<T> = { data?: T; error?: Error; loading: boolean };

export function useFetch<T>(path: string | null) {
  const [state, setState] = useState<FetchState<T>>({ loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    request<T>(path, { signal: ctrl.signal }).then(
      (data) => setState({ data, loading: false }),
      (error: Error) => {
        if (!ctrl.signal.aborted) setState((s) => ({ data: s.data, error, loading: false }));
      },
    );
    return () => ctrl.abort();
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((update: (data?: T) => T) => setState((s) => ({ data: update(s.data), loading: false })), []);
  return { ...state, reload, setData };
}
