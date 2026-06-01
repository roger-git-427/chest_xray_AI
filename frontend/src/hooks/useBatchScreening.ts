import { useCallback, useRef, useState } from 'react';
import { screenImageFromPath, type ScreeningResponse } from '../api/client';

export type BatchRow = {
  filename: string;
  response?: ScreeningResponse;
  error?: string;
};

export type BatchItemComplete = (
  filename: string,
  response: ScreeningResponse,
) => void;

export function useBatchScreening() {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const cancelRef = useRef(false);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const run = useCallback(
    async (
      folder: string,
      names: string[],
      conditions: string[],
      onItemComplete?: BatchItemComplete,
    ) => {
      if (!folder || names.length === 0 || conditions.length === 0) {
        return [];
      }

      cancelRef.current = false;
      setRunning(true);
      setTotal(names.length);
      setCurrent(0);
      setRows([]);

      const accumulated: BatchRow[] = [];

      for (let i = 0; i < names.length; i++) {
        if (cancelRef.current) break;

        const filename = names[i];
        setCurrent(i + 1);

        try {
          const response = await screenImageFromPath(folder, filename, conditions);
          accumulated.push({ filename, response });
          onItemComplete?.(filename, response);
        } catch {
          accumulated.push({ filename, error: 'screen' });
        }

        setRows([...accumulated]);
      }

      setRunning(false);
      return accumulated;
    },
    [],
  );

  const reset = useCallback(() => {
    setRows([]);
    setCurrent(0);
    setTotal(0);
    cancelRef.current = false;
  }, []);

  return {
    running,
    current,
    total,
    rows,
    run,
    cancel,
    reset,
  };
}
