/**
 * Phase 10: User Service
 * API calls for user management and authentication
 */
import api from './api';

const userService = {
    /**
     * Get all users (names only, no PINs)
     */
    getUsers: () => api.get('/users/'),

    /**
     * Get user count (for initial setup check)
     */
    getUserCount: () => api.get('/users/count/'),

    /**
     * Create a new user
     * @param {Object} userData - { name, pin, pin_confirm }
     */
    createUser: (userData) => api.post('/users/', userData),

    /**
     * Update a user
     * @param {number} id - User ID
     * @param {Object} userData - { name, pin?, pin_confirm? }
     */
    updateUser: (id, userData) => api.put(`/users/${id}/`, userData),

    /**
     * Delete a user (soft delete - marks inactive)
     * @param {number} id - User ID
     */
    deleteUser: (id) => api.delete(`/users/${id}/`),

    /**
     * Login by PIN
     * @param {string} pin - User's PIN
     */
    login: (pin) => api.post('/auth/login/', { pin }),

    /**
     * Logout current user
     */
    logout: () => api.post('/auth/logout/', {}),

    /**
     * Get current logged-in user
     */
    getCurrentUser: () => api.get('/auth/me/'),

    /**
     * Quick switch to another user by PIN
     * @param {string} pin - User's PIN
     */
    quickSwitch: (pin) => api.post('/auth/switch/', { pin }),
};

export default userService;
