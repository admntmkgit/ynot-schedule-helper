/**
 * Phase 6: Delete Modal Component
 * Secure delete for closed days
 */
import { useState, useEffect } from 'react';
import dayService from '../services/dayService';
import './DeleteModal.css';

function DeleteModal({ onClose, onSuccess }) {
    const [closedDays, setClosedDays] = useState([]);
    const [selectedDates, setSelectedDates] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadClosedDays();
    }, []);

    const loadClosedDays = async () => {
        try {
            const response = await dayService.getAllDays();
            const closed = response.filter(day => day.status === 'closed');
            setClosedDays(closed);
        } catch (err) {
            setError('Failed to load closed days');
            console.error('Error loading closed days:', err);
        }
    };

    const handleToggleDate = (date) => {
        setError('');
        setSelectedDay(null);
        setSelectedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
    };

    const loadSelectedDay = async (date) => {
        try {
            const response = await dayService.getDayByDate(date);
            setSelectedDay(response);
        } catch (err) {
            console.error('Error loading day:', err);
        }
    };

    const handleDelete = async () => {
        if (selectedDates.length === 0) {
            setError('Please select one or more closed days to delete');
            return;
        }

        if (!confirm('Schedule deletion for selected days? This will securely delete their files.')) {
            return;
        }

        setLoading(true);
        setError('');

        const results = [];
        for (const date of selectedDates) {
            try {
                await dayService.secureDelete(date, 'DELETE');
                results.push({ date, success: true });
            } catch (err) {
                results.push({ date, success: false, error: err?.data?.error || err.message || String(err) });
            }
        }

        setLoading(false);

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            setError('Some deletions failed: ' + failed.map(f => `${f.date}: ${f.error}`).join('; '));
            // reload list
            await loadClosedDays();
            return;
        }

        // Success for all
        if (onSuccess) onSuccess(results.map(r => r.date));
        onClose();
    };

    return (
        <div className="delete-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div className="delete-header">
                    <h2>Closed Day Delete</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="delete-warning">
                    <p><strong>WARNING:</strong> This action is IRREVERSIBLE!</p>
                </div>

                <div className="delete-form">
                    <div className="closed-days-field">
                        <span>Select Closed Days (multi-select):</span>
                        {closedDays.length === 0 ? (
                            <p className="info-message">No closed days available for deletion.</p>
                        ) : (
                            <div className="closed-days-list">
                                {closedDays.map(day => {
                                    const id = `delete-${day.date}`;
                                    return (
                                        <div key={day.date} className="closed-day-item">
                                            <input
                                                id={id}
                                                type="checkbox"
                                                checked={selectedDates.includes(day.date)}
                                                onChange={() => {
                                                    handleToggleDate(day.date);
                                                    if (!selectedDates.includes(day.date)) loadSelectedDay(day.date);
                                                }}
                                            />
                                            <label htmlFor={id} className="closed-day-label">{day.date} (Closed: {new Date(day.closed_at).toLocaleString()})</label>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {selectedDay && (
                        <div className="day-summary">
                            <h4>Day Summary:</h4>
                            <p>Date: {selectedDay.date}</p>
                            <p>Status: {selectedDay.status}</p>
                            <p>Technicians: {selectedDay.day_rows?.length || 0}</p>
                            <p>Created: {new Date(selectedDay.created_at).toLocaleString()}</p>
                            {selectedDay.closed_at && (
                                <p>Closed: {new Date(selectedDay.closed_at).toLocaleString()}</p>
                            )}
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <div className="delete-actions">
                        <button
                            className="btn-danger"
                            onClick={handleDelete}
                            disabled={selectedDates.length === 0 || loading}
                        >
                            {loading ? 'Deleting...' : 'Delete Selected'}
                        </button>
                        <button className="btn-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DeleteModal;
