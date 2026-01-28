/**
 * Phase 10: Initial Setup Screen
 * Shown when no users exist - requires creating first user
 */
import { useState } from 'react';
import './InitialSetup.css';
import { useAuth } from '../context/AuthContext';

function InitialSetup() {
    const { createFirstUser } = useAuth();
    const [formData, setFormData] = useState({ name: '', pin: '', pin_confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const extractErrorMessage = (err) => {
        if (err.data) {
            const errors = [];
            for (const [field, messages] of Object.entries(err.data)) {
                if (Array.isArray(messages)) {
                    errors.push(`${field}: ${messages.join(', ')}`);
                } else if (typeof messages === 'string') {
                    errors.push(`${field}: ${messages}`);
                }
            }
            if (errors.length > 0) return errors.join('; ');
        }
        return err.message || 'An error occurred';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }
        if (formData.pin.length < 4) {
            setError('PIN must be at least 4 digits');
            return;
        }
        if (!/^\d+$/.test(formData.pin)) {
            setError('PIN must contain only digits');
            return;
        }
        if (formData.pin !== formData.pin_confirm) {
            setError('PINs do not match');
            return;
        }

        setLoading(true);

        try {
            await createFirstUser(formData);
            // Auth context will update and this component will unmount
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="initial-setup">
            <div className="setup-container">
                <div className="setup-header">
                    <h1>💅 Nail Salon Schedule Helper</h1>
                    <h2>Welcome! Let's get started.</h2>
                    <p>Create your first user account to begin using the app.</p>
                </div>

                <form className="setup-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="setup-name">Your Name:</label>
                        <input
                            id="setup-name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter your name"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="setup-pin">Create a PIN:</label>
                        <input
                            id="setup-pin"
                            type="password"
                            name="pin"
                            value={formData.pin}
                            onChange={handleInputChange}
                            placeholder="Enter 4+ digit PIN"
                            minLength={4}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            required
                        />
                        <span className="hint">Use this PIN to quickly switch users later</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="setup-pin-confirm">Confirm PIN:</label>
                        <input
                            id="setup-pin-confirm"
                            type="password"
                            name="pin_confirm"
                            value={formData.pin_confirm}
                            onChange={handleInputChange}
                            placeholder="Confirm your PIN"
                            minLength={4}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn-primary setup-btn" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Account & Start'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default InitialSetup;
