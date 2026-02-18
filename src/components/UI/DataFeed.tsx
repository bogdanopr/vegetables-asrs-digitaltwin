import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Terminal } from 'lucide-react';

export const DataFeed = () => {
    const logs = useStore(state => state.logs);
    const endRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-scroll to bottom of feed
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div style={{
            position: 'absolute',
            left: isMobile ? 10 : 20,
            right: isMobile ? 10 : 'auto',
            top: isMobile ? 'auto' : 100,
            bottom: isMobile ? 100 : 40,
            width: isMobile ? 'auto' : 350,
            height: isMobile ? 150 : 'auto',
            pointerEvents: 'auto',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: 12,
            border: '1px solid rgba(0, 255, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: '"Fira Code", monospace',
            boxShadow: '0 0 20px rgba(0, 255, 0, 0.1)',
            zIndex: 10
        }}>
            {/* Header */}
            <div style={{
                padding: isMobile ? '6px 10px' : '10px 15px',
                borderBottom: '1px solid rgba(0, 255, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(0, 255, 0, 0.05)'
            }}>
                <Terminal size={14} color="#4caf50" />
                <span style={{ color: '#4caf50', fontSize: isMobile ? 10 : 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>
                    System_Log::Stream
                </span>
            </div>

            {/* Logs Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: isMobile ? '8px 12px' : '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
            }}>
                {logs.slice().reverse().map((log, i) => (
                    <div key={i} style={{
                        fontSize: isMobile ? 9 : 11,
                        lineHeight: '1.4',
                        color: log.includes('Error') ? '#ff4444' : '#e0e0e0',
                        display: 'flex',
                        gap: 6
                    }}>
                        <span style={{ color: '#666', minWidth: 20 }}>[{i + 1}]</span>
                        <span>{log}</span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            {/* Footer Status */}
            {!isMobile && (
                <div style={{
                    padding: '6px 15px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    fontSize: 10,
                    color: '#666',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>STATUS: ONLINE</span>
                    <span>BAUD: 9600</span>
                </div>
            )}
        </div>
    );
};
