/**
 * Layout Component
 * Main layout wrapper with navigation
 */
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import QuickActionBar from './QuickActionBar';
import { ActiveDayProvider } from '../context/ActiveDayContext';

function Layout() {
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

export default Layout;
