import React from 'react';

const DashboardFooter: React.FC = () => (
  <footer className="dashboard-footer fade-in-up delay-8">
    <div className="footer-content">
      <div className="footer-section">
        <h4>DevOps Engineering</h4>
        <p>Building scalable, secure, and maintainable cloud infrastructure</p>
      </div>
      <div className="footer-section">
        <h4>Cloud Architecture</h4>
        <p>AWS certified solutions with Infrastructure as Code</p>
      </div>
      <div className="footer-section">
        <h4>CI/CD Excellence</h4>
        <p>Automated testing, deployment, and monitoring pipelines</p>
      </div>
    </div>
    <div className="footer-bottom">
      <p>Built with modern DevOps practices &bull; Ready for production deployment</p>
    </div>
  </footer>
);

export default DashboardFooter;
