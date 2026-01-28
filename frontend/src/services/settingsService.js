/**
 * Settings Service
 * API calls for settings management
 */
import api from './api';

const settingsService = {
    /**
     * Get checklist configuration
     */
    getChecklists: async () => {
        return await api.get('/settings/checklists/');
    },

    /**
     * Update checklist configuration
     */
    updateChecklists: async (data) => {
        return await api.put('/settings/checklists/', data);
    },
    
    /**
     * Get day table settings
     */
    getDayTableSettings: async () => {
        return await api.get('/settings/day-table/');
    },

    /**
     * Update day table settings
     */
    updateDayTableSettings: async (data) => {
        return await api.put('/settings/day-table/', data);
    },

    /**
     * Get recommendation widget settings
     */
    getRecommendations: async () => {
        return await api.get('/settings/recommendations/');
    },

    /**
     * Update recommendation widget settings
     */
    updateRecommendations: async (data) => {
        return await api.put('/settings/recommendations/', data);
    },
};

export default settingsService;
