/**
 * Phase 9.4: Quick Action Bar Component
 * Secondary navbar for rapid tech/seating workflow
 */
import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import './QuickActionBar.css';
import ActiveDayContext from '../context/ActiveDayContext';
import NewSeatingModal from './NewSeatingModal';
import SeatingModal from './SeatingModal';

function QuickActionBar() {
    const { activeDay, refreshActiveDay } = useContext(ActiveDayContext);
    const [techs, setTechs] = useState([]);
    const [selectedTech, setSelectedTech] = useState('');
    const [searchTech, setSearchTech] = useState('');
    const [showNewSeatingModal, setShowNewSeatingModal] = useState(false);
    const [prefilledTech, setPrefilledTech] = useState(null);
    const [openSeatingFilter, setOpenSeatingFilter] = useState('');
    const [showSeatingModal, setShowSeatingModal] = useState(false);
    const [selectedSeating, setSelectedSeating] = useState(null);
    const [elapsedTimes, setElapsedTimes] = useState({});
    const [servicesMap, setServicesMap] = useState({});
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const dropdownRef = useRef(null);

    // Load techs
    useEffect(() => {
        let mounted = true;
        const loadTechs = async () => {
            try {
                const resp = await fetch('/api/techs/');
                const data = await resp.json();
                if (!mounted) return;
                setTechs(data || []);
            } catch (err) {
                console.error('Failed to load techs:', err);
            }
        };
        loadTechs();
        return () => { mounted = false; };
    }, []);

    // Load services for short_name display
    useEffect(() => {
        let mounted = true;
        const loadServices = async () => {
            try {
                const resp = await fetch('/api/services/');
                const data = await resp.json();
                if (!mounted) return;
                const map = {};
                (data || []).forEach(s => {
                    map[s.name] = s.short_name || s.name;
                });
                setServicesMap(map);
            } catch (err) {
                console.error('Failed to load services:', err);
            }
        };
        loadServices();
        return () => { mounted = false; };
    }, []);

    // Calculate elapsed time for open seatings
    useEffect(() => {
        const updateElapsedTimes = () => {
            const now = new Date();
            const times = {};
            
            activeDay?.day_rows?.forEach(row => {
                row.seatings.forEach(seating => {
                    if (seating.value === 0) {
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
    }, [activeDay]);

    // Filter techs by search term
    const filteredTechs = useMemo(() => {
        if (!searchTech.trim()) return techs;
        const term = searchTech.toLowerCase();
        return techs.filter(tech => 
            tech.alias.toLowerCase().includes(term) || 
            (tech.name && tech.name.toLowerCase().includes(term))
        );
    }, [techs, searchTech]);

    // Collect all open seatings with tech info
    const openSeatings = useMemo(() => {
        if (!activeDay?.day_rows) return [];
        
        const seatings = [];
        activeDay.day_rows.forEach(row => {
            if (!row.is_active) return; // Skip clocked-out techs
            row.seatings.forEach(seating => {
                if (seating.value === 0) { // Open seating
                    // SeatingModal expects seating.tech.tech_alias and seating.tech.tech_name
                    seatings.push({
                        ...seating,
                        tech: {
                            tech_alias: row.tech_alias,
                            tech_name: row.tech_name,
                            row_number: row.row_number
                        }
                    });
                }
            });
        });
        
        // Sort by time created (oldest first)
        seatings.sort((a, b) => new Date(a.time) - new Date(b.time));
        
        return seatings;
    }, [activeDay]);

    // Filter open seatings by tech alias/name
    const filteredOpenSeatings = useMemo(() => {
        if (!openSeatingFilter.trim()) return openSeatings;
        const term = openSeatingFilter.toLowerCase();
        return openSeatings.filter(seating => 
            seating.tech.tech_alias.toLowerCase().includes(term) || 
            (seating.tech.tech_name && seating.tech.tech_name.toLowerCase().includes(term))
        );
    }, [openSeatings, openSeatingFilter]);



    const handleSeatingClick = (seating) => {
        // Set selected seating for Seat Closing Modal
        setSelectedSeating(seating);
        setShowSeatingModal(true);
    };

    const selectTech = (tech) => {
        const techRow = activeDay.day_rows.find(r => r.tech_alias === tech.alias && r.is_active);
        if (!techRow) {
            alert(`${tech.alias} is not clocked in.`);
            setSelectedTech('');
            setSearchTech('');
            setHighlightedIndex(-1);
            return;
        }
        setPrefilledTech(techRow);
        setShowNewSeatingModal(true);
        setSelectedTech('');
        setSearchTech('');
        setHighlightedIndex(-1);
    };

    const handleNewSeatingSuccess = async () => {
        setShowNewSeatingModal(false);
        setPrefilledTech(null);
        // Refresh active day to update UI
        await refreshActiveDay();
    };

    const handleSeatingModalSuccess = async () => {
        setShowSeatingModal(false);
        setSelectedSeating(null);
        // Refresh active day to update UI
        await refreshActiveDay();
    };

    const handleSeatingModalClose = () => {
        setShowSeatingModal(false);
        setSelectedSeating(null);
    };

    // Keyboard navigation for tech search dropdown
    const handleSearchKeyDown = (e) => {
        if (!filteredTechs || filteredTechs.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(i => (i < filteredTechs.length - 1 ? i + 1 : filteredTechs.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(i => (i > 0 ? i - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
            const tech = filteredTechs[idx];
            if (tech) selectTech(tech);
        } else if (e.key === 'Escape') {
            setSearchTech('');
            setHighlightedIndex(-1);
        }
    };

    // Enter key on quick close filter opens first matching seating
    const handleFilterKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOpenSeatings && filteredOpenSeatings.length > 0) {
                handleSeatingClick(filteredOpenSeatings[0]);
            }
        }
    };

    if (!activeDay) return null; // Only show when day is active

    return (
        <>
            <div className="quick-action-bar">
                <div className="quick-action-left">
                    {/* Tech lookup dropdown */}
                    <div className="tech-lookup">
                        <label className="tech-lookup-label">Quick New Seating</label>
                            <input
                                type="text"
                                placeholder="Search tech..."
                                value={searchTech}
                                onChange={(e) => { setSearchTech(e.target.value); setHighlightedIndex(-1); }}
                                onKeyDown={handleSearchKeyDown}
                                className="tech-search-input quick-input"
                            />
                        {searchTech.trim() && filteredTechs.length > 0 && (
                            <div className="tech-dropdown" ref={dropdownRef}>
                                {filteredTechs.map((tech, idx) => (
                                    <div
                                        key={tech.alias}
                                        className={`tech-option ${idx === highlightedIndex ? 'highlighted' : ''}`}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        onClick={() => selectTech(tech)}
                                    >
                                        {tech.alias} {tech.name ? `- ${tech.name}` : ''}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Open seatings filter */}
                    <div className="open-seatings-filter">
                        <label className="tech-lookup-label">Quick Close Seating</label>
                            <input
                                type="text"
                                placeholder="Filter open seatings..."
                                value={openSeatingFilter}
                                onChange={(e) => setOpenSeatingFilter(e.target.value)}
                                onKeyDown={handleFilterKeyDown}
                                className="filter-input quick-input"
                            />
                    </div>
                </div>

                {/* Open seatings panel */}
                <div className="open-seatings-panel">
                    {filteredOpenSeatings.length === 0 ? (
                        <div className="empty-state">
                            {openSeatingFilter.trim() ? 'No matching open seatings' : 'No open seatings'}
                        </div>
                    ) : (
                        <div className="seatings-list">
                            {filteredOpenSeatings.map(seating => (
                                <div
                                    key={seating.id}
                                    className="seating-item"
                                    onClick={() => handleSeatingClick(seating)}
                                    title="Click to close this seating"
                                >
                                    <div className="seating-tech">{seating.tech.tech_alias}</div>
                                    <div className="seating-service">
                                        {servicesMap[seating.service] || seating.service}
                                    </div>
                                    <div className="seating-time">
                                        {elapsedTimes[seating.id] || 0}m
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showNewSeatingModal && prefilledTech && (
                <NewSeatingModal
                    tech={prefilledTech}
                    dayDate={activeDay.date}
                    dayStatus={activeDay.status}
                    onClose={() => {
                        setShowNewSeatingModal(false);
                        setPrefilledTech(null);
                    }}
                    onSuccess={handleNewSeatingSuccess}
                />
            )}

            {showSeatingModal && selectedSeating && (
                <SeatingModal
                    seating={selectedSeating}
                    dayDate={activeDay.date}
                    dayStatus={activeDay.status}
                    onClose={handleSeatingModalClose}
                    onSuccess={handleSeatingModalSuccess}
                />
            )}
        </>
    );
}

export default QuickActionBar;
