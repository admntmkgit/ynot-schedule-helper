/**
 * Phase 3: Tech Tab Component
 * Lists all technicians and allows adding new techs and managing skills
 */
import { useState, useEffect } from 'react';
import './TechTab.css';
import { technicianService, serviceService } from '../services';
import TechProfile from './TechProfile';

function TechTab() {
    const [techs, setTechs] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedTech, setSelectedTech] = useState(null);
    const [profileAlias, setProfileAlias] = useState(null);
    const [profileTech, setProfileTech] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTech, setNewTech] = useState({ alias: '', name: '' });
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [techsData, servicesData] = await Promise.all([
                technicianService.getAll(),
                serviceService.getAll()
            ]);
            setTechs(techsData);
            setServices(servicesData);
            setError(null);
        } catch (err) {
            setError('Failed to load data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTech = async (e) => {
        e.preventDefault();
        if (!newTech.alias.trim()) {
            setError('Alias is required');
            return;
        }
        
        try {
            await technicianService.create(newTech);
            await loadData();
            setNewTech({ alias: '', name: '' });
            setShowAddForm(false);
            setError(null);
        } catch (err) {
            setError('Failed to add technician: ' + err.message);
        }
    };

    const handleOpenProfile = (tech) => {
        setProfileAlias(tech.alias);
        setShowProfile(true);
    };

    const handleProfileSaved = async () => {
        // refresh list after profile save
        await loadData();
    };

    if (loading) return <div className="loading">Loading...</div>;

    const normalizedFilter = (filter || '').toLowerCase().trim();
    const filteredTechs = normalizedFilter
        ? techs.filter(t => (t.alias || '').toLowerCase().includes(normalizedFilter) || (t.name || '').toLowerCase().includes(normalizedFilter))
        : techs;

    return (
        <div className="tech-tab">
            {error && <div className="error">{error}</div>}
            
            <div className="tech-tab-content">
                <div className="tech-list-section">
                    <div className="section-header">
                        <div>
                            <input
                                className="filter-input"
                                placeholder="Filter technicians by alias or name"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                        <button 
                            className="btn-accent"
                            onClick={() => {
                                // Open the same profile modal in create mode
                                setProfileAlias(null);
                                setProfileTech({ alias: '', name: '', skills: [] });
                                setShowProfile(true);
                            }}
                        >
                            + Add New Tech
                        </button>
                    </div>

                    {/* Use profile modal for creating new techs; inline add form removed */}

                    <div className="tech-list">
                        {filteredTechs.length === 0 ? (
                            <p className="empty-state">No technicians match your filter.</p>
                        ) : (
                            filteredTechs.map((tech) => (
                                <div
                                    key={tech.alias}
                                    className={`tech-item`}
                                    onClick={() => handleOpenProfile(tech)}
                                >
                                    <div className="tech-alias">{tech.alias}</div>
                                    {tech.name && <div className="tech-name">{tech.name}</div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {showProfile && (
                <TechProfile alias={profileAlias} tech={profileTech} onClose={() => { setShowProfile(false); setProfileTech(null); }} onSaved={handleProfileSaved} />
            )}
        </div>
    );
}

export default TechTab;
