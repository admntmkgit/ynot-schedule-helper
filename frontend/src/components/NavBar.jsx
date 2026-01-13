/**
 * Phase 5 & 6: Navigation Bar Component
 * Provides navigation between Options, Tech Time, and Delete features
 */
import { useState, useContext, useEffect } from 'react';
import './NavBar.css';
import OptionsModal from './OptionsModal';
import TechTimeDropdown from './TechTimeDropdown';
import DeleteModal from './DeleteModal';
import ActiveDayContext from '../context/ActiveDayContext';
import { dayService } from '../services';

function NavBar() {
    const [showOptions, setShowOptions] = useState(false);
    const [showTechTime, setShowTechTime] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showNewDay, setShowNewDay] = useState(false);
    const [showOpenDay, setShowOpenDay] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [availableDates, setAvailableDates] = useState([]);
    const [loadingDayAction, setLoadingDayAction] = useState(false);
    const [dayError, setDayError] = useState('');

    const { createDay, openDay } = useContext(ActiveDayContext);

    const handleTechTimeSuccess = () => {
        setShowTechTime(false);
    };

    const handleDeleteSuccess = (deletedDate) => {
        setShowDelete(false);
        alert(`Day ${deletedDate} has been permanently deleted.`);
    };

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
    }, []);

    const loadAvailableDates = async () => {
        try {
            const resp = await dayService.getAvailableDates();
            setAvailableDates(resp.dates || []);
        } catch (err) {
            console.error('Failed to load dates', err);
            setAvailableDates([]);
        }
    };

    const handleNewDay = async () => {
        if (!selectedDate) return setDayError('Select a date');
        setLoadingDayAction(true);
        setDayError('');
        try {
            const day = await createDay(selectedDate);
            setShowNewDay(false);
            setDayError('');
        } catch (err) {
            setDayError(err?.data?.error || err?.message || 'Failed to create day');
        } finally {
            setLoadingDayAction(false);
        }
    };

    const handleOpenDay = async (date) => {
        setLoadingDayAction(true);
        setDayError('');
        try {
            await openDay(date);
            setShowOpenDay(false);
        } catch (err) {
            setDayError(err?.data?.error || err?.message || 'Failed to open day');
        } finally {
            setLoadingDayAction(false);
        }
    };

    return (
        <>
            <nav className="navbar">
                <div className="navbar-brand">
                    <h1>Nail Salon Schedule Helper</h1>
                </div>
                <div className="navbar-menu">
                    <button
                        className="navbar-button"
                        onClick={() => setShowNewDay(true)}
                    >
                        New Day
                    </button>
                    <button
                        className="navbar-button"
                        onClick={() => {
                            setShowOpenDay(true);
                            loadAvailableDates();
                        }}
                    >
                        Open Day
                    </button>
                    <button 
                        className="navbar-button"
                        onClick={() => setShowOptions(true)}
                    >
                        Options
                    </button>
                    <button 
                        className="navbar-button"
                        onClick={() => setShowTechTime(!showTechTime)}
                    >
                        Tech Time
                    </button>
                    <button 
                        className="navbar-button navbar-button-danger"
                        onClick={() => setShowDelete(true)}
                    >
                        Delete Day
                    </button>
                </div>
            </nav>

            {showOptions && <OptionsModal onClose={() => setShowOptions(false)} />}
            {showTechTime && (
                <TechTimeDropdown 
                    onClose={() => setShowTechTime(false)} 
                    onSuccess={handleTechTimeSuccess}
                />
            )}
            {showDelete && (
                <DeleteModal 
                    onClose={() => setShowDelete(false)}
                    onSuccess={handleDeleteSuccess}
                />
            )}

            {/* New Day Modal */}
            {showNewDay && (
                <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowNewDay(false); }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Day</h3>
                            <button className="close-btn" onClick={() => setShowNewDay(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label htmlFor="nav-new-day-date">Select Date:</label>
                                <input id="nav-new-day-date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                            </div>
                            {dayError && <div className="error-message">{dayError}</div>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowNewDay(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleNewDay} disabled={loadingDayAction}>{loadingDayAction ? 'Creating...' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Open Day Modal */}
            {showOpenDay && (
                <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowOpenDay(false); }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Open Existing Day</h3>
                            <button className="close-btn" onClick={() => setShowOpenDay(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {availableDates.length === 0 ? (
                                <p className="no-days-message">No days available.</p>
                            ) : (
                                <div className="days-list">
                                    {availableDates.map(d => (
                                        <button key={d} className="day-list-item" onClick={() => handleOpenDay(d)} disabled={loadingDayAction}>
                                            <span className="date">{d}</span>
                                            <span className="arrow">→</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {dayError && <div className="error-message">{dayError}</div>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowOpenDay(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default NavBar;
