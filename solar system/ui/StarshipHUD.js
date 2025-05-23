import { MiniMap } from './MiniMap.js';
import { EnhancedARLabelSystem } from './EnhancedARLabels.js';

// Starship HUD management system
export class StarshipHUD {
    constructor() {
        this.hudContainer = null;
        this.consoleLeft = null;
        this.consoleCenter = null;
        this.consoleRight = null;
        this.attitudeCanvas = null;
        this.hudMiniMap = null;
        this.hudInventory = null;
        this.isVisible = false;
        this.miniMap3D = null;
        this.tacticalPanel = null;
        this.arLabels = null;
        this.showARLabels = true; // Default to showing AR labels
        this.targetingOverlay = null;
        
        // AR Label settings
        this.arLabelSettings = {
            maxVisible: 15,
            rangeFilter: 50000,
            showPlanets: true,
            showMoons: false,
            showStations: true,
            showShips: true,
            showHostiles: true
        };
        
        this.initializeHUD();
    }
    
    initializeHUD() {
        // Create main HUD container
        this.hudContainer = document.createElement('div');
        this.hudContainer.id = 'starship-hud';
        this.hudContainer.style.position = 'fixed';
        this.hudContainer.style.top = '0';
        this.hudContainer.style.left = '0';
        this.hudContainer.style.width = '100%';
        this.hudContainer.style.height = '100%';
        this.hudContainer.style.pointerEvents = 'none';
        this.hudContainer.style.display = 'none';
        
        // Create cockpit frame elements
        this.createCockpitFrame();
        
        // Create main console
        this.createMainConsole();
        
        // Create HUD elements
        this.createHUDElements();
        
        // Initialize tactical panel with integrated 3D mini-map
        this.initializeTacticalPanel();
        
        // Add to document
        document.body.appendChild(this.hudContainer);
        
        // Create AR labels controls in navigation section after HUD is added to DOM
        this.createARLabelControls();
    }
    
    createCockpitFrame() {
        const frameBottom = document.createElement('div');
        frameBottom.className = 'cockpit-frame-bottom';
        this.hudContainer.appendChild(frameBottom);
        
        const frameLeft = document.createElement('div');
        frameLeft.className = 'cockpit-frame-left';
        this.hudContainer.appendChild(frameLeft);
        
        const frameRight = document.createElement('div');
        frameRight.className = 'cockpit-frame-right';
        this.hudContainer.appendChild(frameRight);
    }
    
    createMainConsole() {
        const cockpitConsole = document.createElement('div');
        cockpitConsole.className = 'cockpit-console';
        this.hudContainer.appendChild(cockpitConsole);
        
        // Left section - Systems
        this.consoleLeft = document.createElement('div');
        this.consoleLeft.className = 'console-section console-section-left';
        this.consoleLeft.innerHTML = '<div class="console-header">SYSTEMS</div>';
        cockpitConsole.appendChild(this.consoleLeft);
        
        // Center section - Flight
        this.consoleCenter = document.createElement('div');
        this.consoleCenter.className = 'console-section console-section-center';
        this.consoleCenter.innerHTML = '<div class="console-header">FLIGHT</div>';
        cockpitConsole.appendChild(this.consoleCenter);
        
        // Right section - Navigation
        this.consoleRight = document.createElement('div');
        this.consoleRight.className = 'console-section console-section-right';
        this.consoleRight.innerHTML = '<div class="console-header">NAVIGATION</div>';
        cockpitConsole.appendChild(this.consoleRight);
        
        // Attitude indicator canvas
        this.attitudeCanvas = document.createElement('canvas');
        this.attitudeCanvas.width = 160;
        this.attitudeCanvas.height = 160;
        this.attitudeCanvas.id = 'attitudeCanvas';
        this.consoleCenter.appendChild(this.attitudeCanvas);
    }
    
