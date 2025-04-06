// TableView.js
import React from 'react';
import Button from '@mui/material/Button';

export const TableView = ({ data, onExport }) => (
  <div style={{ margin: '20px 0' }}>
    <Button variant="contained" onClick={onExport} style={{ marginBottom: 10 }}>
      Export CSV
    </Button>
    <div style={{ border: '1px solid #ddd', padding: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr align="left">
            <th>Node 1</th>
            <th>Connection</th>
            <th>Node 2</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.node1}</td>
              <td>{row.connection}</td>
              <td>{row.node2}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);