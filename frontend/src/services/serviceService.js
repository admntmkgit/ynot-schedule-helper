/**
 * Service API Service
 * Handles all API calls related to services
 */
import api from './api';

export const serviceService = {
    /**
     * Get all services
     */
    async getAll() {
        return await api.get('/services/');
    },

    /**
     * Alias for getAll() - for consistency with other service methods
     */
    async getAllServices() {
        return await this.getAll();
    },

    /**
     * Get a specific service by name
     */
    async getByName(name) {
        // URL encode the name to handle special characters
        const encodedName = encodeURIComponent(name);
        return await api.get(`/services/${encodedName}/`);
    },

    /**
     * Create a new service
     */
    async create(serviceData) {
        return await api.post('/services/', serviceData);
    },

    /**
     * Update a service
     */
    async update(name, serviceData) {
        const encodedName = encodeURIComponent(name);
        return await api.put(`/services/${encodedName}/`, serviceData);
    },

    /**
     * Partially update a service
     */
    async partialUpdate(name, serviceData) {
        const encodedName = encodeURIComponent(name);
        return await api.patch(`/services/${encodedName}/`, serviceData);
    },

    /**
     * Delete a service
     */
    async delete(name) {
        const encodedName = encodeURIComponent(name);
        return await api.delete(`/services/${encodedName}/`);
    },

    /**
     * Get qualified techs for a service
     */
    async getQualifiedTechs(name) {
        const encodedName = encodeURIComponent(name);
        return await api.get(`/services/${encodedName}/techs/`);
    },

    /**
     * Update qualified techs for a service
     */
    async updateQualifiedTechs(name, techAliases) {
        const encodedName = encodeURIComponent(name);
        return await api.put(`/services/${encodedName}/techs/`, { 
            qualified_techs: techAliases 
        });
    },
    /**
     * Rename a service
     */
    async rename(name, newName, time_needed, is_bonus) {
        const encodedName = encodeURIComponent(name);
        return await api.post(`/services/${encodedName}/rename/`, { new_name: newName, time_needed, is_bonus });
    },
};

export default serviceService;
