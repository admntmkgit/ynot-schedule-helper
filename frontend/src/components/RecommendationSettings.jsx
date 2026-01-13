/**
 * Recommendation Settings Component
 * Allows selecting services for which to display recommendation widgets
 */
import { useState, useEffect } from 'react';
import { settingsService, serviceService } from '../services';
import './RecommendationSettings.css';

function RecommendationSettings() {
    const [services, setServices] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            // Load all services
            const servicesData = await serviceService.getAll();
            setServices(servicesData);

            // Load current recommendation widget settings
            const settings = await settingsService.getRecommendations();
            setSelectedServices(settings.recommendation_widgets || []);
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleService = (serviceName) => {
        setSelectedServices(prev => {
            if (prev.includes(serviceName)) {
                return prev.filter(s => s !== serviceName);
            } else {
                return [...prev, serviceName];
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await settingsService.updateRecommendations({
                recommendation_widgets: selectedServices
            });
            setSuccess('Recommendation settings saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="recommendation-settings-loading">Loading settings...</div>;
    }

    return (
        <div className="recommendation-settings">
            <div className="settings-header">
                <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="info-section">
                <p>
                    <strong>Always-Visible Widgets:</strong> Regular Turn and Bonus Turn recommendations 
                    are always shown in the sidebar (skill checks are skipped for these).
                </p>
                <p>
                    <strong>Service-Specific Widgets:</strong> Select services below to add dedicated 
                    recommendation widgets that include skill checks and pre-fill the service when 
                    adding a seating.
                </p>
            </div>

            <div className="service-selection">
                <h4>Select Services for Recommendation Widgets</h4>
                {services.length === 0 ? (
                    <p className="empty-message">No services available. Create services first.</p>
                ) : (
                    <div className="service-list">
                        {services.map(service => (
                            <div key={service.name} className="service-item">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={selectedServices.includes(service.name)}
                                        onChange={() => handleToggleService(service.name)}
                                    />
                                    <span className="service-name">{service.name}</span>
                                    {service.short_name && (
                                        <span className="service-short-name">({service.short_name})</span>
                                    )}
                                    <span className="service-meta">
                                        {service.time_needed} min
                                        {service.is_bonus && <span className="bonus-badge">Bonus</span>}
                                    </span>
                                </label>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="selected-count">
                {selectedServices.length} service-specific widget{selectedServices.length !== 1 ? 's' : ''} selected
            </div>
        </div>
    );
}

export default RecommendationSettings;
