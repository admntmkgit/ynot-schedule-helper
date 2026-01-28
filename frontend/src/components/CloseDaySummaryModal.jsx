/**
 * Close Day Summary Modal Component
 * Shows summary statistics and confirmation before closing a day
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import './CloseDaySummaryModal.css';

function CloseDaySummaryModal({ isOpen, onClose, dayData, onDayClosed }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [closing, setClosing] = useState(false);
    const [sortByRowId, setSortByRowId] = useState(true); // Default to row ID sort

    useEffect(() => {
        if (isOpen && dayData) {
            loadSummary();
        }
    }, [isOpen, dayData]);

    const loadSummary = async () => {
        if (!dayData) return;

        setLoading(true);
        setError(null);

        try {
            const data = await api.get(`/days/${dayData.date}/summary/`);
            // Store data as-is, sorting will be done in getSortedStats
            setSummary(data);
        } catch (err) {
            console.error('Failed to load summary:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getSortedStats = () => {
        if (!summary || !summary.tech_stats) return [];
        
        const stats = [...summary.tech_stats];
        
        if (sortByRowId) {
            // Sort by row_number from DayTable
            // Absent techs (row_number === null) should appear at the end
            stats.sort((a, b) => {
                if (a.row_number === null && b.row_number === null) {
                    // Both absent - sort by name
                    const aName = (a.tech_name && a.tech_name.trim()) ? a.tech_name.trim().toLowerCase() : (a.tech_alias || '').toLowerCase();
                    const bName = (b.tech_name && b.tech_name.trim()) ? b.tech_name.trim().toLowerCase() : (b.tech_alias || '').toLowerCase();
                    return aName.localeCompare(bName);
                }
                if (a.row_number === null) return 1; // a is absent, move to end
                if (b.row_number === null) return -1; // b is absent, move to end
                return a.row_number - b.row_number;
            });
        } else {
            // Sort by alias/name
            stats.sort((a, b) => {
                const aName = (a.tech_name && a.tech_name.trim()) ? a.tech_name.trim().toLowerCase() : (a.tech_alias || '').toLowerCase();
                const bName = (b.tech_name && b.tech_name.trim()) ? b.tech_name.trim().toLowerCase() : (b.tech_alias || '').toLowerCase();
                return aName.localeCompare(bName);
            });
        }
        
        return stats;
    };

    const calculateTotals = () => {
        if (!summary || !summary.tech_stats) return { totalValue: 0, totalAfterAdj: 0, totalAdj: 0 };
        
        const totalValue = summary.tech_stats.reduce((sum, tech) => sum + (tech.total_value_without_penalty || 0), 0);
        const totalAfterAdj = summary.tech_stats.reduce((sum, tech) => sum + (tech.total_value_with_penalty || 0), 0);
        const totalAdj = totalValue - totalAfterAdj;
        
        return { totalValue, totalAfterAdj, totalAdj };
    };

    const handleCloseDay = async () => {
        if (!dayData || !summary) return;

        // Check for validation issues
        if (!summary.all_seatings_closed) {
            alert('Cannot close day: Some seatings are still open');
            return;
        }

        if (!summary.end_day_checklist_complete) {
            alert('Cannot close day: End day checklist is not complete');
            return;
        }

        setClosing(true);
        setError(null);

        try {
            await api.post(`/days/${dayData.date}/close-day/`);
            
            // Notify parent that day was closed
            if (onDayClosed) {
                onDayClosed();
            }
            
            onClose();
        } catch (err) {
            console.error('Failed to close day:', err);
            setError(err.message);
        } finally {
            setClosing(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    const canCloseDay = summary && summary.all_seatings_closed && summary.end_day_checklist_complete;
    const isDayClosed = dayData && dayData.status === 'closed';
    const sortedStats = getSortedStats();
    const totals = calculateTotals();

    return (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content close-day-summary-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Close Day Summary</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="loading-summary">
                            Loading summary
                        </div>
                    ) : summary ? (
                        <>
                            {/* Validation Warnings */}
                            {(!summary.all_seatings_closed || !summary.end_day_checklist_complete) && (
                                <div className="validation-warnings">
                                    {!summary.all_seatings_closed && (
                                        <div className="validation-warning">
                                            Some seatings are still open. Close all seatings before closing the day.
                                        </div>
                                    )}
                                    {!summary.end_day_checklist_complete && (
                                        <div className="validation-warning">
                                            End day checklist is not complete. Complete all items before closing the day.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tech Statistics */}
                            <div className="summary-section">
                                <h3>Technician Summary</h3>
                                <table className="tech-stats-table">
                                    <thead>
                                        <tr>
                                            <th 
                                                onClick={() => setSortByRowId(!sortByRowId)}
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                                title="Click to toggle sort"
                                            >
                                                Technician {sortByRowId ? '(by Row #)' : '(by Name)'}
                                            </th>
                                            <th>Turns</th>
                                            <th>Value</th>
                                            <th>After Adjustment</th>
                                            <th>Adjustments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedStats.map((tech, index) => (
                                            <tr key={index} className={tech.is_absent ? 'absent-tech' : ''}>
                                                <td>
                                                    <div className="tech-alias">
                                                        {tech.tech_alias}
                                                        {tech.is_absent && <span className="absent-indicator">(Absent)</span>}
                                                    </div>
                                                    {tech.tech_name && (
                                                        <div className="tech-name">{tech.tech_name}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="turns-display">
                                                        <span className="turn-count">
                                                            <span className="turn-label">R:</span>
                                                            <span className="turn-value">{tech.regular_turns}</span>
                                                        </span>
                                                        <span className="turn-count">
                                                            <span className="turn-label">B:</span>
                                                            <span className="turn-value">{tech.bonus_turns}</span>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="value-without-adjustment">
                                                    ${tech.total_value_without_penalty}
                                                </td>
                                                <td className="value-after-adjustment">
                                                    ${tech.total_value_with_penalty}
                                                </td>
                                                <td>
                                                    {tech.penalty_count > 0 ? (
                                                        <span className="adjustment-indicator">
                                                            {tech.penalty_count} adjustment
                                                            {tech.penalty_count !== 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="totals-row">
                                            <td><strong>Totals</strong></td>
                                            <td></td>
                                            <td className="value-without-adjustment"><strong>${totals.totalValue}</strong></td>
                                            <td className="value-after-adjustment"><strong>${totals.totalAfterAdj}</strong></td>
                                            <td>
                                                {totals.totalAdj > 0 ? (
                                                    <span className="adjustment-indicator"><strong>-${totals.totalAdj}</strong></span>
                                                ) : (
                                                    <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Confirmation Section */}
                            {!isDayClosed && canCloseDay && (
                                <div className="confirmation-section">
                                    <p className="confirmation-text">
                                        You are about to close this day. Once closed:
                                    </p>
                                    <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                                        <li className="confirmation-text">All edits will be disabled</li>
                                        <li className="confirmation-text">The day cannot be reopened</li>
                                        <li className="confirmation-text">Data will be preserved for records</li>
                                    </ul>
                                    <p className="confirmation-warning">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            )}

                            {isDayClosed && (
                                <div className="info-section">
                                    <p className="info-text">
                                        This day has been closed. Summary is view-only.
                                    </p>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                <div className="modal-actions">
                    <button
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={closing}
                    >
                        {isDayClosed ? 'Close' : 'Cancel'}
                    </button>
                    {!isDayClosed && (
                        <button
                            className="btn-primary"
                            onClick={handleCloseDay}
                            disabled={!canCloseDay || closing}
                        >
                            {closing ? 'Closing Day...' : 'Close Day'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CloseDaySummaryModal;
