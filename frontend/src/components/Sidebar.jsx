/**
 * Sidebar Component
 * Displays checklists and recommendation widgets
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { settingsService } from '../services';
import RecommendationWidget from './RecommendationWidget';
import './Sidebar.css';

function Sidebar({ dayData, onUpdate, onAddSeating }) {
    const [checklists, setChecklists] = useState({
        new_day_checklist: [],
        end_day_checklist: []
    });
    const [recommendationWidgets, setRecommendationWidgets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Load checklists when dayData changes
    useEffect(() => {
        if (dayData) {
            setChecklists({
                new_day_checklist: dayData.new_day_checklist || [],
                end_day_checklist: dayData.end_day_checklist || []
            });
            // Increment refreshKey to trigger recommendation reload
            setRefreshKey(prev => prev + 1);
        }
    }, [dayData]);

    // Load recommendation widget settings
    useEffect(() => {
        loadRecommendationSettings();
    }, []);

    const loadRecommendationSettings = async () => {
        try {
            const settings = await settingsService.getRecommendations();
            setRecommendationWidgets(settings.recommendation_widgets || []);
        } catch (err) {
            console.error('Failed to load recommendation settings:', err);
        }
    };

    const toggleChecklistItem = async (checklistType, index) => {
        if (!dayData || dayData.status === 'closed') {
            return; // Can't edit closed days
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.post(`/days/${dayData.date}/checklist/`, {
                checklist_type: checklistType,
                index: index
            });

            // Update local state
            setChecklists({
                new_day_checklist: response.new_day_checklist,
                end_day_checklist: response.end_day_checklist
            });

            // Notify parent to refresh
            if (onUpdate) {
                onUpdate();
            }
        } catch (err) {
            console.error('Failed to toggle checklist item:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!dayData) {
        return null;
    }

    const newDayComplete = checklists.new_day_checklist.every(item => item.completed);
    const endDayComplete = checklists.end_day_checklist.every(item => item.completed);
    const showNewDayChecklist = dayData.status === 'open' && !newDayComplete;
    const showEndDayChecklist = (dayData.status === 'ended' || dayData.status === 'closed');
    const showUnfreeze = dayData.status === 'ended' || dayData.status === 'closed';
    const showRecommendations = dayData.status === 'open';

    return (
        <div className="sidebar">
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* New Day Checklist - First */}
            {showNewDayChecklist && (
                <div className="checklist-section">
                    <h3>New Day Checklist</h3>
                    {checklists.new_day_checklist.length === 0 ? (
                        <div className="checklist-empty">
                            No checklist items configured
                        </div>
                    ) : (
                        <div className="checklist-items">
                            {checklists.new_day_checklist.map((item, index) => (
                                <div
                                    key={index}
                                    className={`checklist-item ${item.completed ? 'completed' : ''}`}
                                    onClick={() => toggleChecklistItem('new_day', index)}
                                >
                                    <div className="checklist-checkbox"></div>
                                    <div className="checklist-text">{item.text}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recommendation Widgets - Second, always visible when day is open */}
            {showRecommendations && (
                <div className="recommendations-section">
                    <h3>Recommendations</h3>
                    
                    {/* Always-visible widgets: Regular Turn and Bonus Turn */}
                    <RecommendationWidget
                        title="Regular Turn"
                        turnType="regular"
                        dayDate={dayData.date}
                        onAddSeating={onAddSeating}
                        skipSkillCheck={true}
                        refreshKey={refreshKey}
                    />
                    
                    <RecommendationWidget
                        title="Bonus Turn"
                        turnType="bonus"
                        dayDate={dayData.date}
                        onAddSeating={onAddSeating}
                        skipSkillCheck={true}
                        refreshKey={refreshKey}
                    />

                    {/* Service-specific widgets */}
                    {recommendationWidgets.map(serviceName => (
                        <RecommendationWidget
                            key={serviceName}
                            title={serviceName}
                            turnType="regular"
                            serviceName={serviceName}
                            dayDate={dayData.date}
                            onAddSeating={onAddSeating}
                            skipSkillCheck={false}
                            refreshKey={refreshKey}
                        />
                    ))}
                </div>
            )}

            {/* End Day Checklist - Third */}
            {showEndDayChecklist && (
                <div className="checklist-section">
                    <h3>End Day Checklist</h3>
                    {checklists.end_day_checklist.length === 0 ? (
                        <div className="checklist-empty">
                            No checklist items configured
                        </div>
                    ) : endDayComplete ? (
                        <div className="all-complete-message">
                            ✓ All items complete
                        </div>
                    ) : (
                        <div className="checklist-items">
                            {checklists.end_day_checklist.map((item, index) => (
                                <div
                                    key={index}
                                    className={`checklist-item ${item.completed ? 'completed' : ''}`}
                                    onClick={() => toggleChecklistItem('end_day', index)}
                                >
                                    <div className="checklist-checkbox"></div>
                                    <div className="checklist-text">{item.text}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {loading && (
                <div className="loading-indicator">
                    Updating...
                </div>
            )}
            {/* Unfreeze Button: visible after ending day; disabled once day is fully closed */}
            {showUnfreeze && (
                <div className="unfreeze-section">
                    <button
                        className="btn-secondary"
                        onClick={async () => {
                            if (!dayData || dayData.status === 'closed') return;
                            setLoading(true);
                            setError(null);
                            try {
                                await api.post(`/days/${dayData.date}/unfreeze/`);
                                if (onUpdate) onUpdate();
                            } catch (err) {
                                console.error('Failed to unfreeze day:', err);
                                setError(err.message || 'Failed to unfreeze day');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={dayData.status === 'closed' || loading}
                    >
                        {dayData.status === 'closed' ? 'Unfreeze (disabled - final)' : 'Unfreeze Day'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default Sidebar;
