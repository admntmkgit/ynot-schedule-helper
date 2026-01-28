/**
 * Phase 10: Auth Context
 * Manages user authentication state and session
 */
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { userService } from '../services';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasUsers, setHasUsers] = useState(null); // null = unknown, true/false = known

    /**
     * Check if any users exist in the system (for initial setup)
     */
    const checkHasUsers = useCallback(async () => {
        try {
            const result = await userService.getUserCount();
            setHasUsers(result.has_users);
            return result.has_users;
        } catch (err) {
            console.error('Failed to check user count:', err);
            return false;
        }
    }, []);

    /**
     * Fetch current user from session on mount
     */
    const fetchCurrentUser = useCallback(async () => {
        try {
            const user = await userService.getCurrentUser();
            if (user.logged_in) {
                setCurrentUser({ id: user.id, name: user.name });
            } else {
                setCurrentUser(null);
            }
        } catch (err) {
            console.error('Failed to fetch current user:', err);
            setCurrentUser(null);
        }
    }, []);

    /**
     * Initialize auth state on mount
     */
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await checkHasUsers();
            await fetchCurrentUser();
            setLoading(false);
        };
        init();
    }, [checkHasUsers, fetchCurrentUser]);

    /**
     * Login by PIN
     */
    const login = async (pin) => {
        const result = await userService.login(pin);
        setCurrentUser({ id: result.id, name: result.name });
        return result;
    };

    /**
     * Logout current user
     */
    const logout = async () => {
        await userService.logout();
        setCurrentUser(null);
    };

    /**
     * Quick switch to another user by PIN
     */
    const quickSwitch = async (pin) => {
        const result = await userService.quickSwitch(pin);
        setCurrentUser({ id: result.id, name: result.name });
        return result;
    };

    /**
     * Create first user (initial setup)
     */
    const createFirstUser = async (userData) => {
        const user = await userService.createUser(userData);
        // After creating first user, log them in
        await login(userData.pin);
        setHasUsers(true);
        return user;
    };

    /**
     * Refresh user list and current user state
     */
    const refresh = async () => {
        await checkHasUsers();
        await fetchCurrentUser();
    };

    const value = {
        currentUser,
        hasUsers,
        loading,
        login,
        logout,
        quickSwitch,
        createFirstUser,
        refresh,
        checkHasUsers,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
