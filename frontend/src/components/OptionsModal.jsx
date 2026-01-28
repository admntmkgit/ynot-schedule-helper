/**
 * Phase 3: Options Modal Component
 * Contains Tech Tab and Service Tab for managing technicians and services
 */
import { useState } from 'react';
import './OptionsModal.css';
import TechTab from './TechTab';
import ServiceTab from './ServiceTab';
import SettingsTab from './SettingsTab';
import DayTableSettings from './DayTableSettings';
import RecommendationSettings from './RecommendationSettings';
import UsersTab from './UsersTab';

function OptionsModal({ onClose }) {
    const [activeTab, setActiveTab] = useState('tech');

    return (
        <div className="modal-overlay options-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Options</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-tabs">
                    <button 
                        className={`tab-button ${activeTab === 'tech' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tech')}
                    >
                        Technicians
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'service' ? 'active' : ''}`}
                        onClick={() => setActiveTab('service')}
                    >
                        Services
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'daytable' ? 'active' : ''}`}
                        onClick={() => setActiveTab('daytable')}
                    >
                        Day Table
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        Checklists
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('recommendations')}
                    >
                        Recommendations
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Users
                    </button>
                </div>

                <div className="modal-body">
                    {activeTab === 'tech' && <TechTab />}
                    {activeTab === 'service' && <ServiceTab />}
                    {activeTab === 'daytable' && <DayTableSettings />}
                    {activeTab === 'settings' && <SettingsTab />}
                    {activeTab === 'recommendations' && <RecommendationSettings />}
                    {activeTab === 'users' && <UsersTab />}
                </div>
            </div>
        </div>
    );
}

export default OptionsModal;
