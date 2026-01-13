/**
 * New Seating Modal Component
 * Form to create a new seating with bonus logic auto-determination
 */
import { useState, useEffect } from 'react';
import { serviceService, dayService } from '../services';
import './NewSeatingModal.css';

function NewSeatingModal({ tech, dayDate, dayStatus, prefilledService = null, onClose, onSuccess }) {
    const isDayClosed = dayStatus === 'closed';
    const [services, setServices] = useState([]);
    const [isRequested, setIsRequested] = useState(false);
    const [selectedService, setSelectedService] = useState(prefilledService || '');
    const [isBonusOverride, setIsBonusOverride] = useState(null);
    const [autoIsBonus, setAutoIsBonus] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadServices();
    }, []);

    useEffect(() => {
        // Update selected service if prefilledService changes
        if (prefilledService) {
            setSelectedService(prefilledService);
        }
    }, [prefilledService]);

    useEffect(() => {
        if (selectedService && tech) {
            determineBonus();
        }
    }, [selectedService, isRequested, tech]);

    // Uncheck and disable requested checkbox if selected service is a bonus service
    useEffect(() => {
        if (selectedService) {
            const service = services.find(s => s.name === selectedService);
            if (service && service.is_bonus && isRequested) {
                setIsRequested(false);
            }
        }
    }, [selectedService, services]);

    const loadServices = async () => {
        try {
            const data = await serviceService.getAllServices();
            // Filter to only services this tech has skills for
            const techServices = data.filter(service => 
                service.qualified_techs && service.qualified_techs.includes(tech.tech_alias)
            );
            setServices(techServices);
        } catch (err) {
            console.error('Error loading services:', err);
            setError('Failed to load services');
        }
    };

    const determineBonus = () => {
        if (!selectedService) {
            setAutoIsBonus(false);
            return;
        }

        const service = services.find(s => s.name === selectedService);
        if (!service) {
            setAutoIsBonus(false);
            return;
        }

        if (isRequested) {
            // For requested: alternate - 1st=regular, 2nd=bonus, 3rd=regular, 4th=bonus, etc.
            const requestedCount = tech.seatings.filter(s => s.is_requested).length;
            // Even counts (0,2,4...) = regular, odd counts (1,3,5...) = bonus
            setAutoIsBonus(requestedCount % 2 === 1);
        } else {
            // For walk-ins: use service's is_bonus flag
            setAutoIsBonus(service.is_bonus);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedService) {
            setError('Please select a service');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await dayService.createSeating(dayDate, {
                tech_alias: tech.tech_alias,
                is_requested: isRequested,
                service: selectedService,
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to create seating');
        } finally {
            setLoading(false);
        }
    };

    const finalIsBonus = isBonusOverride !== null ? isBonusOverride : autoIsBonus;
    
    // Disable requested checkbox if selected service is bonus
    const selectedServiceObj = services.find(s => s.name === selectedService);
    const isRequestedDisabled = selectedServiceObj?.is_bonus || false;

    return (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content new-seating-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>New Seating - {tech.tech_alias}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label htmlFor="service">Service:</label>
                            <select
                                id="service"
                                value={selectedService}
                                onChange={(e) => {
                                    setSelectedService(e.target.value);
                                    setIsBonusOverride(null); // Reset override
                                }}
                                required
                                className="form-select"
                            >
                                <option value="">-- Select Service --</option>
                                {services.map(service => (
                                    <option key={service.name} value={service.name}>
                                        {service.name} ({service.time_needed} min)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isRequested}
                                    onChange={(e) => {
                                        setIsRequested(e.target.checked);
                                        setIsBonusOverride(null); // Reset override
                                    }}
                                    disabled={isRequestedDisabled}
                                />
                                <span>Requested (Customer requested this tech)</span>
                                {isRequestedDisabled && (
                                    <span className="disabled-hint"> - Not available for bonus services</span>
                                )}
                            </label>
                        </div>

                        {selectedService && (
                            <div className="bonus-verification">
                                <div className="auto-determination">
                                    <strong>Auto-determined:</strong>
                                    <span className={`badge ${autoIsBonus ? 'bonus' : 'regular'}`}>
                                        {autoIsBonus ? 'Bonus Turn' : 'Regular Turn'}
                                    </span>
                                </div>
                                <div className="determination-logic">
                                    {isRequested ? (
                                        <p>
                                            {(() => {
                                                const count = tech.seatings.filter(s => s.is_requested).length;
                                                const isOdd = count % 2 === 1;
                                                return isOdd
                                                    ? `✓ Requested #${count + 1} (even) = Bonus Turn`
                                                    : `✓ Requested #${count + 1} (odd) = Regular Turn`;
                                            })()}
                                        </p>
                                    ) : (
                                        <p>
                                            {services.find(s => s.name === selectedService)?.is_bonus
                                                ? '✓ Service marked as bonus = Bonus Turn'
                                                : '✓ Regular service = Regular Turn'
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="form-group override">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={finalIsBonus}
                                            onChange={(e) => setIsBonusOverride(e.target.checked)}
                                        />
                                        <span>Manual Override - Mark as Bonus Turn</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {error && <div className="error-message">{error}</div>}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !selectedService}
                        >
                            {loading ? 'Creating...' : 'Create Seating'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewSeatingModal;
