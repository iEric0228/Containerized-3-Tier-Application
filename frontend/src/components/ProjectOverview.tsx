import React from 'react';

interface ProjectOverviewProps {
  summary: string;
  goals: string[];
  outcomes: { result: string }[];
  benefits: { benefit: string; description: string }[];
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ summary, goals, outcomes, benefits }) => (
  <section className="overview-section fade-in-up delay-5" aria-label="Project Overview">
    <h2 className="section-title">
      Project Overview &amp; Impact
    </h2>

    <div className="overview-content">
      <div className="project-summary">
        <h3>Project Summary</h3>
        <p>{summary}</p>
      </div>

      <div className="goals-outcomes-grid">
        <div className="goals-column">
          <h3>Project Goals</h3>
          <ul className="goals-list">
            {goals.map((goal, i) => (
              <li key={i} className="goal-item">
                <span className="bullet">&rsaquo;</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
        <div className="outcomes-column">
          <h3>Key Outcomes</h3>
          <div className="outcomes-list">
            {outcomes.map((o, i) => (
              <div key={i} className="outcome-item">
                <span className="outcome-marker"></span>
                <span className="outcome-text">{o.result}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="benefits-grid">
        <h3>Project Benefits</h3>
        <div className="benefits-cards">
          {benefits.map((b, i) => (
            <div key={i} className="benefit-card compact">
              <div className="benefit-header">
                <strong>{b.benefit}</strong>
              </div>
              <p>{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ProjectOverview;
