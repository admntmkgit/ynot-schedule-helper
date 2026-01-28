/**
 * Phase 10: User Switcher Component
 * Displays current user in navbar with quick switch modal
 */
import { useState, useEffect, useRef } from 'react';
import './UserSwitcher.css';
import { useAuth } from '../context/AuthContext';

function UserSwitcher() {
    const { currentUser, quickSwitch, logout } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (showModal && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showModal]);

    const handleOpen = () => {
        setShowModal(true);
        setPin('');
        setError('');
    };

    const handleClose = () => {
        setShowModal(false);
        setPin('');
        setError('');
    };

    const handlePinChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); // Only digits
        setPin(value);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pin.length < 4) {
            setError('PIN must be at least 4 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await quickSwitch(pin);
            handleClose();
        } catch (err) {
            setError(err.data?.error || err.message || 'Invalid PIN');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && pin.length >= 4) {
            handleSubmit(e);
        }
    };

    const handlePinPadClick = (digit) => {
        if (pin.length < 8) {
            setPin(prev => prev + digit);
            setError('');
        }
    };

    const handlePinPadClear = () => {
        setPin('');
        setError('');
    };

    const handlePinPadBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    return (
        <>
            <div className="user-switcher" onClick={handleOpen}>
                <span className="user-icon">👤</span>
                <span className="user-name">
                    {currentUser ? currentUser.name : 'Not logged in'}
                </span>
                <span className="switch-icon">⇄</span>
            </div>

            {showModal && (
                <div className="modal-overlay user-switch-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Switch User</h3>
                            <button className="close-btn" onClick={handleClose}>×</button>
                        </div>
                        <div className="modal-body">
                            {currentUser && (
                                <div className="current-user-info">
                                    Current: <strong>{currentUser.name}</strong>
                                </div>
                            )}
                            
                            <form onSubmit={handleSubmit}>
                                <div className="pin-display">
                                    <input
                                        ref={inputRef}
                                        type="password"
                                        value={pin}
                                        onChange={handlePinChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Enter PIN"
                                        maxLength={8}
                                        inputMode="numeric"
                                        autoComplete="off"
                                        className="pin-input"
                                    />
                                </div>

                                {/* PIN Pad */}
                                <div className="pin-pad">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                                        <button
                                            key={digit}
                                            type="button"
                                            className="pin-pad-btn"
                                            onClick={() => handlePinPadClick(String(digit))}
                                        >
                                            {digit}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        className="pin-pad-btn pin-pad-clear"
                                        onClick={handlePinPadClear}
                                    >
                                        C
                                    </button>
                                    <button
                                        type="button"
                                        className="pin-pad-btn"
                                        onClick={() => handlePinPadClick('0')}
                                    >
                                        0
                                    </button>
                                    <button
                                        type="button"
                                        className="pin-pad-btn pin-pad-back"
                                        onClick={handlePinPadBackspace}
                                    >
                                        ←
                                    </button>
                                </div>

                                {error && <div className="error-message">{error}</div>}

                                <div className="modal-actions">
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={loading || pin.length < 4}
                                    >
                                        {loading ? 'Switching...' : 'Switch'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default UserSwitcher;
