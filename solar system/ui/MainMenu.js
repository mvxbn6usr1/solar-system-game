/**
 * Main Menu system for Solar System Explorer
 * Provides the entry point and navigation between different game modes
 */
export class MainMenu {
    constructor() {
        this.container = null;
        this.isVisible = true;
        this.selectedMode = null;
        this.onModeSelect = null; // Callback for when a mode is selected
        
        this.initializeMenu();
    }
    
    initializeMenu() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'main-menu';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0a0a20 0%, #1a1a3a 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: 'Orbitron', monospace;
            overflow: hidden;
        `;
        
        // Add starfield background
        this.createStarfield();
        
        // Create logo/title
        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = `
            margin-bottom: 60px;
            text-align: center;
            z-index: 2;
        `;
        
        const title = document.createElement('h1');
        title.textContent = 'SOLAR QUEST';
        title.style.cssText = `
            font-size: 4em;
            color: #00ffcc;
            text-shadow: 0 0 20px rgba(0, 255, 204, 0.8),
                         0 0 40px rgba(0, 255, 204, 0.4);
            margin: 0;
            letter-spacing: 4px;
            animation: glow 2s ease-in-out infinite alternate;
        `;
        
        const subtitle = document.createElement('div');
        subtitle.textContent = 'YEAR 2356';
        subtitle.style.cssText = `
            font-size: 1.5em;
            color: #88ccff;
            margin-top: 10px;
            letter-spacing: 8px;
            opacity: 0.8;
        `;
        
        titleContainer.appendChild(title);
        titleContainer.appendChild(subtitle);
        this.container.appendChild(titleContainer);
        
        // Create menu options container
        const menuContainer = document.createElement('div');
        menuContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 20px;
            z-index: 2;
        `;
        
        // Menu options
        const menuOptions = [
            {
                id: 'new-game',
                title: 'NEW GAME',
                subtitle: 'Begin your journey with faction allegiances',
                icon: '🚀',
                color: '#00ff88'
            },
            {
                id: 'load-game',
                title: 'LOAD GAME',
                subtitle: 'Continue your saved adventure',
                icon: '💾',
                color: '#66aaff'
            },
            {
                id: 'solar-sim',
                title: 'SOLAR SYSTEM',
                subtitle: 'Explore the solar system in simulation mode',
                icon: '🪐',
                color: '#ffaa00'
            },
            {
                id: 'free-flight',
                title: 'FREE FLIGHT',
                subtitle: 'Jump straight into starship controls',
                icon: '✈️',
                color: '#ff66cc'
            },
            {
                id: 'settings',
                title: 'SETTINGS',
                subtitle: 'Configure graphics and controls',
                icon: '⚙️',
                color: '#88aaff'
            }
        ];
        
        menuOptions.forEach(option => {
            const button = this.createMenuButton(option);
            menuContainer.appendChild(button);
        });
        
        this.container.appendChild(menuContainer);
        
        // Add version info
        const versionInfo = document.createElement('div');
        versionInfo.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            color: #666;
            font-size: 0.9em;
            z-index: 2;
        `;
        versionInfo.textContent = 'v2356.1.0';
        this.container.appendChild(versionInfo);
        
        // Add CSS animations
        this.addAnimations();
        
        // Add to document
        document.body.appendChild(this.container);
    }
    
    createMenuButton(option) {
        const button = document.createElement('div');
        button.className = 'menu-button';
        button.dataset.mode = option.id;
        button.style.cssText = `
            width: 400px;
            padding: 25px 40px;
            background: rgba(20, 25, 40, 0.8);
            border: 2px solid ${option.color}40;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        `;
        
        // Icon
        const icon = document.createElement('div');
        icon.style.cssText = `
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 2em;
            opacity: 0.8;
        `;
        icon.textContent = option.icon;
        button.appendChild(icon);
        
        // Content container
        const content = document.createElement('div');
        content.style.cssText = `
            margin-left: 50px;
        `;
        
        // Title
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 1.4em;
            font-weight: bold;
            color: ${option.color};
            margin-bottom: 5px;
            letter-spacing: 2px;
        `;
        title.textContent = option.title;
        content.appendChild(title);
        
        // Subtitle
        const subtitle = document.createElement('div');
        subtitle.style.cssText = `
            font-size: 0.9em;
            color: #888;
            letter-spacing: 1px;
        `;
        subtitle.textContent = option.subtitle;
        content.appendChild(subtitle);
        
        button.appendChild(content);
        
        // Hover glow effect
        const glowEffect = document.createElement('div');
        glowEffect.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, ${option.color}40, transparent);
            transition: left 0.5s ease;
        `;
        button.appendChild(glowEffect);
        
        // Event handlers
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateX(10px)';
            button.style.borderColor = option.color;
            button.style.boxShadow = `0 0 20px ${option.color}40`;
            glowEffect.style.left = '100%';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateX(0)';
            button.style.borderColor = `${option.color}40`;
            button.style.boxShadow = 'none';
        });
        
        button.addEventListener('click', () => {
            this.selectMode(option.id);
        });
        
        return button;
    }
    
    createStarfield() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        `;
        this.container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Create stars
        const stars = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.1
            });
        }
        
        // Animate stars
        const animateStars = () => {
            if (!this.isVisible) return;
            
            ctx.fillStyle = 'rgba(10, 10, 32, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#ffffff';
            stars.forEach(star => {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
                
                star.y += star.speed;
                if (star.y > canvas.height) {
                    star.y = 0;
                    star.x = Math.random() * canvas.width;
                }
            });
            
            requestAnimationFrame(animateStars);
        };
        
        animateStars();
        
        // Handle resize
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }
    
    addAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes glow {
                from { text-shadow: 0 0 20px rgba(0, 255, 204, 0.8), 0 0 40px rgba(0, 255, 204, 0.4); }
                to { text-shadow: 0 0 30px rgba(0, 255, 204, 1), 0 0 60px rgba(0, 255, 204, 0.6); }
            }
            
            .menu-button {
                animation: slideIn 0.5s ease-out forwards;
                opacity: 0;
            }
            
            .menu-button:nth-child(1) { animation-delay: 0.1s; }
            .menu-button:nth-child(2) { animation-delay: 0.2s; }
            .menu-button:nth-child(3) { animation-delay: 0.3s; }
            .menu-button:nth-child(4) { animation-delay: 0.4s; }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    selectMode(mode) {
        this.selectedMode = mode;
        
        // Fade out animation
        this.container.style.transition = 'opacity 0.5s ease';
        this.container.style.opacity = '0';
        
        setTimeout(() => {
            this.hide();
            
            // Call the callback if set
            if (this.onModeSelect) {
                this.onModeSelect(mode);
            }
        }, 500);
    }
    
    show() {
        this.isVisible = true;
        this.container.style.display = 'flex';
        setTimeout(() => {
            this.container.style.opacity = '1';
        }, 10);
    }
    
    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
    }
}

// Create singleton instance
export const mainMenu = new MainMenu(); 