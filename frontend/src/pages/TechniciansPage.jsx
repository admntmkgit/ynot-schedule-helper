/**
 * Technicians Page Component
 * Displays and manages technicians
 */
import { useState, useEffect } from 'react';
import { technicianService, ApiError } from '../services';

function TechniciansPage() {
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadTechnicians();
    }, []);

    const loadTechnicians = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await technicianService.getAll();
            setTechnicians(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(`Error loading technicians: ${err.message}`);
            } else {
                setError('Failed to load technicians');
            }
            console.error('Error loading technicians:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading technicians...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="technicians-page">
            <h2>Technicians</h2>
            <button onClick={loadTechnicians}>Refresh</button>
            {technicians.length === 0 ? (
                <p>No technicians found. Add one to get started!</p>
            ) : (
                <ul className="technician-list">
                    {technicians.map((tech) => (
                        <li key={tech.alias}>
                            <strong>{tech.alias}</strong>
                            {tech.name && ` - ${tech.name}`}
                            {tech.skills && tech.skills.length > 0 && (
                                <span> (Skills: {tech.skills.join(', ')})</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default TechniciansPage;
