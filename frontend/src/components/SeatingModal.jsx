/**
 * Seating Modal Component
 * Modal for editing, closing, or deleting a seating
 */
import { useState, useRef, useEffect } from 'react';
import { dayService } from '../services';
import './SeatingModal.css';

function SeatingModal({ seating, dayDate, dayStatus, onClose, onSuccess, editMode = false }) {
    const [value, setValue] = useState(seating.value || 0);
    const [hasValuePenalty, setHasValuePenalty] = useState(seating.has_value_penalty || false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [servicesList, setServicesList] = useState([]);
    const [editService, setEditService] = useState(seating.service || '');
    const [editIsRequested, setEditIsRequested] = useState(seating.is_requested || false);
    const inputRef = useRef(null);

    const isOpen = seating.value === 0;
    const isDayClosed = dayStatus === 'closed';

    const handleClose = async () => {
        if (isDayClosed) {
            setError('Cannot edit closed day');
            return;
        }

        if (value <= 0) {
            setError('Please enter a value greater than 0');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await dayService.updateSeating(dayDate, seating.id, {
                value: parseInt(value),
                has_value_penalty: hasValuePenalty,
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to close seating');
        } finally {
            setLoading(false);
        }
    };

    // Save edits (service / is_requested / short_name / time_needed)
    const handleSaveEdits = async () => {
        if (dayStatus === 'closed') {
            setError('Cannot edit closed day');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const updates = { is_requested: !!editIsRequested };
            if (editService) updates.service = editService;
            await dayService.updateSeating(dayDate, seating.id, updates);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to save edits');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (isDayClosed) {
            setError('Cannot edit closed day');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await dayService.deleteSeating(dayDate, seating.id);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to delete seating');
        } finally {
            setLoading(false);
        }
    };

    const toggleValuePenalty = async (checked) => {
        if (isDayClosed) {
            setError('Cannot edit closed day');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await dayService.updateSeating(dayDate, seating.id, { has_value_penalty: checked });
            setHasValuePenalty(checked);
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to update seating');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Sync state when seating prop changes (e.g., when reopening modal after update)
    useEffect(() => {
        setValue(seating.value || 0);
        setHasValuePenalty(seating.has_value_penalty || false);
        setEditService(seating.service || '');
        setEditIsRequested(seating.is_requested || false);
    }, [seating.id, seating.value, seating.has_value_penalty, seating.service, seating.is_requested]);

    // Auto-focus value input on open and handle Enter key to submit
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Auto-check/uncheck value penalty based on divisibility by 5 (UI helper - ONLY for open seatings)
    useEffect(() => {
        // Only auto-check for OPEN seatings; closed seatings allow full manual control
        if (isOpen) {
            const v = parseInt(value, 10); // Ensure base-10 parsing
            if (!isNaN(v) && v > 0) {
                const isDivisibleBy5 = v % 5 === 0;
                // Auto-check if NOT divisible by 5, auto-uncheck if IS divisible by 5
                if (!isDivisibleBy5 && !hasValuePenalty) {
                    setHasValuePenalty(true);
                } else if (isDivisibleBy5 && hasValuePenalty) {
                    setHasValuePenalty(false);
                }
            }
        }
    }, [value, isOpen]);

    useEffect(() => {
        let mounted = true;
        const loadServices = async () => {
            try {
                const resp = await fetch('/api/services/');
                const data = await resp.json();
                if (!mounted) return;
                setServicesList(data || []);
            } catch (e) {
                // ignore
            }
        };
        loadServices();
        return () => { mounted = false; };
    }, []);

    const getElapsedTime = () => {
        const start = new Date(seating.time);
        const now = new Date();
        const elapsed = Math.floor((now - start) / 60000); // minutes
        return `${elapsed}m`;
    };

    return (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content seating-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Seating Details</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="seating-info">
                        <div className="info-row">
                            <span className="label">Tech:</span>
                            <span className="value">{seating.tech.tech_alias} - {seating.tech.tech_name}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Service:</span>
                            <span className="value">{seating.service}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Started:</span>
                            <span className="value">{formatTime(seating.time)}</span>
                        </div>
                        {isOpen && (
                            <div className="info-row">
                                <span className="label">Elapsed:</span>
                                <span className="value elapsed">{getElapsedTime()}</span>
                            </div>
                        )}
                        <div className="info-row">
                            <span className="label">Type:</span>
                            <div className="badges">
                                <span className={`badge ${seating.is_requested ? 'requested' : 'walkin'}`}>
                                    {seating.is_requested ? 'Requested' : 'Walk-in'}
                                </span>
                                <span className={`badge ${seating.is_bonus ? 'bonus' : 'regular'}`}>
                                    {seating.is_bonus ? 'Bonus Turn' : 'Regular Turn'}
                                </span>
                            </div>
                        </div>
                        <div className="info-row">
                            <span className="label">Status:</span>
                            <span className={`badge ${isOpen ? 'open' : 'closed'}`}>
                                {isOpen ? 'Open' : 'Closed'}
                            </span>
                        </div>
                    </div>

                    {isOpen ? (
                        <div className="close-seating-section">
                            <h4>Close Seating</h4>
                            <div className="form-group">
                                <label htmlFor="value">Value ($):</label>
                                <input
                                    id="value"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    ref={inputRef}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleClose(); }}
                                    className="form-input"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={seating.has_value_penalty || hasValuePenalty}
                                        onChange={(e) => setHasValuePenalty(e.target.checked)}
                                    />
                                    <span>Value Penalty (adjustment for final settlement)</span>
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="closed-seating-info">
                            <div className="info-row">
                                <span className="label">Value:</span>
                                <span className="value amount">${seating.value}</span>
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={seating.has_value_penalty || hasValuePenalty}
                                        onChange={async (e) => {
                                            const checked = e.target.checked;
                                            if (editMode) {
                                                // update and close modal per Phase 9.3
                                                setLoading(true);
                                                setError('');
                                                try {
                                                    await dayService.updateSeating(dayDate, seating.id, { has_value_penalty: checked });
                                                    if (onSuccess) onSuccess();
                                                    onClose();
                                                } catch (err) {
                                                    setError(err.data?.error || err.message || 'Failed to update seating');
                                                } finally {
                                                    setLoading(false);
                                                }
                                            } else {
                                                toggleValuePenalty(checked);
                                            }
                                        }}
                                        disabled={isDayClosed || loading}
                                    />
                                    <span> value adjustment</span>
                                </label>
                            </div>
                            {hasValuePenalty && (
                                <div className="warning-message">
                                    ⚠ -3 value adjustment for final settlement
                                </div>
                            )}

                            {editMode && (
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={seating.is_requested || editIsRequested}
                                            onChange={async (e) => {
                                                const checked = e.target.checked;
                                                if (isDayClosed) { setError('Cannot edit closed day'); return; }
                                                setLoading(true);
                                                setError('');
                                                try {
                                                    await dayService.updateSeating(dayDate, seating.id, { is_requested: checked });
                                                    if (onSuccess) onSuccess();
                                                    onClose();
                                                } catch (err) {
                                                    setError(err.data?.error || err.message || 'Failed to update seating');
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={isDayClosed || loading}
                                        />
                                        <span> Requested</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Edit mode for long-press: allow changing service or request flag */}
                    {editMode && isOpen && (
                        <div className="edit-seating-section">
                            <h4>Edit Seating</h4>
                            <div className="form-group">
                                <label htmlFor="service-select">Service:</label>
                                <select id="service-select" value={editService} onChange={(e) => setEditService(e.target.value)}>
                                    <option value="">-- select service --</option>
                                    {servicesList.map(s => (
                                        <option key={s.name} value={s.name}>{s.short_name || s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={editIsRequested} onChange={(e) => setEditIsRequested(e.target.checked)} />
                                    <span>Requested</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}
                </div>

                <div className="modal-footer">
                    {!showDeleteConfirm ? (
                        <>
                            <button
                                className="btn-danger"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={loading}
                            >
                                Delete
                            </button>
                            <div className="spacer"></div>
                            <button
                                className="btn-secondary"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            {isOpen && !editMode && (
                                <button
                                    className="btn-primary"
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    {loading ? 'Closing...' : 'Close Seating'}
                                </button>
                            )}
                            {isOpen && editMode && (
                                <button
                                    className="btn-primary"
                                    onClick={handleSaveEdits}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="confirm-text">Delete this seating?</p>
                            <button
                                className="btn-secondary"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-danger"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                {loading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SeatingModal;
