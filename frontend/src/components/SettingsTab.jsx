/**
 * Settings Tab Component
 * Manages checklist configuration
 */
import { useState, useEffect } from 'react';
import { settingsService } from '../services';
import './SettingsTab.css';

function SettingsTab() {
    const [newDayChecklist, setNewDayChecklist] = useState([]);
    const [endDayChecklist, setEndDayChecklist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingChecklist, setEditingChecklist] = useState(null); // 'new' or 'end'
    const [newItem, setNewItem] = useState('');

    useEffect(() => {
        loadChecklists();
    }, []);

    const loadChecklists = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await settingsService.getChecklists();
            setNewDayChecklist(data.new_day_checklist || []);
            setEndDayChecklist(data.end_day_checklist || []);
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to load checklists');
        } finally {
            setLoading(false);
        }
    };

    const saveChecklists = async () => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await settingsService.updateChecklists({
                new_day_checklist: newDayChecklist,
                end_day_checklist: endDayChecklist,
            });
            setSuccess('Checklists saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to save checklists');
        } finally {
            setSaving(false);
        }
    };

    const handleAddItem = (checklistType) => {
        if (!newItem.trim()) return;

        if (checklistType === 'new') {
            setNewDayChecklist([...newDayChecklist, newItem.trim()]);
        } else {
            setEndDayChecklist([...endDayChecklist, newItem.trim()]);
        }
        
        setNewItem('');
        setEditingChecklist(null);
    };

    const handleEditItem = (checklistType, index, newValue) => {
        if (checklistType === 'new') {
            const updated = [...newDayChecklist];
            updated[index] = newValue;
            setNewDayChecklist(updated);
        } else {
            const updated = [...endDayChecklist];
            updated[index] = newValue;
            setEndDayChecklist(updated);
        }
    };

    const handleDeleteItem = (checklistType, index) => {
        if (checklistType === 'new') {
            setNewDayChecklist(newDayChecklist.filter((_, i) => i !== index));
        } else {
            setEndDayChecklist(endDayChecklist.filter((_, i) => i !== index));
        }
    };

    const handleMoveItem = (checklistType, index, direction) => {
        const checklist = checklistType === 'new' ? newDayChecklist : endDayChecklist;
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= checklist.length) return;

        const updated = [...checklist];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

        if (checklistType === 'new') {
            setNewDayChecklist(updated);
        } else {
            setEndDayChecklist(updated);
        }
    };

    if (loading) {
        return <div className="settings-loading">Loading settings...</div>;
    }

    return (
        <div className="settings-tab">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="settings-content">
                <div className="checklists-container">
                {/* New Day Checklist */}
                <div className="checklist-section">
                    <div className="checklist-header">
                        <h4>New Day Checklist</h4>
                        <button
                            className="btn-secondary btn-small"
                            onClick={() => setEditingChecklist('new')}
                        >
                            + Add Item
                        </button>
                    </div>

                    {editingChecklist === 'new' && (
                        <div className="add-item-form">
                            <input
                                type="text"
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                placeholder="Enter checklist item..."
                                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('new')}
                                autoFocus
                            />
                            <button className="btn-primary" onClick={() => handleAddItem('new')}>
                                Add
                            </button>
                            <button className="btn-secondary" onClick={() => {
                                setNewItem('');
                                setEditingChecklist(null);
                            }}>
                                Cancel
                            </button>
                        </div>
                    )}

                    <div className="checklist-items">
                        {newDayChecklist.length === 0 ? (
                            <p className="empty-message">No items. Add your first checklist item.</p>
                        ) : (
                            newDayChecklist.map((item, index) => (
                                <ChecklistItem
                                    key={index}
                                    item={item}
                                    index={index}
                                    checklistType="new"
                                    onEdit={handleEditItem}
                                    onDelete={handleDeleteItem}
                                    onMove={handleMoveItem}
                                    isFirst={index === 0}
                                    isLast={index === newDayChecklist.length - 1}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* End Day Checklist */}
                <div className="checklist-section">
                    <div className="checklist-header">
                        <h4>End Day Checklist</h4>
                        <button
                            className="btn-secondary btn-small"
                            onClick={() => setEditingChecklist('end')}
                        >
                            + Add Item
                        </button>
                    </div>

                    {editingChecklist === 'end' && (
                        <div className="add-item-form">
                            <input
                                type="text"
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                placeholder="Enter checklist item..."
                                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('end')}
                                autoFocus
                            />
                            <button className="btn-primary" onClick={() => handleAddItem('end')}>
                                Add
                            </button>
                            <button className="btn-secondary" onClick={() => {
                                setNewItem('');
                                setEditingChecklist(null);
                            }}>
                                Cancel
                            </button>
                        </div>
                    )}

                    <div className="checklist-items">
                        {endDayChecklist.length === 0 ? (
                            <p className="empty-message">No items. Add your first checklist item.</p>
                        ) : (
                            endDayChecklist.map((item, index) => (
                                <ChecklistItem
                                    key={index}
                                    item={item}
                                    index={index}
                                    checklistType="end"
                                    onEdit={handleEditItem}
                                    onDelete={handleDeleteItem}
                                    onMove={handleMoveItem}
                                    isFirst={index === 0}
                                    isLast={index === endDayChecklist.length - 1}
                                />
                            ))
                        )}
                    </div>
                </div>
                </div>

                <div className="save-container">
                    <button
                        className="btn-primary save-bottom"
                        onClick={saveChecklists}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Checklist Item Component
function ChecklistItem({ item, index, checklistType, onEdit, onDelete, onMove, isFirst, isLast }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(item);

    const handleSave = () => {
        if (editValue.trim()) {
            onEdit(checklistType, index, editValue.trim());
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setEditValue(item);
        setIsEditing(false);
    };

    return (
        <div className="checklist-item">
            {isEditing ? (
                <div className="item-edit-form">
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                        autoFocus
                    />
                    <button className="btn-small btn-primary" onClick={handleSave}>
                        Save
                    </button>
                    <button className="btn-small btn-secondary" onClick={handleCancel}>
                        Cancel
                    </button>
                </div>
            ) : (
                <>
                    <span className="item-text">{item}</span>
                    <div className="item-actions">
                        <button
                            className="btn-icon"
                            onClick={() => onMove(checklistType, index, 'up')}
                            disabled={isFirst}
                            title="Move up"
                        >
                            ↑
                        </button>
                        <button
                            className="btn-icon"
                            onClick={() => onMove(checklistType, index, 'down')}
                            disabled={isLast}
                            title="Move down"
                        >
                            ↓
                        </button>
                        <button
                            className="btn-icon"
                            onClick={() => setIsEditing(true)}
                            title="Edit"
                        >
                            ✏️
                        </button>
                        <button
                            className="btn-icon btn-danger"
                            onClick={() => onDelete(checklistType, index)}
                            title="Delete"
                        >
                            🗑️
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default SettingsTab;
