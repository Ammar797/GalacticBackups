// Welcome.jsx
import React from 'react';
import { X } from 'lucide-react';
import './welcome.css';

const Welcome = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-wrapper">
        
        
        <div className="modal-content">
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
          <div className="header">
            <h1>Galactic Explorer</h1>
            <p>Traverse the boundaries of space and time</p>
          </div>

          <div className="features-grid">
            <div className="feature-box">
              <div className="icon-box cyan">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                  <path d="M8 2L2 8l6 6M16 2l6 6-6 6" />
                  <path d="M2 8h20" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Pan Through Space</h3>
                <p>Explore galaxies with left-click</p>
              </div>
            </div>

            <div className="feature-box">
              <div className="icon-box purple">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
              </div>
              <div className="feature-text">
                <h3>Quantum Zoom</h3>
                <p>Dive deeper with mouse wheel</p>
              </div>
            </div>

            <div className="feature-box">
              <div className="icon-box blue">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4"/>
                </svg>
              </div>
              <div className="feature-text">
                <h3>Celestial Rotation</h3>
                <p>Orbit planets with right-click</p>
              </div>
            </div>

            <div className="feature-box">
              <div className="icon-box pink">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <div className="feature-text">
                <h3>Astral Search</h3>
                <p>Find cosmic paths instantly with wallet search</p>
              </div>
            </div>

            <div className="feature-box">
              <div className="icon-box rose">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="feature-text">
                <h3>Stellar Highlight</h3>
                <p>Watch selected transaction planets shine</p>
              </div>
            </div>

            <div className="feature-box">
              <div className="icon-box emerald">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <div className="feature-text">
                <h3>Universal Atlas</h3>
                <p>Chart your cosmic journey</p>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="launch-btn">
            Launch into the Cosmos
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;