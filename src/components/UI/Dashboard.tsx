import { useEffect, useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import type { VegetableType } from '../../types';
import { VEGETABLE_COLORS } from '../../types';
import { ShoppingBag, Globe, Activity } from 'lucide-react'; // Example icons

export const Dashboard = () => {
    const { initInventory, placeOrder, logs, systemStatus, taskQueue, deliveredItems, chatHistory, sendUserMessage } = useStore();
    const [inputText, setInputText] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendUserMessage(inputText);
        setInputText('');
    };

    // Init on mount
    useEffect(() => {
        initInventory();
    }, []);

    const handleOrder = (type: VegetableType) => {
        placeOrder([type]);
    };

    const handleMultiOrder = () => {
        placeOrder(['Tomato', 'Lettuce', 'Corn']); // Preset menu
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: 'none', display: 'flex', flexDirection: 'column', padding: '20px'
        }}>

            {/* Header */}
            <div style={{ pointerEvents: 'auto', marginBottom: '20px' }}>
                <h1 style={{ color: 'white', fontFamily: 'Inter, sans-serif' }}>
                    <Globe size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Restaurant AS/RS Digital Twin
                </h1>
                <div style={{ color: '#aaa' }}>Status: <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{systemStatus}</span></div>
                <div style={{ color: '#aaa' }}>Queue: {taskQueue.length} items</div>
            </div>

            {/* Controls */}
            <div style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.8)', padding: 20, borderRadius: 12, width: 300 }}>
                <h3 style={{ color: 'white', marginTop: 0 }}>Place Order</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {(Object.keys(VEGETABLE_COLORS) as VegetableType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => handleOrder(type)}
                            style={{
                                background: '#333', border: `2px solid ${VEGETABLE_COLORS[type]}`,
                                color: 'white', padding: 10, borderRadius: 8, cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Order {type}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleMultiOrder}
                    style={{ width: '100%', marginTop: 10, padding: 10, background: '#2196f3', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                >
                    <ShoppingBag size={16} style={{ verticalAlign: 'middle' }} /> Order Salad Combo
                </button>
            </div>

            {/* Chat Interface */}
            <div style={{
                pointerEvents: 'auto', marginTop: 'auto', background: 'rgba(0,0,0,0.85)',
                padding: 15, borderRadius: 12, height: 300, display: 'flex', flexDirection: 'column'
            }}>
                <h4 style={{ color: 'white', marginTop: 0, marginBottom: 10, borderBottom: '1px solid #444', paddingBottom: 5 }}>
                    <Activity size={16} style={{ verticalAlign: 'middle' }} /> Warehouse Assistant
                </h4>

                {/* Messages Area */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {chatHistory.map((msg) => (
                        <div key={msg.id} style={{
                            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            background: msg.sender === 'user' ? '#2196f3' : '#333',
                            color: 'white', padding: '6px 12px', borderRadius: 8, maxWidth: '80%',
                            fontSize: 14
                        }}>
                            {msg.text}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="e.g. 'I want 3 tomatoes and 2 corn'"
                        style={{
                            flex: 1, background: '#222', border: '1px solid #444',
                            color: 'white', padding: 8, borderRadius: 6, outline: 'none'
                        }}
                    />
                    <button
                        onClick={handleSend}
                        style={{ background: '#4caf50', color: 'white', border: 'none', borderRadius: 6, padding: '0 15px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Send
                    </button>
                </div>
            </div>

            {/* Delivered */}
            <div style={{ position: 'absolute', right: 20, bottom: 20, background: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 12 }}>
                <h4 style={{ color: 'white', marginTop: 0 }}>Delivered</h4>
                <div style={{ display: 'flex', gap: 5 }}>
                    {deliveredItems.map((item, i) => (
                        <div key={i} style={{ width: 20, height: 20, background: VEGETABLE_COLORS[item.type], borderRadius: 4 }} title={item.type} />
                    ))}
                </div>
            </div>

        </div>
    );
};
