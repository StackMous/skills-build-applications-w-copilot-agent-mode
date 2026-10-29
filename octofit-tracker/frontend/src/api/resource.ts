import { useEffect, useState } from 'react';
import { getJson } from './client.js';

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export function useApiResource<T>(path: string, label: string, reloadKey = 0): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    getJson<T>(path)
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        if (active) setState({ status: 'error', message: `Unable to load ${label}: ${detail}` });
      });

    return () => { active = false; };
  }, [path, label, reloadKey]);

  return state;
}