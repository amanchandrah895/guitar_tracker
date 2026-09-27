"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./lib";

// App-wide settings served by GET /api/settings: how the instructor wants to be
// addressed, her note to the class, and the storage limits of the free tier.
export const DEFAULT_SETTINGS = {
  instructorName: "Ohila",
  instructorNote: "",
  limits: { videosPerStudent: 2, maxUploadMB: 100, maxMinutes: 10 },
};

// Developer credit shown across the app.
export const DEVELOPER = {
  name: "Aman",
  url: "https://amanchandrah.vercel.app",
  label: "amanchandrah.vercel.app",
};

const SettingsContext = createContext({ ...DEFAULT_SETTINGS, loaded: false, setSettings: () => {}, reloadSettings: async () => {} });

export function SettingsProvider({ children }) {
  const [state, setState] = useState({ ...DEFAULT_SETTINGS, loaded: false });

  const reloadSettings = useCallback(async () => {
    try {
      const d = await api("/api/settings");
      setState({
        instructorName: d.instructorName || DEFAULT_SETTINGS.instructorName,
        instructorNote: d.instructorNote || "",
        limits: { ...DEFAULT_SETTINGS.limits, ...(d.limits || {}) },
        loaded: true,
      });
    } catch {
      setState((s) => ({ ...s, loaded: true }));
    }
  }, []);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  const setSettings = useCallback((next) => {
    setState((s) => ({
      ...s,
      instructorName: next.instructorName || s.instructorName,
      instructorNote: next.instructorNote ?? s.instructorNote,
      limits: { ...s.limits, ...(next.limits || {}) },
    }));
  }, []);

  const value = useMemo(() => ({ ...state, setSettings, reloadSettings }), [state, setSettings, reloadSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

/** The instructor's display name, e.g. "Ohila". */
export const useInstructorName = () => useSettings().instructorName;

/** Possessive helper: "Ohila's", "James'". */
export const possessive = (name) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);
