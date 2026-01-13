/**
 * Seating Modal Component
 * Modal for editing, closing, or deleting a seating
 */
import { useState } from 'react';
import { dayService } from '../services';
import './SeatingModal.css';

function SeatingModal({ seating, dayDate, dayStatus, onClose, onSuccess }) {
    const [value, setValue] = useState(seating.value || 0);
    const [hasValuePenalty, setHasValuePenalty] = useState(seating.has_value_penalty || false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
                                    className="form-input"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={hasValuePenalty}
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
                                        checked={hasValuePenalty}
                                        onChange={(e) => toggleValuePenalty(e.target.checked)}
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
                            {isOpen && (
                                <button
                                    className="btn-primary"
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    {loading ? 'Closing...' : 'Close Seating'}
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
