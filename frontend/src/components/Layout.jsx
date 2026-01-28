/**
 * Layout Component
 * Main layout wrapper with navigation
 */
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import QuickActionBar from './QuickActionBar';
import InitialSetup from './InitialSetup';
import { ActiveDayProvider } from '../context/ActiveDayContext';
import { AuthProvider, useAuth } from '../context/AuthContext';

function LayoutContent() {
    const { hasUsers, loading, currentUser } = useAuth();

    // Show loading while checking for users
    if (loading) {
        return (
            <div className="app-layout loading-screen">
                <div className="loading-message">Loading...</div>
            </div>
        );
    }

    // Show initial setup if no users exist
    if (hasUsers === false) {
        return <InitialSetup />;
    }

    // Show login prompt if users exist but no one is logged in
    if (hasUsers === true && !currentUser) {
        return <InitialSetup />;
    }

    // Normal app layout
    return (
        <ActiveDayProvider>
            <div className="app-layout">
                <NavBar />
                <QuickActionBar />
                <main className="app-main">
                    <Outlet />
                </main>
                <footer className="app-footer">
                    <p>&copy; 2026 Nail Salon Schedule Helper</p>
                </footer>
            </div>
        </ActiveDayProvider>
    );
}

function Layout() {
    return (
        <AuthProvider>
            <LayoutContent />
        </AuthProvider>
    );
}

export default Layout;
