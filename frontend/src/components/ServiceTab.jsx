/**
 * Phase 3: Service Tab Component
 * Lists all services and allows adding new services and managing tech assignments
 */
import React, { useState, useEffect } from 'react';
import './ServiceTab.css';
import { serviceService, technicianService } from '../services';
import ServiceProfile from './ServiceProfile';

function ServiceTab() {
    const [services, setServices] = useState([]);
    const [techs, setTechs] = useState([]);
    const [profileName, setProfileName] = useState(null);
    const [profileService, setProfileService] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [filter, setFilter] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newService, setNewService] = useState({ name: '', time_needed: 30, is_bonus: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [servicesData, techsData] = await Promise.all([
                serviceService.getAll(),
                technicianService.getAll()
            ]);
            setServices(servicesData);
            setTechs(techsData);
            setError(null);
        } catch (err) {
            setError('Failed to load data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddService = async (e) => {
        e.preventDefault();
        if (!newService.name.trim()) {
            setError('Service name is required');
            return;
        }
        
        try {
            await serviceService.create(newService);
            await loadData();
            setNewService({ name: '', time_needed: 30, is_bonus: false });
            setShowAddForm(false);
            setError(null);
        } catch (err) {
            setError('Failed to add service: ' + err.message);
        }
    };

    const handleSelectService = async (service) => {
        // Open the service profile modal
        setProfileName(service.name);
        setShowProfile(true);
    };

    // Service details & tech assignment are handled in the ServiceProfile modal now

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="service-tab">
            {error && <div className="error">{error}</div>}
            
            <div className="service-tab-content">
                <div className="service-list-section">
                    <div className="section-header">
                        <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                            <input
                                className="filter-input"
                                placeholder="Filter services by name"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                        <button 
                            className="btn-accent"
                            onClick={() => {
                                // open ServiceProfile in create mode
                                setProfileName(null);
                                setProfileService({ name: '', time_needed: 30, is_bonus: false, short_name: '', qualified_techs: [] });
                                setShowProfile(true);
                            }}
                        >
                            + Add New Service
                        </button>
                    </div>

                    {/* Creation uses ServiceProfile modal now */}

                    <div className="service-list">
                        { (filter ? services.filter(s => s.name.toLowerCase().includes(filter.toLowerCase())) : services).length === 0 ? (
                            <p className="empty-state">No services match your filter.</p>
                        ) : (
                            (filter ? services.filter(s => s.name.toLowerCase().includes(filter.toLowerCase())) : services).map((service) => (
                                <div
                                    key={service.name}
                                    className={`service-item`}
                                    onClick={() => handleSelectService(service)}
                                >
                                    <div className="service-name">{service.name}</div>
                                    <div className="service-details">
                                        <span className="service-time">{service.time_needed} min</span>
                                        {service.is_bonus && <span className="service-bonus">Bonus</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Service profile modal will handle details now */}
                {showProfile && (
                    <React.Suspense fallback={<div className="loading">Loading...</div>}>
                        <ServiceProfile name={profileName} service={profileService} onClose={() => { setShowProfile(false); setProfileService(null); }} onSaved={loadData} />
                    </React.Suspense>
                )}
            </div>
        </div>
    );
}

export default ServiceTab;
