/**
 * Phase 10: Users Tab Component
 * User management in Options modal - list, create, edit, delete users
 */
import { useState, useEffect } from 'react';
import './UsersTab.css';
import { userService } from '../services';

function UsersTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', pin: '', pin_confirm: '' });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers();
            setUsers(data);
            setError('');
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormError('');
    };

    const handleAddNew = () => {
        setEditingUser(null);
        setFormData({ name: '', pin: '', pin_confirm: '' });
        setFormError('');
        setShowForm(true);
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({ name: user.name, pin: '', pin_confirm: '' });
        setFormError('');
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingUser(null);
        setFormData({ name: '', pin: '', pin_confirm: '' });
        setFormError('');
    };

    const extractErrorMessage = (err) => {
        if (err.data) {
            // DRF validation errors
            const errors = [];
            for (const [field, messages] of Object.entries(err.data)) {
                if (Array.isArray(messages)) {
                    errors.push(`${field}: ${messages.join(', ')}`);
                } else if (typeof messages === 'string') {
                    errors.push(`${field}: ${messages}`);
                }
            }
            if (errors.length > 0) return errors.join('; ');
        }
        return err.message || 'An error occurred';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSubmitting(true);

        try {
            if (editingUser) {
                // Update existing user
                const updateData = { name: formData.name };
                if (formData.pin) {
                    updateData.pin = formData.pin;
                    updateData.pin_confirm = formData.pin_confirm;
                }
                await userService.updateUser(editingUser.id, updateData);
            } else {
                // Create new user
                if (!formData.pin) {
                    setFormError('PIN is required for new users');
                    setSubmitting(false);
                    return;
                }
                await userService.createUser(formData);
            }
            
            await loadUsers();
            handleCancel();
        } catch (err) {
            setFormError(extractErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (user) => {
        if (deleteConfirm !== user.id) {
            setDeleteConfirm(user.id);
            return;
        }

        try {
            await userService.deleteUser(user.id);
            await loadUsers();
            setDeleteConfirm(null);
        } catch (err) {
            setError(extractErrorMessage(err));
        }
    };

    if (loading) {
        return <div className="users-tab"><div className="loading">Loading users...</div></div>;
    }

    return (
        <div className="users-tab">
            <div className="users-header">
                <h3>User Management</h3>
                <button className="btn-primary" onClick={handleAddNew}>
                    + Add User
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* User Form */}
            {showForm && (
                <div className="user-form">
                    <h4>{editingUser ? 'Edit User' : 'Create New User'}</h4>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="user-name">Name:</label>
                            <input
                                id="user-name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter user name"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="user-pin">
                                PIN: {editingUser && <span className="hint">(leave blank to keep current)</span>}
                            </label>
                            <input
                                id="user-pin"
                                type="password"
                                name="pin"
                                value={formData.pin}
                                onChange={handleInputChange}
                                placeholder="Enter 4+ digit PIN"
                                minLength={4}
                                pattern="[0-9]*"
                                inputMode="numeric"
                                required={!editingUser}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="user-pin-confirm">Confirm PIN:</label>
                            <input
                                id="user-pin-confirm"
                                type="password"
                                name="pin_confirm"
                                value={formData.pin_confirm}
                                onChange={handleInputChange}
                                placeholder="Confirm PIN"
                                minLength={4}
                                pattern="[0-9]*"
                                inputMode="numeric"
                                required={!editingUser || formData.pin}
                            />
                        </div>
                        {formError && <div className="error-message">{formError}</div>}
                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={handleCancel}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={submitting}>
                                {submitting ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* User List */}
            <div className="users-list">
                {users.length === 0 ? (
                    <div className="no-users">No users created yet. Click "Add User" to create one.</div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.name}</td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="actions">
                                        <button 
                                            className="btn-small btn-secondary" 
                                            onClick={() => handleEdit(user)}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            className={`btn-small ${deleteConfirm === user.id ? 'btn-danger-confirm' : 'btn-danger'}`}
                                            onClick={() => handleDelete(user)}
                                        >
                                            {deleteConfirm === user.id ? 'Confirm?' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default UsersTab;
