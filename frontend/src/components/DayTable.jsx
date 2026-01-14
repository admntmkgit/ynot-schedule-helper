/**
 * Day Table Component
 * Displays daily schedule with technicians and their seatings
 */
import { useState, useEffect, useRef } from 'react';
import NewSeatingModal from './NewSeatingModal';
import SeatingModal from './SeatingModal';
import TechProfile from './TechProfile';
import TechTimeDropdown from './TechTimeDropdown';
import './DayTable.css';
import { settingsService } from '../services';

function DayTable({ dayData, onDayUpdate }) {
    const [showNewSeatingModal, setShowNewSeatingModal] = useState(false);
    const [selectedTech, setSelectedTech] = useState(null);
    const [showSeatingModal, setShowSeatingModal] = useState(false);
    const [selectedSeating, setSelectedSeating] = useState(null);
    const [showTechProfile, setShowTechProfile] = useState(false);
    const [showTechTime, setShowTechTime] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [elapsedTimes, setElapsedTimes] = useState({});
    const [displayName, setDisplayName] = useState(true);
    const [displayTurns, setDisplayTurns] = useState(false);
    const [servicesMap, setServicesMap] = useState({});
    const [servicesInfo, setServicesInfo] = useState({});
    const clickTimerRef = useRef(null);
    
    const SEATINGS_PER_PAGE = 11;

    // Calculate elapsed time for open seatings every minute
    useEffect(() => {
        const updateElapsedTimes = () => {
            const now = new Date();
            const times = {};
            
            dayData?.day_rows?.forEach(row => {
                    row.seatings.forEach(seating => {
                        if (seating.value === 0) {
                            // Parse seating time robustly. If the stored time lacks timezone
                            // information, assume it's UTC (legacy files) and append 'Z'.
                            const raw = seating.time || '';
                            const hasTZ = /Z$|[+\-]\d{2}:?\d{2}$/.test(raw);
                            const startTime = new Date(hasTZ ? raw : (raw + 'Z'));
                            const elapsed = Math.floor((now - startTime) / 60000); // minutes
                            times[seating.id] = elapsed;
                        }
                    });
                });
            
            setElapsedTimes(times);
        };

        updateElapsedTimes();
        const interval = setInterval(updateElapsedTimes, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [dayData]);

    // Load Day Table settings
    useEffect(() => {
        let mounted = true;
        const loadSettings = async () => {
            try {
                const data = await settingsService.getDayTableSettings();
                if (!mounted) return;
                setDisplayName(data.display_name ?? true);
                setDisplayTurns(data.display_turns ?? false);
            } catch (err) {
                // ignore - use defaults
            }
        };

        loadSettings();
        return () => { mounted = false; };
    }, []);

    // Load services map for short_name fallbacks
    useEffect(() => {
        let mounted = true;
        const loadServices = async () => {
            try {
                const resp = await fetch('/api/services/');
                const data = await resp.json();
                if (!mounted) return;
                const map = {};
                const info = {};
                (data || []).forEach(s => {
                    map[s.name] = s.short_name || '';
                    info[s.name] = { time_needed: s.time_needed || 0 };
                });
                setServicesMap(map);
                setServicesInfo(info);
            } catch (err) {
                // ignore
            }
        };

        loadServices();
        return () => { mounted = false; };
    }, []);

    // Handlers for UI interactions (open modals)
    const handleNewSeating = (row) => {
        setSelectedTech(row);
        setShowNewSeatingModal(true);
    };

    const handleSeatingClick = (seating, tech) => {
        // seating objects stored in day data don't include the enclosing tech info.
        // SeatingModal expects `seating.tech.tech_alias` and `seating.tech.tech_name`,
        // so attach the tech object before opening the modal.
        setSelectedSeating({ ...seating, tech });
        setShowSeatingModal(true);
    };

    const handleTechClick = (row) => {
        setSelectedTech(row);
        // Open the Tech Time modal (clock/break) instead of profile
        setShowTechTime(true);
    };

    const getSeatingColumnCount = () => {
        if (!dayData?.day_rows) return SEATINGS_PER_PAGE;
        const maxSeatings = Math.max(...dayData.day_rows.map(row => row.seatings.length), 0);
        return Math.max(SEATINGS_PER_PAGE, maxSeatings);
    };

    const computeRowSlots = (seatings, totalColumns) => {
        const slots = Array(totalColumns).fill(null);
        if (!seatings || seatings.length === 0) return slots;

        // Phase 9.2: Frontend computes visual placement from persisted seatings list
        // Regular turns: laid out left-to-right in their sequence
        // Bonus turns: laid out right-to-left in their sequence
        
        // Separate regular and bonus seatings while preserving order
        const regularSeatings = seatings.filter(s => s && !s.is_bonus);
        const bonusSeatings = seatings.filter(s => s && s.is_bonus);

        // Place regular seatings left-to-right
        let leftIndex = 0;
        regularSeatings.forEach(seating => {
            if (leftIndex < totalColumns) {
                slots[leftIndex] = seating;
                leftIndex++;
            }
        });

        // Place bonus seatings right-to-left
        let rightIndex = totalColumns - 1;
        bonusSeatings.forEach(seating => {
            if (rightIndex >= leftIndex) {
                slots[rightIndex] = seating;
                rightIndex--;
            }
        });

        return slots;
    };

    const getTotalPages = () => {
        const totalColumns = getSeatingColumnCount();
        return Math.ceil(totalColumns / SEATINGS_PER_PAGE);
    };

    const getVisibleSeatingIndices = () => {
        const startIndex = (currentPage - 1) * SEATINGS_PER_PAGE;
        const endIndex = startIndex + SEATINGS_PER_PAGE;
        return { startIndex, endIndex };
    };

    const handleSeatingSingleClick = (seating, tech) => {
        if (!seating) return;
        if (dayData.status !== 'open') return;
        // Only allow single-click to open close modal for OPEN seatings (value === 0)
        const isOpen = seating.value === 0;
        if (!isOpen) return; // Don't open modal for closed seatings on single-click
        // start a short timer; if double-click occurs, it'll clear this
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => {
            setSelectedSeating({ ...seating, tech });
            setShowSeatingModal(true);
            clickTimerRef.current = null;
        }, 220);
    };

    const handleSeatingDoubleClick = (seating, tech) => {
        if (!seating) return;
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
        }
        const isOpen = seating.value === 0;
        // Allow edit mode for open seatings on day open, or for closed seatings anytime (to edit penalty)
        if (isOpen && dayData.status !== 'open') return; // Can't edit open seatings if day is not open
        // open modal in edit mode
        setSelectedSeating({ ...seating, tech, editMode: true });
        setShowSeatingModal(true);
    };

    const renderSeatingCell = (seating, tech) => {
        if (!seating) return (
            <td key={Math.random()} className="seating-cell empty clickable" onDoubleClick={() => {
                if (tech.is_on_break || dayData.status !== 'open' || tech.is_active === false) return;
                handleNewSeating(tech);
            }} title="Double-click to add seating"></td>
        );

        const isOpen = seating.value === 0;
        const elapsed = elapsedTimes[seating.id] || 0;
        return (
            <td 
                key={seating.id} 
                className={`seating-cell ${isOpen ? 'open' : 'closed'} ${seating.is_requested ? 'requested' : 'walkin'} ${seating.is_bonus ? 'bonus' : 'regular'}`}
                onClick={(e) => { e.stopPropagation(); handleSeatingSingleClick(seating, tech); }}
                onDoubleClick={(e) => { e.stopPropagation(); handleSeatingDoubleClick(seating, tech); }}
                title={`${seating.service} - ${isOpen ? 'Open' : 'Closed'} - ${seating.is_requested ? 'Requested' : 'Walk-in'} - ${seating.is_bonus ? 'Bonus' : 'Regular'}`}
            >
                <div className="seating-content compact">
                    <div className="seating-compact-row">
                        {seating.is_requested && (
                            <span className="seating-requested-badge">R</span>
                        )}
                        {!isOpen && seating.has_value_penalty && (
                            <span className="seating-penalty">V</span>
                        )}
                        <span className="seating-shortname">{seating.short_name || servicesMap[seating.service] || seating.service}</span>
                        {isOpen ? (
                            (() => {
                                const svc = seating.service;
                                const info = servicesInfo[svc] || {};
                                const timeNeeded = seating.time_needed || info.time_needed || 0;
                                let elapsedClass = '';
                                if (timeNeeded > 0) {
                                    if (elapsed > timeNeeded) elapsedClass = 'elapsed-over';
                                    else if (elapsed > (timeNeeded * 0.75)) elapsedClass = 'elapsed-warning';
                                    else if (elapsed > (timeNeeded * 0.5)) elapsedClass = 'elapsed-caution';
                                }
                                return <span className={`seating-elapsed inline-elapsed ${elapsedClass}`}>{elapsed}m</span>;
                            })()
                        ) : (
                            <span className="seating-value inline-value">${seating.value}</span>
                        )}
                    </div>
                </div>
            </td>
        );
    };

    if (!dayData || !dayData.day_rows || dayData.day_rows.length === 0) {
        return (
            <div className="day-table-empty">
                <p>No technicians clocked in yet.</p>
                <p className="hint">Use Tech Time dropdown to clock in technicians.</p>
            </div>
        );
    }

    const totalColumns = getSeatingColumnCount();
    const { startIndex, endIndex } = getVisibleSeatingIndices();
    const totalPages = getTotalPages();

    // Prepare slots per row based on bonus/regular placement
    const preparedRows = dayData.day_rows.map(row => {
        return {
            ...row,
            slots: computeRowSlots(row.seatings || [], totalColumns),
        };
    });

    return (
        <div className="day-table-container">
            <div className="table-wrapper">
                <table className="day-table">
                    <thead>
                        <tr>
                            <th className="col-row-number">#</th>
                            <th className="col-tech-alias">Alias</th>
                                    {displayName && <th className="col-tech-name">Name</th>}
                            {/* action column removed per Phase 9.3 - double-click row number or empty cell to add seating */}
                            {Array.from({ length: Math.min(SEATINGS_PER_PAGE, getSeatingColumnCount() - startIndex) }).map((_, i) => (
                                <th key={i} className="col-seating">
                                    {startIndex + i + 1}
                                </th>
                            ))}
                                    {displayTurns && (
                                        <>
                                            <th className="col-turns">Reg Turns</th>
                                            <th className="col-turns">Bonus</th>
                                        </>
                                    )}
                        </tr>
                    </thead>
                    <tbody>
                        {preparedRows.map((row, rowIndex) => (
                            <tr key={row.row_number} className={`day-row ${rowIndex % 2 === 0 ? 'even' : 'odd'} ${row.is_on_break ? 'on-break' : ''} ${row.is_active === false ? 'inactive' : ''}`}>
                                <td className="col-row-number clickable" onDoubleClick={() => {
                                    if (row.is_on_break || dayData.status !== 'open' || row.is_active === false) return;
                                    handleNewSeating(row);
                                }}>{row.row_number}</td>
                                        <td 
                                            className="col-tech-alias clickable" 
                                            onDoubleClick={() => handleTechClick(row)}
                                            title="Double-click to view tech profile"
                                        >
                                            {row.tech_alias}
                                        </td>
                                        {displayName && (
                                            <td className="col-tech-name" title={row.tech_name}>{row.tech_name}</td>
                                        )}
                                {/* Action button removed - use double-click on row number or empty cell */}
                                {Array.from({ length: Math.min(SEATINGS_PER_PAGE, totalColumns - startIndex) }).map((_, i) => {
                                    const seatingIndex = startIndex + i;
                                    const seating = row.slots ? row.slots[seatingIndex] : null;
                                    return renderSeatingCell(seating, row);
                                })}
                                {displayTurns && (
                                    <>
                                        <td className="col-turns">{row.regular_turns}</td>
                                        <td className="col-turns">{row.bonus_turns}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="table-pagination">
                    <button 
                        className="btn-page"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        ← Previous
                    </button>
                    <span className="page-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        className="btn-page"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next →
                    </button>
                </div>
            )}

            <div className="table-legend">
                <div className="legend-item">
                    <span className="legend-box open"></span>
                    <span>Open</span>
                </div>
                <div className="legend-item">
                    <span className="legend-box closed"></span>
                    <span>Closed</span>
                </div>
                    <div className="legend-item">
                        <span className="legend-box regular"></span>
                        <span>Regular Turn</span>
                    </div>
                <div className="legend-item">
                    <span className="legend-box walkin"></span>
                    <span>Walk-in</span>
                </div>
                <div className="legend-item">
                    <span className="legend-box bonus"></span>
                    <span>Bonus</span>
                </div>
            </div>

            {/* New Seating Modal */}
            {showNewSeatingModal && selectedTech && (
                <NewSeatingModal
                    tech={selectedTech}
                    dayDate={dayData.date}
                    dayStatus={dayData.status}
                    onClose={() => {
                        setShowNewSeatingModal(false);
                        setSelectedTech(null);
                    }}
                    onSuccess={onDayUpdate}
                />
            )}

            {/* Seating Edit/Close/Delete Modal */}
            {showSeatingModal && selectedSeating && (
                <SeatingModal
                    seating={selectedSeating}
                    dayDate={dayData.date}
                    dayStatus={dayData.status}
                    onClose={() => {
                        setShowSeatingModal(false);
                        setSelectedSeating(null);
                    }}
                    onSuccess={onDayUpdate}
                    editMode={selectedSeating?.editMode === true}
                />
            )}

            {/* Tech Time Modal (opened via double-click on alias) */}
            {showTechTime && selectedTech && (
                <TechTimeDropdown
                    initialTechRow={selectedTech}
                    onClose={() => {
                        setShowTechTime(false);
                        setSelectedTech(null);
                    }}
                    onSuccess={onDayUpdate}
                />
            )}
        </div>
    );
}

export default DayTable;
