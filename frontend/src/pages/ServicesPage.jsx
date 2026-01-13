/**
 * Services Page Component
 * Displays and manages services
 */
import { useState, useEffect } from 'react';
import { serviceService, ApiError } from '../services';

function ServicesPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await serviceService.getAll();
            setServices(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(`Error loading services: ${err.message}`);
            } else {
                setError('Failed to load services');
            }
            console.error('Error loading services:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading services...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="services-page">
            <h2>Services</h2>
            <button onClick={loadServices}>Refresh</button>
            {services.length === 0 ? (
                <p>No services found. Add one to get started!</p>
            ) : (
                <ul className="service-list">
                    {services.map((service) => (
                        <li key={service.name}>
                            <strong>{service.name}</strong>
                            {' - '}
                            {service.time_needed} minutes
                            {service.is_bonus && ' (Bonus)'}
                            {service.qualified_techs && service.qualified_techs.length > 0 && (
                                <span> (Techs: {service.qualified_techs.join(', ')})</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default ServicesPage;
