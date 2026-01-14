/**
 * Recommendation Widget Component
 * Displays tech recommendations with expand/collapse and quick actions
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import './RecommendationWidget.css';

function RecommendationWidget({ 
    title, 
    turnType, 
    serviceName = null, 
    dayDate, 
    onAddSeating,
    skipSkillCheck = false,
    refreshKey = 0
}) {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const [hoveredTech, setHoveredTech] = useState(null);

    useEffect(() => {
        if (dayDate) {
            loadRecommendations();
        }
    }, [dayDate, serviceName, turnType, refreshKey]);

    const loadRecommendations = async () => {
        setLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams();
            qs.set('turn_type', turnType);
            qs.set('skip_skill_check', skipSkillCheck ? 'true' : 'false');
            if (serviceName) qs.set('service', serviceName);

            const url = `/days/${dayDate}/recommend/?${qs.toString()}`;
            const data = await api.get(url);
            setRecommendations(data.recommendations || []);
        } catch (err) {
            console.error('Failed to load recommendations:', err);
            setError(err.message || 'Failed to load recommendations');
        } finally {
            setLoading(false);
        }
    };

    const handleTechDoubleClick = (tech) => {
        if (onAddSeating) {
            onAddSeating(tech.tech_alias, serviceName);
        }
    };

    const handleTitleClick = () => {
        setExpanded(!expanded);
    };

    const displayCount = expanded ? 6 : 2;
    const visibleRecommendations = recommendations.slice(0, displayCount);

    if (loading && recommendations.length === 0) {
        return (
            <div className="recommendation-widget loading">
                <div className="widget-title">{title}</div>
                <div className="widget-loading">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="recommendation-widget error">
                <div className="widget-title">{title}</div>
                <div className="widget-error">{error}</div>
            </div>
        );
    }

    return (
        <div className={`recommendation-widget ${expanded ? 'expanded' : ''}`}>
            <div 
                className="widget-title" 
                onClick={handleTitleClick}
            >
                {title}
                <span className="expand-indicator">{expanded ? '▼' : '▶'}</span>
            </div>

            <div className="widget-content">
                {visibleRecommendations.length === 0 ? (
                    <div className="widget-empty">No techs available</div>
                ) : (
                    visibleRecommendations.map((rec, index) => (
                        <div
                            key={rec.tech_alias}
                            className={`tech-item ${index === 0 ? 'top-recommendation' : ''}`}
                            onDoubleClick={() => handleTechDoubleClick(rec)}
                            onMouseEnter={() => setHoveredTech(rec.tech_alias)}
                            onMouseLeave={() => setHoveredTech(null)}
                            title="Double-click to add seating"
                        >
                            <div className="tech-info">
                                <span className="tech-rank">#{index + 1}</span>
                                <span className="tech-alias">{rec.tech_alias}</span>
                                {rec.tech_name && (
                                    <span className="tech-name">({rec.tech_name})</span>
                                )}
                            </div>

                            {hoveredTech === rec.tech_alias && (
                                <div className="tech-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Row:</span>
                                        <span className="detail-value">{rec.row_number}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Regular:</span>
                                        <span className="detail-value">{rec.regular_turns}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Bonus:</span>
                                        <span className="detail-value">{rec.bonus_turns}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Available:</span>
                                        <span className={`detail-value ${rec.priority_checks.availability.passed ? 'passed' : 'failed'}`}>
                                            {rec.priority_checks.availability.passed ? '✓' : '✗'}
                                        </span>
                                    </div>
                                    {!skipSkillCheck && serviceName && (
                                        <div className="detail-item">
                                            <span className="detail-label">Skill:</span>
                                            <span className={`detail-value ${rec.priority_checks.skill.passed ? 'passed' : 'failed'}`}>
                                                {rec.priority_checks.skill.passed ? '✓' : '✗'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* compact sidebar: helper text removed */}
        </div>
    );
}

export default RecommendationWidget;
