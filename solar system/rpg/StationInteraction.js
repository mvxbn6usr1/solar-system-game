export class StationInteraction {
    constructor(scene) {
        this.scene = scene;
        this.currentStation = null;
        this.isNearStation = false;
        this.interactionDistance = 150; // Distance to trigger interaction UI
        this.dockingDistance = 50; // Distance for docking
        
        // Create interaction UI
        this.createInteractionUI();
    }
    
    createInteractionUI() {
        // Main interaction panel
        this.interactionPanel = document.createElement('div');
        this.interactionPanel.id = 'station-interaction-panel';
        this.interactionPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            background: rgba(10, 20, 40, 0.95);
            border: 2px solid #00aaff;
            border-radius: 10px;
            padding: 20px;
            display: none;
            z-index: 2000;
            font-family: 'Orbitron', monospace;
            color: #ffffff;
            box-shadow: 0 0 30px rgba(0, 170, 255, 0.5);
        `;
        
        // Station name header
        this.stationHeader = document.createElement('h2');
        this.stationHeader.style.cssText = `
            text-align: center;
            color: #00aaff;
            margin-bottom: 20px;
            font-size: 24px;
            text-shadow: 0 0 10px rgba(0, 170, 255, 0.5);
        `;
        this.stationHeader.textContent = 'ORBITAL STATION';
        this.interactionPanel.appendChild(this.stationHeader);
        
        // Menu options
        this.menuContainer = document.createElement('div');
        this.menuContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        
        // Create menu buttons
        const menuOptions = [
            { id: 'dock', label: 'DOCK WITH STATION', action: () => this.dockWithStation() },
            { id: 'trade', label: 'TRADING POST', action: () => this.openTrading() },
            { id: 'upgrades', label: 'SHIP UPGRADES', action: () => this.openUpgrades() },
            { id: 'missions', label: 'MISSION BOARD', action: () => this.openMissions() },
            { id: 'repair', label: 'REPAIR & REFUEL', action: () => this.openRepair() },
            { id: 'leave', label: 'DEPART', action: () => this.closeInteraction() }
        ];
        
        menuOptions.forEach(option => {
            const button = document.createElement('button');
            button.id = option.id;
            button.style.cssText = `
                padding: 15px;
                background: rgba(0, 100, 150, 0.3);
                border: 1px solid #00aaff;
                color: #ffffff;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s;
                text-transform: uppercase;
                letter-spacing: 1px;
            `;
            button.textContent = option.label;
            button.addEventListener('click', option.action);
            button.addEventListener('mouseenter', () => {
                button.style.background = 'rgba(0, 150, 200, 0.5)';
                button.style.borderColor = '#00ffff';
                button.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = 'rgba(0, 100, 150, 0.3)';
                button.style.borderColor = '#00aaff';
                button.style.boxShadow = 'none';
            });
            this.menuContainer.appendChild(button);
        });
        
        this.interactionPanel.appendChild(this.menuContainer);
        
        // Close button
        const closeBtn = document.createElement('div');
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            cursor: pointer;
            color: #ff4444;
            font-size: 24px;
            text-align: center;
            line-height: 30px;
        `;
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.closeInteraction());
        this.interactionPanel.appendChild(closeBtn);
        
        document.body.appendChild(this.interactionPanel);
        
        // Proximity indicator
        this.proximityIndicator = document.createElement('div');
        this.proximityIndicator.style.cssText = `
            position: fixed;
            bottom: 300px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background: rgba(0, 100, 150, 0.8);
            border: 1px solid #00aaff;
            border-radius: 5px;
            color: #ffffff;
            font-family: 'Orbitron', monospace;
            font-size: 14px;
            display: none;
            z-index: 1500;
        `;
        document.body.appendChild(this.proximityIndicator);
    }
    
    checkStationProximity(playerShip, stations) {
        let nearestStation = null;
        let nearestDistance = Infinity;
        
        // Find nearest station
        stations.forEach(station => {
            if (station.isStation && station.bodyObject) {
                const distance = playerShip.position.distanceTo(station.bodyObject.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestStation = station;
                }
            }
        });
        
        // Update interaction state
        if (nearestStation && nearestDistance < this.interactionDistance) {
            this.isNearStation = true;
            this.currentStation = nearestStation;
            
            // Show proximity indicator
            this.proximityIndicator.style.display = 'block';
            if (nearestDistance < this.dockingDistance) {
                this.proximityIndicator.innerHTML = `Press <span style="color: #00ffff;">I</span> to interact with ${nearestStation.name}`;
                this.proximityIndicator.style.borderColor = '#00ffff';
                this.proximityIndicator.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
            } else {
                this.proximityIndicator.textContent = `Approaching ${nearestStation.name} (${nearestDistance.toFixed(0)}m)`;
                this.proximityIndicator.style.borderColor = '#00aaff';
                this.proximityIndicator.style.boxShadow = 'none';
            }
            
            // Show interaction zone
            if (nearestStation.bodyObject.userData.interactionZone) {
                nearestStation.bodyObject.userData.interactionZone.visible = true;
            }
        } else {
            this.isNearStation = false;
            this.currentStation = null;
            this.proximityIndicator.style.display = 'none';
            
            // Hide all interaction zones
            stations.forEach(station => {
                if (station.bodyObject?.userData?.interactionZone) {
                    station.bodyObject.userData.interactionZone.visible = false;
                }
            });
        }
        
        return this.isNearStation;
    }
    
    openInteraction() {
        if (!this.isNearStation || !this.currentStation) return;
        
        this.stationHeader.textContent = this.currentStation.name.toUpperCase();
        this.interactionPanel.style.display = 'block';
        
        // Pause game or reduce time scale
        window.isInteracting = true;
    }
    
    closeInteraction() {
        this.interactionPanel.style.display = 'none';
        window.isInteracting = false;
    }
    
    dockWithStation() {
        console.log('Docking with station...');
        // Implement docking sequence
        this.showSubPanel('DOCKING', 'Aligning docking clamps...<br>Establishing connection...<br>Docking complete!');
    }
    
    openTrading() {
        console.log('Opening trading interface...');
        this.showSubPanel('TRADING POST', `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h3 style="color: #00aaff;">BUY</h3>
                    <div style="padding: 10px; background: rgba(0,50,100,0.3); border-radius: 5px;">
                        <div>Fuel Cells: 100 credits</div>
                        <div>Shield Batteries: 250 credits</div>
                        <div>Missiles: 500 credits</div>
                        <div>Mining Drones: 1000 credits</div>
                    </div>
                </div>
                <div>
                    <h3 style="color: #00aaff;">SELL</h3>
                    <div style="padding: 10px; background: rgba(100,50,0,0.3); border-radius: 5px;">
                        <div>Ore: 50 credits/unit</div>
                        <div>Salvage: 75 credits/unit</div>
                        <div>Data Cores: 200 credits/unit</div>
                    </div>
                </div>
            </div>
        `);
    }
    
    openUpgrades() {
        console.log('Opening upgrades interface...');
        this.showSubPanel('SHIP UPGRADES', `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="padding: 10px; background: rgba(0,50,100,0.3); border-radius: 5px;">
                    <h4 style="color: #00ffff;">Enhanced Thrusters</h4>
                    <p style="font-size: 12px;">+25% max speed, +15% acceleration</p>
                    <p style="color: #ffaa00;">Cost: 5000 credits</p>
                </div>
                <div style="padding: 10px; background: rgba(0,50,100,0.3); border-radius: 5px;">
                    <h4 style="color: #00ffff;">Shield Generator Mk2</h4>
                    <p style="font-size: 12px;">+50% shield capacity, +20% recharge rate</p>
                    <p style="color: #ffaa00;">Cost: 8000 credits</p>
                </div>
                <div style="padding: 10px; background: rgba(0,50,100,0.3); border-radius: 5px;">
                    <h4 style="color: #00ffff;">Weapon Systems Upgrade</h4>
                    <p style="font-size: 12px;">+30% fire rate, +20% damage</p>
                    <p style="color: #ffaa00;">Cost: 7500 credits</p>
                </div>
            </div>
        `);
    }
    
    openMissions() {
        console.log('Opening mission board...');
        this.showSubPanel('MISSION BOARD', `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="padding: 10px; background: rgba(50,100,0,0.3); border-radius: 5px; border-left: 3px solid #00ff00;">
                    <h4 style="color: #00ff00;">Patrol Mission</h4>
                    <p style="font-size: 12px;">Scout the asteroid belt for pirate activity</p>
                    <p style="color: #ffaa00;">Reward: 2000 credits</p>
                </div>
                <div style="padding: 10px; background: rgba(100,50,0,0.3); border-radius: 5px; border-left: 3px solid #ffaa00;">
                    <h4 style="color: #ffaa00;">Delivery Mission</h4>
                    <p style="font-size: 12px;">Transport medical supplies to Mars colony</p>
                    <p style="color: #ffaa00;">Reward: 3500 credits</p>
                </div>
                <div style="padding: 10px; background: rgba(100,0,0,0.3); border-radius: 5px; border-left: 3px solid #ff4444;">
                    <h4 style="color: #ff4444;">Combat Mission</h4>
                    <p style="font-size: 12px;">Eliminate rogue AI ships near Jupiter</p>
                    <p style="color: #ffaa00;">Reward: 10000 credits</p>
                </div>
            </div>
        `);
    }
    
    openRepair() {
        console.log('Opening repair interface...');
        this.showSubPanel('REPAIR & REFUEL', `
            <div style="text-align: center;">
                <h3 style="color: #00aaff;">Current Ship Status</h3>
                <div style="margin: 20px 0;">
                    <div style="margin: 10px;">Hull: <span style="color: #ff4444;">75%</span></div>
                    <div style="margin: 10px;">Shields: <span style="color: #00aaff;">100%</span></div>
                    <div style="margin: 10px;">Fuel: <span style="color: #ffaa00;">45%</span></div>
                </div>
                <button style="padding: 10px 30px; background: #00aa44; border: none; color: white; cursor: pointer; font-size: 16px;">
                    FULL REPAIR & REFUEL (1500 credits)
                </button>
            </div>
        `);
    }
    
    showSubPanel(title, content) {
        // Create or update sub-panel content
        let subPanel = document.getElementById('station-sub-panel');
        if (!subPanel) {
            subPanel = document.createElement('div');
            subPanel.id = 'station-sub-panel';
            subPanel.style.cssText = `
                margin-top: 20px;
                padding: 20px;
                background: rgba(0, 50, 100, 0.2);
                border: 1px solid rgba(0, 170, 255, 0.3);
                border-radius: 5px;
            `;
            this.interactionPanel.appendChild(subPanel);
        }
        
        subPanel.innerHTML = `
            <h3 style="color: #00aaff; margin-bottom: 15px;">${title}</h3>
            <div>${content}</div>
        `;
    }
} 