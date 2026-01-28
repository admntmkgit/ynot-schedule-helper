import { useState, useEffect } from 'react';
import { settingsService } from '../services';
import './DayTableSettings.css';

function DayTableSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState(true);
    const [displayTurns, setDisplayTurns] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await settingsService.getDayTableSettings();
            setDisplayName(data.display_name ?? true);
            setDisplayTurns(data.display_turns ?? false);
        } catch (err) {
            setError(err?.data?.error || err.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const save = async () => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await settingsService.updateDayTableSettings({
                display_name: displayName,
                display_turns: displayTurns,
            });
            setSuccess('Saved');
            setTimeout(() => setSuccess(''), 2500);
        } catch (err) {
            setError(err?.data?.error || err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="daytable-settings-loading">Loading...</div>;

    return (
        <div className="daytable-settings">
            <h3>Day Table</h3>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="setting-row">
                <label>
                    <input
                        type="checkbox"
                        checked={displayName}
                        onChange={(e) => setDisplayName(e.target.checked)}
                    />
                    <span>Display Name (full technician name)</span>
                </label>
            </div>

            <div className="setting-row">
                <label>
                    <input
                        type="checkbox"
                        checked={displayTurns}
                        onChange={(e) => setDisplayTurns(e.target.checked)}
                    />
                    <span>Display Turns (regular & bonus turns)</span>
                </label>
            </div>

            <div className="settings-actions">
                <button className="btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}

export default DayTableSettings;
