import { useState, useEffect } from 'react';
import './TechProfile.css';
import { serviceService } from '../services';

function ServiceProfile({ name, service: serviceProp, onClose, onSaved }) {
    const [service, setService] = useState(null);
    const [techs, setTechs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // If service prop provided (create mode) use it, else load by name
        if (serviceProp) {
            const s = serviceProp;
            setService({ name: s.name || '', time_needed: s.time_needed || 30, is_bonus: !!s.is_bonus, is_default: !!s.is_default, short_name: s.short_name || '', qualified_techs: s.qualified_techs || [] });
            setTechs([]);
            setNewName(s.name || '');
            setLoading(false);
            // load techs list
            (async () => {
                try {
                    const techsResp = await fetch('/api/techs/').then(r => r.json());
                    setTechs(techsResp || []);
                } catch (err) {
                    // ignore
                }
            })();
            return;
        }

        if (!name) return;
        loadData();
    }, [name, serviceProp]);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [serviceResp, techsResp] = await Promise.all([
                serviceService.getByName(name),
                fetch('/api/techs/').then(r => r.json())
            ]);
            const s = serviceResp;
            setService({ name: s.name, time_needed: s.time_needed, is_bonus: s.is_bonus, is_default: s.is_default || false, short_name: s.short_name || '', qualified_techs: s.qualified_techs || [] });
            setTechs(techsResp || []);
            setNewName(s.name);
        } catch (err) {
            setError('Failed to load service: ' + (err.message || err));
        } finally {
            setLoading(false);
        }
    };

    const toggleTech = (alias) => {
        const current = service.qualified_techs || [];
        const updated = current.includes(alias) ? current.filter(a => a !== alias) : [...current, alias];
        setService({ ...service, qualified_techs: updated });
    };

    const handleIsDefaultChange = (checked) => {
        let newQualifiedTechs = service.qualified_techs || [];
        if (checked) {
            // When checking is_default, add all techs to qualified_techs
            const allTechAliases = techs.map(t => t.alias);
            newQualifiedTechs = [...new Set([...newQualifiedTechs, ...allTechAliases])];
        } else {
            // When unchecking is_default, clear all techs (user can manually add them back)
            newQualifiedTechs = [];
        }
        setService({ ...service, is_default: checked, qualified_techs: newQualifiedTechs });
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            if (name) {
                // existing service: update
                await serviceService.partialUpdate(name, { time_needed: service.time_needed, is_bonus: service.is_bonus, is_default: service.is_default, short_name: service.short_name || '' });
                await serviceService.updateQualifiedTechs(name, service.qualified_techs || []);
            } else {
                // create new service
                if (!service.name || !service.name.trim()) throw new Error('Service name is required');
                await serviceService.create({ name: service.name.trim(), time_needed: service.time_needed, is_bonus: service.is_bonus, is_default: service.is_default, short_name: service.short_name || '' });
                await serviceService.updateQualifiedTechs(service.name.trim(), service.qualified_techs || []);
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
        if (!service || !newName) return;
        if (newName === service.name) return setError('Name unchanged.');
        setRenaming(true);
        setError('');
        try {
            await serviceService.rename(service.name, newName, service.time_needed, service.is_bonus);
            if (onSaved) onSaved();
            onClose();
        } catch (err) {
            setError('Failed to rename: ' + (err.message || err));
        } finally {
            setRenaming(false);
        }
    };

    const handleDelete = async () => {
        if (!service) return;
        if (!confirm(`Delete service '${service.name}'? This cannot be undone.`)) return;
        setDeleting(true);
        setError('');
        try {
            await serviceService.delete(service.name);
            if (onSaved) onSaved();
            onClose();
        } catch (err) {
            setError('Failed to delete: ' + (err.message || err));
        } finally {
            setDeleting(false);
        }
    };

    // Show when editing (name provided) or creating (serviceProp provided)
    if (!name && !serviceProp) return null;

    return (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content tech-profile" onClick={e => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Service Profile</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {loading ? <div className="loading">Loading...</div> : (
                        <div className="profile-body">
                            {error && <div className="error">{error}</div>}
                            <div className="field">
                                <label>Name{!name ? '' : ' (read-only)'}</label>
                                { name ? (
                                    <div className="readonly">{service.name}</div>
                                ) : (
                                    <input type="text" value={service.name || ''} onChange={e => setService({ ...service, name: e.target.value })} />
                                ) }
                            </div>
                            <div className="field">
                                <label>Time Needed (minutes)</label>
                                <input type="number" value={service.time_needed} onChange={e => setService({ ...service, time_needed: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="field">
                                <label>Short Name (display)</label>
                                <input type="text" value={service.short_name || ''} onChange={e => setService({ ...service, short_name: e.target.value })} maxLength={50} />
                            </div>
                            { name && (
                                <div className="field">
                                    <label>Rename service</label>
                                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} />
                                    <div style={{display:'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                                        <button className="btn-secondary" onClick={() => setNewName(service.name)} disabled={renaming}>Reset</button>
                                        <button className="btn-warning" onClick={handleRename} disabled={renaming}>{renaming ? 'Renaming...' : 'Rename'}</button>
                                    </div>
                                </div>
                            )}
                            <div className="field">
                                <label>
                                    <input type="checkbox" checked={service.is_bonus} onChange={e => setService({ ...service, is_bonus: e.target.checked })} /> Is Bonus Service
                                </label>
                            </div>
                            <div className="field">
                                <label>
                                    <input type="checkbox" checked={service.is_default || false} onChange={e => handleIsDefaultChange(e.target.checked)} /> Default Service (auto-assign to all techs)
                                </label>
                                {service.is_default && (
                                    <div style={{marginTop: '0.5rem', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)'}}>This service will be automatically assigned to all technicians. Manual overrides are allowed.</div>
                                )}
                            </div>
                            <div className="field">
                                <label>Qualified Technicians</label>
                                <div className="skills-grid">
                                    {techs.map(t => (
                                        <label key={t.alias} className="skill-checkbox">
                                            <input type="checkbox" checked={(service.qualified_techs || []).includes(t.alias)} onChange={() => toggleTech(t.alias)} />
                                            <span>{t.alias} {t.name ? `(${t.name})` : ''}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <div style={{marginRight: 'auto', display: 'flex', gap: '0.5rem'}}>
                        { name && (
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

export default ServiceProfile;
