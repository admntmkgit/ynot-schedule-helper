import { useState, useEffect } from 'react';
import './TechProfile.css';
import { technicianService } from '../services';

function TechProfile({ alias, tech: techProp, onClose, onSaved }) {
    const [tech, setTech] = useState(null);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [newAlias, setNewAlias] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // If tech object is provided directly (from day table or create), use it
        if (techProp) {
            const aliasVal = techProp.tech_alias || techProp.alias || '';
            const nameVal = techProp.tech_name || techProp.name || '';
            const skillsVal = techProp.skills || [];
            const isCreatingNewTech = !aliasVal;
            setNewAlias(aliasVal);
            loadServicesForCreate(isCreatingNewTech, aliasVal, nameVal, skillsVal); // Pass tech data to set after services load
            return;
        }

        if (!alias) return;
        loadData();
    }, [alias, techProp]);

    const loadServices = async () => {
        try {
            const servicesResp = await fetch('/api/services/').then(r => r.json());
            setServices(servicesResp || []);
            setLoading(false);
        } catch (err) {
            setError('Failed to load services');
            setLoading(false);
        }
    };

    const loadServicesForCreate = async (isCreatingNewTech, aliasVal, nameVal, skillsVal) => {
        try {
            const servicesResp = await fetch('/api/services/').then(r => r.json());
            setServices(servicesResp || []);
            
            // If creating new tech, pre-populate skills with is_default services
            let finalSkills = skillsVal;
            if (isCreatingNewTech) {
                const defaultServices = (servicesResp || [])
                    .filter(s => s.is_default)
                    .map(s => s.name);
                finalSkills = defaultServices;
            }
            
            setTech({ alias: aliasVal, name: nameVal, skills: finalSkills });
            setLoading(false);
        } catch (err) {
            setError('Failed to load services');
            setLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [techResp, servicesResp] = await Promise.all([
                technicianService.getByAlias(alias),
                fetch('/api/services/').then(r => r.json())
            ]);

            const techData = techResp.data || techResp;
            setTech({ alias: techData.alias, name: techData.name, skills: techData.skills || [] });
            setNewAlias(techData.alias);
            setServices(servicesResp || []);
        } catch (err) {
            setError('Failed to load profile: ' + (err.message || err));
        } finally {
            setLoading(false);
        }
    };

    const toggleSkill = (serviceName) => {
        if (!tech) return;
        const current = tech.skills || [];
        const updated = current.includes(serviceName) ? current.filter(s => s !== serviceName) : [...current, serviceName];
        setTech({ ...tech, skills: updated });
    };

    const handleSave = async () => {
        if (!tech) return;
        setSaving(true);
        setError('');
        try {
            if (alias) {
                // existing tech: update
                await technicianService.partialUpdate(alias, { name: tech.name });
                await technicianService.updateSkills(alias, tech.skills || []);
            } else {
                // create new tech
                if (!tech.alias || !tech.alias.trim()) {
                    throw new Error('Alias is required');
                }
                await technicianService.create({ alias: tech.alias.trim(), name: tech.name });
                await technicianService.updateSkills(tech.alias.trim(), tech.skills || []);
            }

            if (onSaved) onSaved();
            onClose();
        } catch (err) {
            // Extract detailed error from API response
            let errorMsg = 'Failed to save';
            if (err.data && typeof err.data === 'object') {
                // DRF validation errors are structured as {field: [error messages]}
                const errors = [];
                for (const [field, messages] of Object.entries(err.data)) {
                    if (Array.isArray(messages)) {
                        errors.push(...messages);
                    } else if (typeof messages === 'string') {
                        errors.push(messages);
                    }
                }
                if (errors.length > 0) {
                    errorMsg = errors.join('; ');
                } else {
                    errorMsg = err.data.error || err.data.detail || errorMsg;
                }
            } else if (err.message) {
                errorMsg = err.message;
            }
            setError(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleRename = async () => {
        if (!tech || !newAlias) return;
        if (newAlias === tech.alias) return setError('Alias unchanged.');
        setRenaming(true);
        setError('');
        try {
            await technicianService.rename(tech.alias, newAlias, tech.name);
            if (onSaved) onSaved();
            onClose();
        } catch (err) {
            setError('Failed to rename: ' + (err.message || err));
        } finally {
            setRenaming(false);
        }
    };

    const handleDelete = async () => {
        if (!tech) return;
        if (!confirm(`Delete technician '${tech.alias}'? This cannot be undone.`)) return;
        setDeleting(true);
        setError('');
        try {
            await technicianService.delete(tech.alias);
            if (onSaved) onSaved();
            onClose();
        } catch (err) {
            setError('Failed to delete: ' + (err.message || err));
        } finally {
            setDeleting(false);
        }
    };

    // Show when editing (alias provided) or creating (techProp provided)
    if (!alias && !techProp) return null;

    return (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content tech-profile" onClick={e => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Tech Profile</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : (
                        <div className="profile-body">
                            {error && <div className="error">{error}</div>}

                            <div className="field">
                                <label>Alias</label>
                                { alias ? (
                                    <div className="readonly">{tech.alias}</div>
                                ) : (
                                    <input type="text" value={tech.alias || ''} onChange={e => setTech({ ...tech, alias: e.target.value })} />
                                )}
                            </div>

                            <div className="field">
                                <label>Name</label>
                                <input type="text" value={tech.name || ''} onChange={e => setTech({ ...tech, name: e.target.value })} />
                            </div>

                            { alias && (
                                <div className="field">
                                    <label>Rename alias</label>
                                    <input type="text" value={newAlias} onChange={e => setNewAlias(e.target.value)} />
                                    <div style={{display:'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                                        <button className="btn-secondary" onClick={() => setNewAlias(tech.alias)} disabled={renaming}>Reset</button>
                                        <button className="btn-warning" onClick={handleRename} disabled={renaming}>{renaming ? 'Renaming...' : 'Rename'}</button>
                                    </div>
                                </div>
                            )}

                            <div className="field">
                                <label>Skills</label>
                                <div className="skills-grid">
                                    {services.map(s => (
                                        <label key={s.name} className="skill-checkbox">
                                            <input type="checkbox" checked={tech.skills?.includes(s.name) || false} onChange={() => toggleSkill(s.name)} />
                                            <span>{s.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <div style={{marginRight: 'auto', display: 'flex', gap: '0.5rem'}}>
                        { alias && (
                            <button className="btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</button>
                        ) }
                    </div>
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
            </div>
        </div>
    );
}

export default TechProfile;
