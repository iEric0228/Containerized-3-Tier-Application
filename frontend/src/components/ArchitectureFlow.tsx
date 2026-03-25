import React from 'react';

const TIERS = [
  { cls: 'frontend', title: 'Frontend Tier', tech: 'React + TypeScript', items: ['Nginx Web Server', 'SPA Architecture', 'Docker Container', 'Responsive UI'] },
  { cls: 'backend', title: 'Backend Tier', tech: 'Express.js + Node.js', items: ['RESTful APIs', 'Security Middleware', 'Docker Container', 'Health Endpoints'] },
  { cls: 'database', title: 'Database Tier', tech: 'PostgreSQL', items: ['ACID Compliance', 'Connection Pooling', 'Docker Container', 'Persistent Volumes'] },
];

const ARROWS = ['HTTPS / REST', 'Connection Pool'];

const ArchitectureFlow: React.FC = () => (
  <section className="architecture-section fade-in-up delay-3" aria-label="System Architecture">
    <h2 className="section-title">
      High-Level System Design
    </h2>
    <div className="architecture-flow">
      {TIERS.map((tier, i) => (
        <React.Fragment key={tier.cls}>
          {i > 0 && (
            <div className="flow-arrow">
              <div className="arrow-line"></div>
              <span>{ARROWS[i - 1]}</span>
            </div>
          )}
          <div className={`tier-card ${tier.cls}`}>
            <h3>{tier.title}</h3>
            <p>{tier.tech}</p>
            <div className="tier-tech">
              {tier.items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  </section>
);

export default ArchitectureFlow;
