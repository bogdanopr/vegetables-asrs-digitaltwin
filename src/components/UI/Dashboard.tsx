import { useEffect, useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Globe, Activity, RotateCcw, Send, Eye, EyeOff, Video } from 'lucide-react';
import { DataFeed } from './DataFeed';

export const Dashboard = () => {
    const { initInventory, systemStatus, taskQueue, chatHistory, sendUserMessage, resetSystem, viewMode, setViewMode } = useStore();
    const [inputText, setInputText] = useState('');
    const [showUI, setShowUI] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, showUI]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendUserMessage(inputText);
        setInputText('');
    };

    // Init on mount
    useEffect(() => {
        initInventory();
    }, []);

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: 'none', display: 'flex', flexDirection: 'column', padding: '40px',
            boxSizing: 'border-box'
        }}>

            {/* Header */}
            <div style={{ pointerEvents: 'auto', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ color: 'white', fontFamily: 'Inter, sans-serif', marginTop: 0 }}>
                        <Globe size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        AS/RS Digital Twin
                    </h1>
                    <div style={{ color: '#aaa' }}>Status: <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{systemStatus}</span></div>
                    <div style={{ color: '#aaa' }}>Queue: {taskQueue.length} items</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>

                    <button
                        onClick={resetSystem}
                        style={{
                            background: '#d32f2f', color: 'white', border: 'none', borderRadius: 8,
                            padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            fontWeight: 'bold'
                        }}
                    >
                        <RotateCcw size={16} /> Reset Scene
                    </button>

                    <button
                        onClick={() => setViewMode(viewMode === 'ORBIT' ? 'ROBOT' : 'ORBIT')}
                        style={{
                            background: viewMode === 'ROBOT' ? '#2196f3' : 'rgba(255,255,255,0.1)',
                            color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8,
                            padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            fontWeight: 'bold', backdropFilter: 'blur(5px)'
                        }}
                    >
                        <Video size={16} /> {viewMode === 'ORBIT' ? 'Robot Cam' : 'Orbit View'}
                    </button>

                    <button
                        onClick={() => setShowUI(!showUI)}
                        style={{
                            background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8,
                            padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            fontWeight: 'bold', backdropFilter: 'blur(5px)'
                        }}
                    >
                        {showUI ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showUI ? 'Hide UI' : 'Show UI'}
                    </button>
                </div>
            </div>

            {/* Command Center (Chat) - Bottom Center */}
            <div style={{ flex: 1 }} /> {/* Spacer */}

            {showUI && (
                <div style={{
                    pointerEvents: 'auto', alignSelf: 'center', width: '100%', maxWidth: '600px',
                    background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)',
                    borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}>
                    {/* Chat Header */}
                    <div style={{
                        padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <Activity size={16} color="#4caf50" />
                        <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Command Center</span>
                    </div>

                    {/* Messages Area */}
                    <div style={{
                        height: 250, overflowY: 'auto', padding: '15px 20px',
                        display: 'flex', flexDirection: 'column', gap: 12
                    }}>
                        {chatHistory.map((msg) => (
                            <div key={msg.id} style={{
                                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '8px 14px', borderRadius: 12,
                                background: msg.sender === 'user' ? '#2196f3' : 'rgba(255,255,255,0.08)',
                                color: msg.sender === 'user' ? 'white' : '#e0e0e0',
                                borderBottomRightRadius: msg.sender === 'user' ? 2 : 12,
                                borderBottomLeftRadius: msg.sender === 'bot' ? 2 : 12,
                                fontSize: 14, lineHeight: '1.4'
                            }}>
                                {msg.text}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: '15px 20px', display: 'flex', gap: 10 }}>
                        <input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a command (e.g. '3 tomatoes')..."
                            style={{
                                flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none',
                                color: 'white', padding: '10px 15px', borderRadius: 10, outline: 'none',
                                fontSize: 14
                            }}
                        />
                        <button
                            onClick={handleSend}
                            style={{
                                background: '#4caf50', color: 'white', border: 'none', borderRadius: 10,
                                width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'background 0.2s'
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Raw Data Feed */}
            <DataFeed />

        </div>
    );
};
