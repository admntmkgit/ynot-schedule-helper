/**
 * Home Page Component
 * Main day management page
 */
import { useEffect, useContext, useState } from 'react';
import ActiveDayContext from '../context/ActiveDayContext';
import DayTable from '../components/DayTable';
import Sidebar from '../components/Sidebar';
import CloseDaySummaryModal from '../components/CloseDaySummaryModal';
import NewSeatingModal from '../components/NewSeatingModal';
import api from '../services/api';
import './HomePage.css';

function HomePage() {
    const { activeDay, closeDay, refreshActiveDay } = useContext(ActiveDayContext);
    const [showCloseDaySummary, setShowCloseDaySummary] = useState(false);
    const [endingDay, setEndingDay] = useState(false);
    const [showNewSeatingModal, setShowNewSeatingModal] = useState(false);
    const [prefilledTech, setPrefilledTech] = useState(null);
    const [prefilledService, setPrefilledService] = useState(null);

    useEffect(() => {
        // expose legacy globals for any remaining code that still reads them
        try { window.__activeDayDate = activeDay?.date || null; window.__reloadActiveDay = refreshActiveDay; } catch (e) {}
    }, [activeDay, refreshActiveDay]);

    const handleAddSeatingFromRecommendation = (techAlias, serviceName = null) => {
        if (!activeDay || activeDay.status !== 'open') {
            return;
        }

        // Find the tech row
        const techRow = activeDay.day_rows.find(row => row.tech_alias === techAlias);
        if (!techRow) {
            alert(`Tech ${techAlias} is not clocked in`);
            return;
        }

        setPrefilledTech(techRow);
        setPrefilledService(serviceName);
        setShowNewSeatingModal(true);
    };

    const handleEndDay = async () => {
        if (!activeDay || activeDay.status !== 'open') {
            return;
        }

        if (!confirm('Are you sure you want to end this day? This will activate the end-of-day checklist.')) {
            return;
        }

        setEndingDay(true);

        try {
            await api.post(`/days/${activeDay.date}/end-day/`);
            await refreshActiveDay();
        } catch (err) {
            console.error('Failed to end day:', err);
            alert(`Failed to end day: ${err.message}`);
        } finally {
            setEndingDay(false);
        }
    };

    const handleOpenCloseDaySummary = () => {
        setShowCloseDaySummary(true);
    };

    const handleDayClosed = async () => {
        await refreshActiveDay();
    };

    const isDayOpen = activeDay && activeDay.status === 'open';
    const isDayEnded = activeDay && activeDay.status === 'ended';
    const isDayClosed = activeDay && activeDay.status === 'closed';

    return (
        <div className="home-page">
            {!activeDay ? (
                <div className="day-selection">
                    <div className="welcome-card">
                        <h2>Day Management</h2>
                        <p>Select "New Day" or "Open Day" from the top navigation to begin.</p>
                    </div>
                </div>
            ) : (
                <div className="active-day">
                        {/* Day header moved to NavBar */}

                    <div className="day-content-with-sidebar">
                        <div className="day-content-main">
                            {isDayClosed && (
                                <div className="day-closed-banner">
                                    ⓘ This day is closed. All edits are disabled.
                                </div>
                            )}
                            <DayTable dayData={activeDay} onDayUpdate={refreshActiveDay} />
                        </div>
                        <Sidebar 
                            dayData={activeDay} 
                            onUpdate={refreshActiveDay} 
                            onAddSeating={handleAddSeatingFromRecommendation}
                        />
                    </div>
                </div>
            )}

            <CloseDaySummaryModal
                isOpen={showCloseDaySummary}
                onClose={() => setShowCloseDaySummary(false)}
                dayData={activeDay}
                onDayClosed={handleDayClosed}
            />

            {showNewSeatingModal && prefilledTech && activeDay && (
                <NewSeatingModal
                    tech={prefilledTech}
                    dayDate={activeDay.date}
                    dayStatus={activeDay.status}
                    prefilledService={prefilledService}
                    onClose={() => {
                        setShowNewSeatingModal(false);
                        setPrefilledTech(null);
                        setPrefilledService(null);
                    }}
                    onSuccess={async () => {
                        setShowNewSeatingModal(false);
                        setPrefilledTech(null);
                        setPrefilledService(null);
                        await refreshActiveDay();
                    }}
                />
            )}
        </div>
    );
}

export default HomePage;

