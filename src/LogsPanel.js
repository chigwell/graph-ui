// LogsPanel.js
import React from 'react';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export const LogsPanel = ({ logs }) => {
  const [open, setOpen] = React.useState(true);

  return (
    <div style={{ margin: '20px 0', border: '1px solid #eee', padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => setOpen(!open)}>
          <ExpandMoreIcon style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        </IconButton>
        <h3>Logs</h3>
      </div>
      <Collapse in={open}>
        <pre style={{
          maxHeight: '200px',
          overflow: 'auto',
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px'
        }}>
          {logs.join('\n')}
        </pre>
      </Collapse>
    </div>
  );
};