// Futuristic UI Components - Year 2356
// High-tech holographic-style interface elements

export class FuturisticUI {
    constructor() {
        this.primaryColor = '#00ffcc';
        this.secondaryColor = '#ff6b00';
        this.dangerColor = '#ff3366';
        this.backgroundColor = 'rgba(0, 10, 20, 0.85)';
        this.glowIntensity = 2;
        
        this.createStyles();
    }
    
    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Futuristic UI Base Styles */
            .futuristic-panel {
                background: linear-gradient(135deg, rgba(0, 20, 40, 0.9), rgba(0, 10, 30, 0.95));
                border: 1px solid ${this.primaryColor}40;
                border-radius: 0;
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(10px);
                box-shadow: 
                    0 0 20px ${this.primaryColor}20,
                    inset 0 0 20px rgba(0, 255, 204, 0.05);
            }
            
            /* Animated corner brackets */
            .futuristic-panel::before,
            .futuristic-panel::after {
                content: '';
                position: absolute;
                width: 20px;
                height: 20px;
                border: 2px solid ${this.primaryColor};
                animation: pulse-glow 2s ease-in-out infinite;
            }
            
            .futuristic-panel::before {
                top: 0;
                left: 0;
                border-right: none;
                border-bottom: none;
            }
            
            .futuristic-panel::after {
                bottom: 0;
                right: 0;
                border-left: none;
                border-top: none;
            }
            