    createHUDElements() {
        // Central reticle
        const hudReticle = document.createElement('div');
        hudReticle.id = 'hud-reticle';
        hudReticle.innerHTML = '<div></div>';
        this.hudContainer.appendChild(hudReticle);
        
        // Inventory
        this.hudInventory = document.createElement('div');
        this.hudInventory.id = 'hud-inventory';
        this.hudInventory.innerHTML = '<div>CARGO: EMPTY</div>';
        this.hudContainer.appendChild(this.hudInventory);
    }
    
    initializeTacticalPanel() {
        // Create comprehensive tactical panel
        this.tacticalPanel = document.createElement('div');
        this.tacticalPanel.id = 'tactical-panel';
        this.tacticalPanel.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            width: 280px;
            height: 320px;
            background: rgba(10, 30, 50, 0.85);
            border: 1px solid rgba(0, 128, 255, 0.4);
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(0, 150, 255, 0.3);
            display: flex;
            flex-direction: column;
            font-family: 'Orbitron', monospace;
            color: #0ff;
            pointer-events: auto;
            z-index: 1002;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            background: rgba(0, 100, 150, 0.3);
            padding: 8px 12px;
            border-bottom: 1px solid rgba(0, 150, 255, 0.3);
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            color: #00aaff;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        header.textContent = 'TACTICAL DISPLAY';
        this.tacticalPanel.appendChild(header);
        
        // Create navigation info section
        this.navInfoSection = document.createElement('div');
        this.navInfoSection.style.cssText = `
            padding: 8px 12px;
            border-bottom: 1px solid rgba(0, 150, 255, 0.2);
            font-size: 11px;
        `;
        this.tacticalPanel.appendChild(this.navInfoSection);
        
        // Create 3D mini-map container
        const miniMapContainer = document.createElement('div');
        miniMapContainer.style.cssText = `
            flex: 1;
            position: relative;
            margin: 8px;
            border-radius: 4px;
            overflow: hidden;
        `;
        this.tacticalPanel.appendChild(miniMapContainer);
        
        // Initialize 3D mini-map
        this.miniMap3D = new MiniMap(miniMapContainer, null, null);
        this.miniMap3D.resize(252, 200); // Fit within the tactical panel
        miniMapContainer.appendChild(this.miniMap3D.container);
        
        // Create combat info section
        this.combatInfoSection = document.createElement('div');
        this.combatInfoSection.style.cssText = `
            padding: 8px 12px;
            border-top: 1px solid rgba(255, 0, 0, 0.3);
            font-size: 11px;
            background: rgba(50, 20, 20, 0.3);
        `;
        this.tacticalPanel.appendChild(this.combatInfoSection);
        
        // Add to HUD
        this.hudContainer.appendChild(this.tacticalPanel);
    }
    
    setVisible(visible) {
        this.isVisible = visible;
        this.hudContainer.style.display = visible ? 'block' : 'none';
        
        // Also update 3D mini-map visibility
        if (this.miniMap3D) {
            this.miniMap3D.setVisible(visible);
        }
        
        // Toggle AR labels with HUD visibility and ensure they're enabled when HUD is shown
        if (this.arLabels) {
            this.arLabels.setEnabled(visible && this.showARLabels);
            if (visible && this.showARLabels) {
                console.log("AR Labels enabled with HUD");
            }
        }
    }
    
    update(starshipData, combatData, navigationData, celestialObjects, playerShip, enemies) {
        if (!this.isVisible) return;
        
        // Update AR labels if enabled
        if (this.arLabels && this.showARLabels) {
            this.arLabels.updateAll(playerShip, celestialObjects, enemies);
        }
        
        // Update systems section
        this.updateSystemsDisplay(starshipData, combatData);
        
        // Update flight section
        this.updateFlightDisplay(starshipData);
        
        // Update navigation section
        this.updateNavigationDisplay(navigationData);
        
        // Update attitude indicator
        this.updateAttitudeIndicator(starshipData);
        
        // Update tactical panel
        this.updateTacticalPanel(navigationData, combatData);
        
        // Update 3D mini-map
        if (this.miniMap3D && celestialObjects && playerShip) {
            this.miniMap3D.update(celestialObjects, playerShip, enemies || []);
        }
    }
    
