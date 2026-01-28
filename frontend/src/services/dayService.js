/**
 * Day Service
 * API calls for day management
 */
import api from './api';

const dayService = {
    /**
     * Get all days (metadata)
     */
    getAllDays: async () => {
        return await api.get('/days/');
    },

    /**
     * Get a specific day by date
     */
    getDayByDate: async (date) => {
        return await api.get(`/days/${date}/`);
    },

    /**
     * Create a new day
     */
    createDay: async (date) => {
        return await api.post('/days/', { date });
    },

    /**
     * Get list of available day dates
     */
    getAvailableDates: async () => {
        return await api.get('/days/available_dates/');
    },

    /**
     * Clock in a technician
     */
    clockIn: async (date, techAlias, techName = '') => {
        return await api.post(`/days/${date}/rows/clock-in/`, {
            tech_alias: techAlias,
            tech_name: techName
        });
    },

    /**
     * Clock out a technician
     */
    clockOut: async (date, techAlias) => {
        return await api.post(`/days/${date}/rows/clock-out/`, {
            tech_alias: techAlias
        });
    },

    /**
     * Toggle break status for a technician
     */
    toggleBreak: async (date, rowNumber) => {
        return await api.post(`/days/${date}/rows/${rowNumber}/toggle-break/`);
    },

    /**
     * Securely delete a closed day
     */
    secureDelete: async (date, confirmation) => {
        return await api.post(`/days/${date}/secure-delete/`, {
            confirmation
        });
    },

    /**
     * Create a new seating
     */
    createSeating: async (date, seatingData) => {
        return await api.post(`/days/${date}/seatings/`, seatingData);
    },

    /**
     * Update a seating (close it, edit details)
     */
    updateSeating: async (date, seatingId, updates) => {
        // Backend exposes seating update at a distinct path to avoid routing collisions
        return await api.put(`/days/${date}/seatings/${seatingId}/update/`, updates);
    },

    /**
     * Delete a seating
     */
    deleteSeating: async (date, seatingId) => {
        return await api.delete(`/days/${date}/seatings/${seatingId}/`);
    },
};

export default dayService;
