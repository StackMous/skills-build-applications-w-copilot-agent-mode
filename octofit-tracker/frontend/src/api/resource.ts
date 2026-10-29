import { useEffect, useState } from 'react';

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export function useApiResource<T>(path: string, label: string, loadJson: (path: string) => Promise<T>, reloadKey = 0): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    loadJson(path)
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        if (active) setState({ status: 'error', message: `Unable to load ${label}: ${detail}` });
      });

    return () => { active = false; };
  }, [path, label, loadJson, reloadKey]);

  return state;
}