    updateSystemsDisplay(starshipData, combatData) {
        const shieldPercent = starshipData.maxShields > 0 ? 
            (starshipData.shields / starshipData.maxShields * 100).toFixed(0) : 0;
        const hullPercent = starshipData.maxHull > 0 ? 
            (starshipData.hull / starshipData.maxHull * 100).toFixed(0) : 0;
        const powerStatus = `${starshipData.powerLevel.toFixed(0)}%`;
        const autopilotStatus = starshipData.autopilotEngaged ? "ON" : "OFF";
        
        this.consoleLeft.innerHTML = `
            <div class="console-header">SYSTEMS</div>
            <div class="system-status">
                <div class="hud-item">
                    <span class="hud-label">SHD</span> 
                    <div class="hud-value-bar">
                        <div class="shield-bar-fill" style="width: ${shieldPercent}%;"></div>
                    </div> 
                    ${shieldPercent}%
                </div>
                <div class="hud-item">
                    <span class="hud-label">HULL</span> 
                    <div class="hud-value-bar">
                        <div class="hull-bar-fill" style="width: ${hullPercent}%;"></div>
                    </div> 
                    ${hullPercent}%
                </div>
                <div class="hud-item">
                    <span class="hud-label">PWR</span> 
                    <div class="power-value">${powerStatus}</div>
                </div>
            </div>
            <div class="autopilot-status">
                <div class="autopilot-indicator ${autopilotStatus === 'ON' ? 'active' : ''}"></div>
                <span>AUTOPILOT: ${autopilotStatus}</span>
            </div>
            ${combatData ? `
            <div class="combat-status" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 0, 0, 0.3);">
                <div class="hud-item" style="color: ${combatData.enemyCount > 0 ? '#ff3333' : '#00ff88'};">
                    <span class="hud-label">ENEMIES</span>
                    <span>${combatData.enemyCount}</span>
                </div>
                ${combatData.enemyCount > 0 ? `
                <div class="hud-item">
                    <span class="hud-label">NEAREST</span>
                    <span style="color: #ffaa00;">${combatData.closestEnemyDistance}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}
        `;
    }
    
    updateFlightDisplay(starshipData) {
        const speed = starshipData.velocity.length();
        const speedDisplay = speed < 1000 ? 
            `${speed.toFixed(0)} u/s` : 
            `${(speed/1000).toFixed(1)} ku/s`;
        
        const thrustPct = (starshipData.throttle * 100).toFixed(0);
        const latThrust = (starshipData.currThrustX * 100).toFixed(0);
        const vertThrust = (starshipData.currThrustY * 100).toFixed(0);
        
        // Keep existing attitude canvas, add speed info below it
        const flightStats = this.consoleCenter.querySelector('.flight-stats');
        if (!flightStats) {
            const statsDiv = document.createElement('div');
            statsDiv.className = 'flight-stats';
            this.consoleCenter.appendChild(statsDiv);
        }
        
        this.consoleCenter.querySelector('.flight-stats').innerHTML = `
            <div class="hud-item"><span class="hud-label">SPD</span> ${speedDisplay}</div>
            <div class="hud-item"><span class="hud-label">THR</span> ${thrustPct}%</div>
            <div class="thrust-indicators">
                <div class="hud-item"><span class="hud-label">LAT</span> ${latThrust}%</div>
                <div class="hud-item"><span class="hud-label">VERT</span> ${vertThrust}%</div>
            </div>
        `;
    }
    
