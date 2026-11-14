import React from 'react';
import { Inbox } from 'lucide-react';
import '../styles/tables.css';

const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There is currently no data to display for this view or criteria.',
  action
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={28} />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-text">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;

