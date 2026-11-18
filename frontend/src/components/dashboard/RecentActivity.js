import React from 'react';
import Badge from '../ui/Badge';
import './RecentActivity.css';

const RecentActivity = ({ activities = [], title = 'Recent Activity' }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="recent-activity">
        <h3 className="recent-activity-title">{title}</h3>
        <p className="empty-state">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="recent-activity">
      <div className="recent-activity-header">
        <h3 className="recent-activity-title">{title}</h3>
        <button className="view-all">View All</button>
      </div>
      <div className="activity-list">
        {activities.map((activity, index) => (
          <div key={index} className="activity-item">
            <div className="activity-icon">{activity.icon || '📋'}</div>
            <div className="activity-content">
              <p className="activity-text">{activity.text}</p>
              <span className="activity-time">{activity.time}</span>
            </div>
            {activity.status && <Badge variant={activity.status}>{activity.status}</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;