/**
 * Technician API Service
 * Handles all API calls related to technicians
 */
import api from './api';

export const technicianService = {
    /**
     * Get all technicians
     */
    async getAll() {
        return await api.get('/techs/');
    },

    /**
     * Get a specific technician by alias
     */
    async getByAlias(alias) {
        return await api.get(`/techs/${alias}/`);
    },

    /**
     * Create a new technician
     */
    async create(technicianData) {
        return await api.post('/techs/', technicianData);
    },

    /**
     * Update a technician
     */
    async update(alias, technicianData) {
        return await api.put(`/techs/${alias}/`, technicianData);
    },

    /**
     * Partially update a technician
     */
    async partialUpdate(alias, technicianData) {
        return await api.patch(`/techs/${alias}/`, technicianData);
    },

    /**
     * Delete a technician
     */
    async delete(alias) {
        return await api.delete(`/techs/${alias}/`);
    },

    /**
     * Get technician skills
     */
    async getSkills(alias) {
        return await api.get(`/techs/${alias}/skills/`);
    },

    /**
     * Update technician skills
     */
    async updateSkills(alias, skills) {
        return await api.put(`/techs/${alias}/skills/`, { skills });
    },
    /**
     * Rename a technician
     */
    async rename(alias, newAlias, name) {
        return await api.post(`/techs/${alias}/rename/`, { new_alias: newAlias, name });
    },
};

export default technicianService;
