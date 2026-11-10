import { useCallback, useEffect, useState } from "react";
import { storage } from "../shared/storage";
import type { Connection, HistoryItem, Settings } from "../shared/types";

/** Popup state mirrored from chrome.storage.local (also updates when the background writes). */
export function useExtensionState() {
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState<Connection | undefined>();
  const [settings, setSettingsState] = useState<Settings | undefined>();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const reload = useCallback(async () => {
    const [c, s, h] = await Promise.all([
      storage.getConnection(),
      storage.getSettings(),
      storage.getHistory(),
    ]);
    setConnection(c);
    setSettingsState(s);
    setHistory(h);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void reload();
    const onChanged = (_: unknown, area: string) => {
      if (area === "local") void reload();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [reload]);

  const setSettings = useCallback((next: Settings) => {
    setSettingsState(next);
    void storage.setSettings(next);
  }, []);

  return { loaded, connection, settings, setSettings, history };
}
