import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// Component for Status Indicator
interface StatusIndicatorProps {
    status: 'running' | 'stopped' | 'starting' | 'error';
    message: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, message }) => {
    let colorClass = 'bg-gray-500';
    if (status === 'running') colorClass = 'bg-green-500';
    if (status === 'stopped') colorClass = 'bg-red-500';
    if (status === 'starting') colorClass = 'bg-yellow-500';
    if (status === 'error') colorClass = 'bg-orange-500';

    return (
        <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${colorClass} animate-pulse shadow-[0_0_10px_2px_rgba(255,255,255,0.2)]`}></div>
            <span className="text-gray-300 text-sm font-code">{message || status.toUpperCase()}</span>
        </div>
    );
};

export default StatusIndicator;
