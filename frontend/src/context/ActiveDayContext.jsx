import React, { createContext, useState, useEffect, useCallback } from 'react';
import { dayService } from '../services';

export const ActiveDayContext = createContext(null);

const STORAGE_KEY = 'activeDayDate';

export function ActiveDayProvider({ children }) {
    const [activeDay, setActiveDay] = useState(null);

    // helper to persist and sync legacy globals
    const applyActiveDay = useCallback((day) => {
        setActiveDay(day);
        try {
            if (day && day.date) {
                localStorage.setItem(STORAGE_KEY, day.date);
                window.__activeDayDate = day.date;
            } else {
                localStorage.removeItem(STORAGE_KEY);
                window.__activeDayDate = null;
            }
        } catch (e) {
            // ignore storage errors
        }
    }, []);

    // on mount try to restore persisted active day
    useEffect(() => {
        const stored = (() => {
            try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
        })();

        if (stored) {
            dayService.getDayByDate(stored)
                .then((day) => applyActiveDay(day))
                .catch(() => {
                    // cleanup if day cannot be loaded
                    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
                    applyActiveDay(null);
                });
        }
    }, [applyActiveDay]);

    const createDay = async (date) => {
        const day = await dayService.createDay(date);
        applyActiveDay(day);
        return day;
    };

    const openDay = async (date) => {
        const day = await dayService.getDayByDate(date);
        applyActiveDay(day);
        return day;
    };

    const refreshActiveDay = async () => {
        if (!activeDay) return null;
        try {
            const day = await dayService.getDayByDate(activeDay.date);
            applyActiveDay(day);
            return day;
        } catch (err) {
            console.error('Failed to refresh active day', err);
            return null;
        }
    };

    const closeDay = () => {
        applyActiveDay(null);
    };

    // keep legacy reload callback available (some components may still set it)
    useEffect(() => {
        try { window.__reloadActiveDay = refreshActiveDay; } catch (e) {}
        return () => { try { window.__reloadActiveDay = null; } catch (e) {} };
    }, [refreshActiveDay]);

    return (
        <ActiveDayContext.Provider value={{ activeDay, setActiveDay: applyActiveDay, createDay, openDay, refreshActiveDay, closeDay }}>
            {children}
        </ActiveDayContext.Provider>
    );
}

export default ActiveDayContext;
