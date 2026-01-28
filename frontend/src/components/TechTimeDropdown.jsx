/**
 * Phase 5: Tech Time Dropdown Component
 * Clock in/out and break start/stop functionality
 */
import { useState, useEffect } from 'react';
import { technicianService } from '../services/technicianService';
import dayService from '../services/dayService';
import './TechTimeDropdown.css';

function TechTimeDropdown({ onClose, onSuccess, initialTechRow = null, initialTechAlias = null, initialTechName = '' }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [techs, setTechs] = useState([]);
    const [selectedTech, setSelectedTech] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dayData, setDayData] = useState(null);
    const [currentDate, setCurrentDate] = useState(null);

    useEffect(() => {
        loadTechs();
        // Prefer an explicitly opened day from the main UI if available
        const globalDay = typeof window !== 'undefined' ? window.__activeDayDate : null;
        if (globalDay) {
            loadDayData(globalDay).then(() => setCurrentDate(globalDay)).catch(() => findCurrentOpenDay());
        } else {
            findCurrentOpenDay();
        }
    }, []);

    const findCurrentOpenDay = async () => {
        try {
            // Get all days and find the most recent open one
            const response = await dayService.getAllDays();
            const openDays = response.filter(day => day.status === 'open');
            
            if (openDays.length > 0) {
                // Sort by date descending and get the most recent
                const mostRecent = openDays.sort((a, b) => 
                    new Date(b.date) - new Date(a.date)
                )[0];
                // Try to load the day data first; only set currentDate if load succeeds
                try {
                    await loadDayData(mostRecent.date);
                    setCurrentDate(mostRecent.date);
                } catch (e) {
                    // If the day file is missing or failed to load, remove from list and try next
                    console.warn('Failed to load most recent open day', mostRecent.date, e);
                    const remaining = openDays.filter(d => d.date !== mostRecent.date);
                    if (remaining.length > 0) {
                        const next = remaining.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                        try {
                            await loadDayData(next.date);
                            setCurrentDate(next.date);
                        } catch (e2) {
                            console.warn('Failed to load fallback open day', next.date, e2);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error finding open day:', err);
        }
    };

    const loadTechs = async () => {
        try {
            const response = await technicianService.getAll();
            setTechs(response || []);
        } catch (err) {
            setError('Failed to load technicians');
            console.error('Error loading techs:', err);
        }
    };

    const loadDayData = async (date) => {
        if (!date) return;
        try {
            const response = await dayService.getDayByDate(date);
            setDayData(response);
        } catch (err) {
            console.error('Error loading day data:', err);
        }
    };

    const filteredTechs = techs.filter(tech => 
        tech.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tech.name && tech.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getTechRow = (techAlias) => {
        if (!dayData || !dayData.day_rows) return null;
        // Return the row regardless of is_active so UI can show disabled state
        return dayData.day_rows.find(row => row.tech_alias === techAlias);
    };

    const isTechClockedIn = (techAlias) => {
        const row = getTechRow(techAlias);
        return !!row && !!row.is_active;
    };

    const getTechStatus = (tech) => {
        const row = getTechRow(tech.alias);
        if (!row) return 'Clocked Out';
        if (row.is_on_break) return 'On Break';
        return 'Clocked In';
    };

    const handleTechSelect = async (tech) => {
        setSelectedTech(tech);
        setError('');
        
        // Auto clock-in if not clocked in
        if (!isTechClockedIn(tech.alias) && currentDate) {
            setLoading(true);
            try {
                const response = await dayService.clockIn(currentDate, tech.alias, tech.name);
                // Success - notify parent and reload
                if (onSuccess) {
                    onSuccess(response);
                }
                // Trigger global reload of active day if available
                try {
                    if (typeof window !== 'undefined' && window.__reloadActiveDay) window.__reloadActiveDay();
                } catch (e) {}
                // Reload day data to show updated status
                await loadDayData(currentDate);
            } catch (err) {
                const errorMessage = err.data?.error || err.message || 'Clock-in failed';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        }
    };

    // If an initial row/alias was provided, preselect
    useEffect(() => {
        if (initialTechRow) {
            // initialTechRow is the day row object
            setSelectedTech({ alias: initialTechRow.tech_alias, name: initialTechRow.tech_name });
        } else if (initialTechAlias) {
            setSelectedTech({ alias: initialTechAlias, name: initialTechName });
        }
    }, [initialTechRow, initialTechAlias, initialTechName]);

    const handleAction = async (actionType) => {
        if (!actionType || !selectedTech) {
            setError('Please select a tech and an action');
            return;
        }

        if (!currentDate) {
            setError('No day is currently open');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let response;
            switch (actionType) {
                case 'clock-out':
                    response = await dayService.clockOut(currentDate, selectedTech.alias);
                    break;
                case 'break-start':
                case 'break-stop':
                    const row = getTechRow(selectedTech.alias);
                    if (!row) {
                        setError('Tech must be clocked in to toggle break');
                        setLoading(false);
                        return;
                    }
                    response = await dayService.toggleBreak(currentDate, row.row_number);
                    break;
                default:
                    setError('Invalid action');
                    setLoading(false);
                    return;
            }

            // Success - notify parent
            if (onSuccess) {
                onSuccess(response);
            }
            // Trigger global reload of active day if available
            try {
                if (typeof window !== 'undefined' && window.__reloadActiveDay) window.__reloadActiveDay();
            } catch (e) {}
            
            // Auto-dismiss modal after action
            onClose();
        } catch (err) {
            const errorMessage = err.data?.error || err.message || 'Operation failed';
            setError(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div className="tech-time-overlay" onMouseDown={onClose}>
            <div className="tech-time-dropdown" onMouseDown={(e) => e.stopPropagation()}>
                <h3>Tech Time</h3>
                
                {!currentDate && (
                    <div className="warning-message">
                        No day is currently open. Please open a day first.
                    </div>
                )}

                <div className="tech-search">
                    <input
                        type="text"
                        placeholder="Search tech by alias or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                {filteredTechs.length > 0 && (
                    <div className="tech-results">
                        {filteredTechs.map(tech => (
                            <div 
                                key={tech.alias} 
                                className={`tech-result-item ${selectedTech?.alias === tech.alias ? 'selected' : ''}`}
                                onClick={() => handleTechSelect(tech)}
                            >
                                <span className="tech-alias">{tech.alias}</span>
                                {tech.name && <span className="tech-name">- {tech.name}</span>}
                                {currentDate && (
                                    <span className={`tech-status ${getTechStatus(tech).toLowerCase().replace(' ', '-')}`}>
                                        [{getTechStatus(tech)}]
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="action-selector">
                    {/* Show contextual buttons based on selected tech status */}
                    {selectedTech && (
                        <div className="context-actions">
                            {(() => {
                                const row = getTechRow(selectedTech.alias);
                                const clockedIn = !!row && !!row.is_active;
                                const onBreak = row?.is_on_break;

                                return (
                                    <>
                                        {clockedIn && (
                                            <button 
                                                className="btn-warning" 
                                                onClick={() => handleAction('clock-out')} 
                                                disabled={loading || !currentDate}
                                            >
                                                {loading ? 'Processing...' : 'Clock Out'}
                                            </button>
                                        )}

                                        {clockedIn && !onBreak && (
                                            <button 
                                                className="btn-secondary" 
                                                onClick={() => handleAction('break-start')} 
                                                disabled={loading || !currentDate}
                                            >
                                                {loading ? 'Processing...' : 'Break Start'}
                                            </button>
                                        )}

                                        {clockedIn && onBreak && (
                                            <button 
                                                className="btn-secondary" 
                                                onClick={() => handleAction('break-stop')} 
                                                disabled={loading || !currentDate}
                                            >
                                                {loading ? 'Processing...' : 'Break Stop'}
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="tech-time-actions">
                    <button className="btn-secondary" onClick={onClose} disabled={loading}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TechTimeDropdown;