            /* Holographic headers */
            .holo-header {
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    ${this.primaryColor}20 20%, 
                    ${this.primaryColor}40 50%, 
                    ${this.primaryColor}20 80%, 
                    transparent 100%);
                border-bottom: 1px solid ${this.primaryColor}60;
                padding: 12px 20px;
                font-family: 'Orbitron', monospace;
                font-size: 16px;
                text-transform: uppercase;
                letter-spacing: 3px;
                color: ${this.primaryColor};
                text-shadow: 0 0 10px ${this.primaryColor}80;
                position: relative;
                overflow: hidden;
            }
            
            /* Scanning line effect */
            .holo-header::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    ${this.primaryColor}40 50%, 
                    transparent 100%);
                animation: scan-line 4s linear infinite;
            }
            
            /* Data displays */
            .data-readout {
                font-family: 'Courier New', monospace;
                color: ${this.primaryColor};
                background: rgba(0, 255, 204, 0.05);
                border: 1px solid ${this.primaryColor}30;
                padding: 8px 12px;
                margin: 4px 0;
                position: relative;
                overflow: hidden;
            }
            
            .data-readout::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: ${this.primaryColor};
                animation: data-flow 2s linear infinite;
            }
            
            /* Interactive buttons */
            .holo-button {
                background: linear-gradient(135deg, 
                    rgba(0, 255, 204, 0.1) 0%, 
                    rgba(0, 255, 204, 0.2) 100%);
                border: 1px solid ${this.primaryColor}60;
                color: ${this.primaryColor};
                padding: 10px 20px;
                font-family: 'Orbitron', monospace;
                text-transform: uppercase;
                letter-spacing: 2px;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .holo-button:hover {
                background: linear-gradient(135deg, 
                    rgba(0, 255, 204, 0.2) 0%, 
                    rgba(0, 255, 204, 0.3) 100%);
                border-color: ${this.primaryColor};
                text-shadow: 0 0 10px ${this.primaryColor};
                box-shadow: 
                    0 0 20px ${this.primaryColor}40,
                    inset 0 0 20px ${this.primaryColor}20;
            }
            
            .holo-button:active {
                transform: scale(0.95);
            }
            
            /* Warning states */
            .warning-state {
                animation: warning-pulse 1s ease-in-out infinite;
                border-color: ${this.secondaryColor} !important;
                color: ${this.secondaryColor} !important;
            }
            
            .danger-state {
                animation: danger-flash 0.5s ease-in-out infinite;
                border-color: ${this.dangerColor} !important;
                color: ${this.dangerColor} !important;
            }
            
            /* Circular progress indicators */
            .circular-progress {
                width: 100px;
                height: 100px;
                position: relative;
            }
            
            .circular-progress svg {
                transform: rotate(-90deg);
            }
            
            .circular-progress-track {
                fill: none;
                stroke: ${this.primaryColor}20;
                stroke-width: 4;
            }
            
            .circular-progress-fill {
                fill: none;
                stroke: ${this.primaryColor};
                stroke-width: 4;
                stroke-linecap: round;
                stroke-dasharray: 251.2;
                stroke-dashoffset: 251.2;
                transition: stroke-dashoffset 0.5s ease;
                filter: drop-shadow(0 0 5px ${this.primaryColor});
            }
            
            /* Holographic lists */
            .holo-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .holo-list-item {
                padding: 10px 15px;
                border-bottom: 1px solid ${this.primaryColor}20;
                position: relative;
                transition: all 0.2s ease;
            }
            
            .holo-list-item:hover {
                background: ${this.primaryColor}10;
                padding-left: 25px;
            }
            
            .holo-list-item::before {
                content: '▸';
                position: absolute;
                left: 5px;
                color: ${this.primaryColor};
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .holo-list-item:hover::before {
                opacity: 1;
            }
            
            /* Glitch effects */
            .glitch {
                position: relative;
            }
            
            .glitch::before,
            .glitch::after {
                content: attr(data-text);
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0.8;
            }
            
            .glitch::before {
                animation: glitch-anim 0.3s infinite linear alternate-reverse;
                color: ${this.secondaryColor};
                z-index: -1;
            }
            
            .glitch::after {
                animation: glitch-anim 0.3s infinite linear alternate-reverse;
                animation-delay: 0.15s;
                color: ${this.primaryColor};
                z-index: -1;
            }
            
            /* Animations */
            @keyframes pulse-glow {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
            }
            
            @keyframes scan-line {
                0% { left: -100%; }
                100% { left: 100%; }
            }
            
            @keyframes data-flow {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            @keyframes warning-pulse {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
            
            @keyframes danger-flash {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            @keyframes glitch-anim {
                0% { transform: translateX(0); }
                20% { transform: translateX(-2px); }
                40% { transform: translateX(2px); }
                60% { transform: translateX(-1px); }
                80% { transform: translateX(1px); }
                100% { transform: translateX(0); }
            }
            
            /* Load Google Fonts */
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        `;
        document.head.appendChild(style);
    }
    
    createPanel(options = {}) {
        const panel = document.createElement('div');
        panel.className = 'futuristic-panel';
        
        if (options.title) {
            const header = document.createElement('div');
            header.className = 'holo-header';
            header.textContent = options.title;
            panel.appendChild(header);
        }
        
        if (options.className) {
            panel.classList.add(options.className);
        }
        
        return panel;
    }
    
    createButton(text, onClick, options = {}) {
        const button = document.createElement('button');
        button.className = 'holo-button';
        button.textContent = text;
        button.onclick = onClick;
        
        if (options.className) {
            button.classList.add(options.className);
        }
        
        if (options.danger) {
            button.classList.add('danger-state');
        } else if (options.warning) {
            button.classList.add('warning-state');
        }
        
        return button;
    }
    
    createDataReadout(label, value, options = {}) {
        const readout = document.createElement('div');
        readout.className = 'data-readout';
        
        const labelSpan = document.createElement('span');
        labelSpan.style.opacity = '0.7';
        labelSpan.textContent = label + ': ';
        
        const valueSpan = document.createElement('span');
        valueSpan.style.fontWeight = 'bold';
        valueSpan.textContent = value;
        
        readout.appendChild(labelSpan);
        readout.appendChild(valueSpan);
        
        if (options.warning && parseFloat(value) < 30) {
            readout.classList.add('warning-state');
        } else if (options.danger && parseFloat(value) < 10) {
            readout.classList.add('danger-state');
        }
        
        return readout;
    }
    
    createCircularProgress(percentage, label) {
        const container = document.createElement('div');
        container.className = 'circular-progress';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100');
        svg.setAttribute('height', '100');
        
        // Background circle
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', '50');
        bgCircle.setAttribute('cy', '50');
        bgCircle.setAttribute('r', '40');
        bgCircle.classList.add('circular-progress-track');
        
        // Progress circle
        const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        progressCircle.setAttribute('cx', '50');
        progressCircle.setAttribute('cy', '50');
        progressCircle.setAttribute('r', '40');
        progressCircle.classList.add('circular-progress-fill');
        
        // Calculate stroke-dashoffset
        const circumference = 2 * Math.PI * 40;
        const offset = circumference - (percentage / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
        
        svg.appendChild(bgCircle);
        svg.appendChild(progressCircle);
        container.appendChild(svg);
        
        // Add label
        const labelDiv = document.createElement('div');
        labelDiv.style.position = 'absolute';
        labelDiv.style.top = '50%';
        labelDiv.style.left = '50%';
        labelDiv.style.transform = 'translate(-50%, -50%)';
        labelDiv.style.textAlign = 'center';
        labelDiv.style.color = this.primaryColor;
        labelDiv.innerHTML = `<div style="font-size: 24px; font-weight: bold;">${percentage}%</div><div style="font-size: 12px; opacity: 0.7;">${label}</div>`;
        container.appendChild(labelDiv);
        
        return container;
    }
    
    createNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'starship-notification';
        
        // Map type to notification type
        let notificationType = 'info';
        if (type === 'danger') {
            notificationType = 'damage';
        } else if (type === 'success') {
            notificationType = 'repair';
        } else if (type === 'warning') {
            notificationType = 'warning';
        } else {
            notificationType = 'autopilot'; // Default info style
        }
        
        notification.classList.add(`notification-${notificationType}`);
        
        // Create the notification structure
        notification.innerHTML = `
            <div class="notification-border"></div>
            <div class="notification-content">
                <span class="notification-text">${message}</span>
            </div>
            <div class="notification-glow"></div>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            transform: translateX(20px);
            font-family: 'Orbitron', monospace;
            font-size: 0.95em;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            padding: 0;
            background: transparent;
            border: none;
            pointer-events: none;
            opacity: 0;
            z-index: 10000;
            min-width: 350px;
            max-width: 450px;
            text-align: center;
            animation: notification-slide-in 0.3s ease-out forwards;
        `;
        
        document.body.appendChild(notification);
        
        // Add slide-in animation
        const slideInStyle = document.createElement('style');
        slideInStyle.textContent = `
            @keyframes notification-slide-in {
                0% {
                    opacity: 0;
                    transform: translateX(100px);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes notification-slide-out {
                0% {
                    opacity: 1;
                    transform: translateX(0);
                }
                100% {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
        `;
        if (!document.querySelector('#notification-animations')) {
            slideInStyle.id = 'notification-animations';
            document.head.appendChild(slideInStyle);
        }
        
        // Trigger fade out after delay
        setTimeout(() => {
            notification.style.animation = 'notification-slide-out 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
        
        return notification;
    }
} 