    updateNavigationDisplay(navigationData) {
        const targetInfo = navigationData.targetInfo || {
            name: "NO TARGET",
            distance: "---",
            bearing: "---"
        };
        
        // Update navigation display without overwriting AR controls
        let navDisplay = this.consoleRight.querySelector('.nav-display');
        if (!navDisplay) {
            navDisplay = document.createElement('div');
            navDisplay.className = 'nav-display';
            this.consoleRight.insertBefore(navDisplay, this.consoleRight.querySelector('.ar-controls-container'));
        }
        
        navDisplay.innerHTML = `
            <div class="nav-status">
                <div class="hud-item">
                    <span class="hud-label">TARGET</span> 
                    <span class="target-name">${targetInfo.name}</span>
                </div>
                <div class="hud-item">
                    <span class="hud-label">DIST</span> ${targetInfo.distance}
                </div>
                <div class="hud-item">
                    <span class="hud-label">BEAR</span> ${targetInfo.bearing}
                </div>
            </div>
            <div class="nav-controls">
                <div class="nav-key">
                    <span class="key-prompt">T</span> CYCLE TARGET
                </div>
                <div class="nav-key">
                    <span class="key-prompt">P</span> AUTOPILOT
                </div>
            </div>
        `;
    }
    
    updateTacticalPanel(navigationData, combatData) {
        // Update navigation info
        const targetInfo = navigationData.targetInfo || {
            name: "NO TARGET",
            distance: "---",
            bearing: "---"
        };
        
        this.navInfoSection.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #88ccff;">TARGET:</span>
                <span style="color: #fff; font-weight: bold;">${targetInfo.name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #88ccff;">DISTANCE:</span>
                <span style="color: #ffcc88;">${targetInfo.distance}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #88ccff;">BEARING:</span>
                <span style="color: #ffcc88;">${targetInfo.bearing}</span>
            </div>
        `;
        
        // Update combat info
        const enemyCount = combatData.enemyCount || 0;
        const closestEnemyDist = combatData.closestEnemyDistance || "---";
        
        this.combatInfoSection.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #ffaaaa;">HOSTILES:</span>
                <span style="color: ${enemyCount > 0 ? '#ff4444' : '#888888'}; font-weight: bold;">${enemyCount}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #ffaaaa;">NEAREST:</span>
                <span style="color: ${enemyCount > 0 ? '#ff8888' : '#888888'};">${closestEnemyDist}</span>
            </div>
        `;
    }
    
    updateAttitudeIndicator(starshipData) {
        const ctx = this.attitudeCanvas.getContext('2d');
        const width = this.attitudeCanvas.width;
        const height = this.attitudeCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Clear canvas with space background
        ctx.fillStyle = 'rgba(5, 10, 25, 0.9)';
        ctx.fillRect(0, 0, width, height);
        
        // Get ship orientation and velocity
        const euler = starshipData.euler || { x: 0, y: 0, z: 0 };
        const velocity = starshipData.velocity || { x: 0, y: 0, z: 0 };
        const speed = Math.sqrt(velocity.x*velocity.x + velocity.y*velocity.y + velocity.z*velocity.z);
        
        const pitch = euler.x;
        const roll = euler.z;
        const yaw = euler.y;
        
        // Save context state
        ctx.save();
        
        // Apply roll rotation
        ctx.translate(centerX, centerY);
        ctx.rotate(-roll);
        
        // Draw artificial horizon with depth
        const horizonY = pitch * 300; // Increased sensitivity
        const gradient = ctx.createLinearGradient(0, -centerY, 0, centerY);
        
        // Space (top half) - deep blue to black
        gradient.addColorStop(0, 'rgba(5, 15, 40, 0.8)');
        gradient.addColorStop(0.5, 'rgba(10, 30, 80, 0.6)');
        
        // Ground (bottom half) - brown to dark
        gradient.addColorStop(0.5, 'rgba(80, 40, 20, 0.6)');
        gradient.addColorStop(1, 'rgba(40, 20, 10, 0.8)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-centerX, -centerY, width, height);
        
        // Horizon line with glow effect
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#00ffaa';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-centerX, horizonY);
        ctx.lineTo(centerX, horizonY);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Pitch ladder with improved design
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = 'rgba(0, 255, 170, 0.9)';
        ctx.textAlign = 'center';
        
        for (let i = -60; i <= 60; i += 10) {
            if (i === 0) continue; // Skip horizon line
            const y = horizonY - i * 3; // Increased scale
            const isInView = y > -centerY + 10 && y < centerY - 10;
            
            if (isInView) {
                const lineLength = i % 20 === 0 ? 30 : 20;
                ctx.beginPath();
                ctx.moveTo(-lineLength, y);
                ctx.lineTo(lineLength, y);
                ctx.stroke();
                
                // Add tick marks
                if (i % 20 === 0) {
                    ctx.fillText(Math.abs(i) + '°', 0, y - 5);
                    
                    // Draw side markers
                    for (let side = -1; side <= 1; side += 2) {
                        ctx.beginPath();
                        ctx.moveTo(side * 35, y - 3);
                        ctx.lineTo(side * 35, y + 3);
                        ctx.stroke();
                    }
                }
            }
        }
        
        // Roll indicator with improved design
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -55, 40, -Math.PI * 0.75, -Math.PI * 0.25, false);
        ctx.stroke();
        
        // Roll tick marks
        for (let i = 0; i < 7; i++) {
            const angle = (-Math.PI * 0.75) + (i * Math.PI * 0.5 / 6);
            const isMainTick = i % 2 === 0;
            const tickLength = isMainTick ? 8 : 5;
            const innerRadius = 40;
            const outerRadius = innerRadius + tickLength;
            
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * innerRadius, -55 + Math.sin(angle) * innerRadius);
            ctx.lineTo(Math.cos(angle) * outerRadius, -55 + Math.sin(angle) * outerRadius);
            ctx.stroke();
            
            if (isMainTick) {
                const deg = (i - 3) * 15;
                ctx.fillText(Math.abs(deg) + '°', 
                    Math.cos(angle) * (outerRadius + 8), 
                    -55 + Math.sin(angle) * (outerRadius + 8) + 3);
            }
        }
        
        // Roll indicator pointer
        ctx.fillStyle = '#00ffaa';
        ctx.beginPath();
        ctx.moveTo(0, -50);
        ctx.lineTo(-4, -42);
        ctx.lineTo(4, -42);
        ctx.closePath();
        ctx.fill();
        
        // Restore context for fixed elements
        ctx.restore();
        
        // Draw center crosshair (fixed, doesn't rotate)
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Horizontal line
        ctx.moveTo(centerX - 25, centerY);
        ctx.lineTo(centerX - 8, centerY);
        ctx.moveTo(centerX + 8, centerY);
        ctx.lineTo(centerX + 25, centerY);
        // Vertical line
        ctx.moveTo(centerX, centerY - 15);
        ctx.lineTo(centerX, centerY - 5);
        ctx.moveTo(centerX, centerY + 5);
        ctx.lineTo(centerX, centerY + 15);
        ctx.stroke();
        
        // Center dot
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Velocity vector indicator
        if (speed > 10) {
            // Calculate velocity vector direction in screen space
            const velAngle = Math.atan2(velocity.x, -velocity.z) - yaw;
            const velPitch = Math.atan2(velocity.y, Math.sqrt(velocity.x*velocity.x + velocity.z*velocity.z));
            
            const velX = centerX + Math.sin(velAngle) * 50;
            const velY = centerY + Math.sin(velPitch) * 50;
            
            // Draw velocity vector
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(velX, velY, 5, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw velocity vector circle
            ctx.strokeStyle = 'rgba(255, 204, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(velX, velY, 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Outer ring
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 75, 0, Math.PI * 2);
        ctx.stroke();
    }

    createFactionDisplay() {
        if (!window.factionReputation || !window.Factions) return '';
        
        // Get top 3 most relevant factions based on standing (positive or negative)
        const standings = Object.entries(window.factionReputation.standings)
            .map(([factionId, standing]) => ({
                id: factionId,
                standing: standing,
                faction: window.Factions[factionId.toUpperCase()],
                rank: window.factionReputation.getRank(factionId)
            }))
            .filter(f => f.faction) // Only show valid factions
            .sort((a, b) => Math.abs(b.standing) - Math.abs(a.standing))
            .slice(0, 3);
        
        if (standings.length === 0) return '';
        
        let html = '<div class="faction-standings">';
        html += '<div class="faction-header">FACTION STATUS</div>';
        
        standings.forEach(f => {
            const color = f.standing > 20 ? '#00ff88' : 
                         f.standing < -20 ? '#ff4466' : '#ffaa00';
            const icon = f.standing > 20 ? '▲' : 
                        f.standing < -20 ? '▼' : '◆';
            
            html += `
                <div class="faction-item">
                    <span class="faction-name" style="color: ${f.faction.color}">${f.faction.shortName}</span>
                    <span class="faction-rank" style="color: ${color}">${icon} ${f.rank.name}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    createARLabelControls() {
        // Add AR labels controls to console right (navigation section)
        const arControlsDiv = document.createElement('div');
        arControlsDiv.className = 'ar-controls-container';
        arControlsDiv.style.cssText = `
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(0, 150, 255, 0.2);
            font-family: 'Orbitron', monospace;
            font-size: 11px;
            color: #00ffcc;
            background: rgba(0, 20, 40, 0.5);
            padding: 10px;
        `;
        
        const label = document.createElement('span');
        label.textContent = 'AR LABELS';
        label.style.opacity = '0.8';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'ar-toggle-btn';
        toggleBtn.textContent = this.showARLabels ? 'ON' : 'OFF';
        toggleBtn.style.cssText = `
            background: ${this.showARLabels ? 'rgba(0, 255, 100, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
            border: 1px solid ${this.showARLabels ? '#00ff64' : '#ff0044'};
            color: ${this.showARLabels ? '#00ff64' : '#ff0044'};
            padding: 2px 10px;
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
            transition: all 0.3s;
        `;
        
        toggleBtn.addEventListener('click', () => {
            this.showARLabels = !this.showARLabels;
            toggleBtn.textContent = this.showARLabels ? 'ON' : 'OFF';
            toggleBtn.style.background = this.showARLabels ? 'rgba(0, 255, 100, 0.2)' : 'rgba(255, 0, 0, 0.2)';
            toggleBtn.style.borderColor = this.showARLabels ? '#00ff64' : '#ff0044';
            toggleBtn.style.color = this.showARLabels ? '#00ff64' : '#ff0044';
            
            if (this.arLabels) {
                this.arLabels.setEnabled(this.isVisible && this.showARLabels);
            }
        });
        
        // Create main toggle
        const toggleDiv = document.createElement('div');
        toggleDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
        toggleDiv.appendChild(label);
        toggleDiv.appendChild(toggleBtn);
        arControlsDiv.appendChild(toggleDiv);
        
        // Create range control
        const rangeDiv = document.createElement('div');
        rangeDiv.style.cssText = 'margin-bottom: 5px;';
        rangeDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px;">RANGE</span>
                <span id="ar-range-value" style="font-size: 10px; color: #00ff88;">${(this.arLabelSettings.rangeFilter/1000).toFixed(0)}km</span>
            </div>
            <input type="range" id="ar-range-slider" 
                min="5" max="200" value="${this.arLabelSettings.rangeFilter/1000}"
                style="width: 100%; height: 4px; margin-top: 2px; cursor: pointer; background: rgba(0, 150, 255, 0.3); -webkit-appearance: none; appearance: none;">
        `;
        arControlsDiv.appendChild(rangeDiv);
        
        // Create max labels control
        const maxLabelsDiv = document.createElement('div');
        maxLabelsDiv.style.cssText = 'margin-bottom: 5px;';
        maxLabelsDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px;">MAX LABELS</span>
                <span id="ar-max-value" style="font-size: 10px; color: #00ff88;">${this.arLabelSettings.maxVisible}</span>
            </div>
            <input type="range" id="ar-max-slider" 
                min="5" max="30" value="${this.arLabelSettings.maxVisible}"
                style="width: 100%; height: 4px; margin-top: 2px; cursor: pointer; background: rgba(0, 150, 255, 0.3); -webkit-appearance: none; appearance: none;">
        `;
        arControlsDiv.appendChild(maxLabelsDiv);
        
        // Create filter toggles
        const filtersDiv = document.createElement('div');
        filtersDiv.style.cssText = 'margin-top: 8px; font-size: 10px;';
        filtersDiv.innerHTML = '<div style="margin-bottom: 4px; color: #0088aa;">FILTERS</div>';
        
        const filterTypes = [
            { key: 'showPlanets', label: 'Planets' },
            { key: 'showMoons', label: 'Moons' },
            { key: 'showStations', label: 'Stations' },
            { key: 'showShips', label: 'Ships' }
        ];
        
        filterTypes.forEach(filter => {
            const filterToggle = document.createElement('div');
            filterToggle.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;';
            
            const filterLabel = document.createElement('span');
            filterLabel.textContent = filter.label;
            filterLabel.style.cssText = 'font-size: 9px; opacity: 0.8;';
            
            const filterBtn = document.createElement('button');
            filterBtn.textContent = this.arLabelSettings[filter.key] ? '✓' : '✗';
            filterBtn.style.cssText = `
                background: ${this.arLabelSettings[filter.key] ? 'rgba(0, 255, 100, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
                border: 1px solid ${this.arLabelSettings[filter.key] ? '#00ff64' : '#666666'};
                color: ${this.arLabelSettings[filter.key] ? '#00ff64' : '#666666'};
                width: 20px;
                height: 16px;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            filterBtn.addEventListener('click', () => {
                this.arLabelSettings[filter.key] = !this.arLabelSettings[filter.key];
                filterBtn.textContent = this.arLabelSettings[filter.key] ? '✓' : '✗';
                filterBtn.style.background = this.arLabelSettings[filter.key] ? 'rgba(0, 255, 100, 0.2)' : 'rgba(100, 100, 100, 0.2)';
                filterBtn.style.borderColor = this.arLabelSettings[filter.key] ? '#00ff64' : '#666666';
                filterBtn.style.color = this.arLabelSettings[filter.key] ? '#00ff64' : '#666666';
                this.updateARLabelFilters();
            });
            
            filterToggle.appendChild(filterLabel);
            filterToggle.appendChild(filterBtn);
            filtersDiv.appendChild(filterToggle);
        });
        
        arControlsDiv.appendChild(filtersDiv);
        
        if (this.consoleRight) {
            this.consoleRight.appendChild(arControlsDiv);
        }
        
        // Add event listeners for sliders
        setTimeout(() => {
            const rangeSlider = document.getElementById('ar-range-slider');
            const maxSlider = document.getElementById('ar-max-slider');
            
            if (rangeSlider) {
                rangeSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.arLabelSettings.rangeFilter = value * 1000;
                    document.getElementById('ar-range-value').textContent = `${value.toFixed(0)}km`;
                    if (this.arLabels) {
                        this.arLabels.setRangeFilter(this.arLabelSettings.rangeFilter);
                    }
                });
            }
            
            if (maxSlider) {
                maxSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    this.arLabelSettings.maxVisible = value;
                    document.getElementById('ar-max-value').textContent = value;
                    if (this.arLabels) {
                        this.arLabels.setMaxLabels(value);
                    }
                });
            }
        }, 100);
    }
    
    updateARLabelFilters() {
        if (this.arLabels) {
            this.arLabels.setFilters({
                showPlanets: this.arLabelSettings.showPlanets,
                showMoons: this.arLabelSettings.showMoons,
                showStations: this.arLabelSettings.showStations,
                showShips: this.arLabelSettings.showShips,
                showHostiles: this.arLabelSettings.showHostiles
            });
        }
    }
    
    setARLabelSystem(arLabelSystem) {
        this.arLabels = arLabelSystem;
        // Apply initial settings
        if (this.arLabels) {
            this.arLabels.setMaxLabels(this.arLabelSettings.maxVisible);
            this.arLabels.setRangeFilter(this.arLabelSettings.rangeFilter);
            this.updateARLabelFilters();
        }
    }
}

// Create singleton instance
export const starshipHUD = new StarshipHUD();