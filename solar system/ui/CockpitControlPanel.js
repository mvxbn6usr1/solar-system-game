// Integrated Cockpit Control Panel
// Provides centralized control for all starship subsystems

import { FuturisticUI } from './FuturisticUI.js';

export class CockpitControlPanel {
    constructor(starshipHUD) {
        this.hud = starshipHUD;
        this.panel = null;
        this.isExpanded = false;
        this.settings = {
            // AR Label settings
            arLabels: {
                enabled: true,
                maxVisible: 20,
                showPlanets: true,
                showMoons: true,
                showStations: true,
                showShips: true,
                showHostiles: true,
                rangeFilter: 100000,
                clusteringEnabled: true
            },
            // Targeting settings
            targeting: {
                autoTarget: true,
                priorityMode: 'nearest', // nearest, threat, valuable
                leadIndicator: true,
                targetInfo: 'full' // full, minimal, none
            },
            // HUD settings
            hud: {
                brightness: 0.8,
                color: 'cyan', // cyan, green, orange, red
                layout: 'default', // default, combat, exploration
                showMinimap: true,
                minimapZoom: 1.0
            },
            // System settings
            systems: {
                powerDistribution: {
                    weapons: 33,
                    engines: 33,
                    shields: 34
                },
                autopilot: {
                    maxSpeed: 1000,
                    approachDistance: 100,
                    orbitDistance: 500
                }
            }
        };
        
        this.createPanel();
    }
    
    createPanel() {
        // Create main panel container
        this.panel = document.createElement('div');
        this.panel.id = 'cockpit-control-panel';
        this.panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            max-height: 600px;
            background: rgba(0, 20, 40, 0.95);
            border: 2px solid rgba(0, 255, 255, 0.3);
            border-radius: 10px;
            font-family: 'Orbitron', monospace;
            color: #00ffff;
            overflow: hidden;
            transition: all 0.3s ease;
            z-index: 1500;
        `;
        
        // Create header
        this.createHeader();
        
        // Create tabbed interface
        this.createTabs();
        
        // Create content areas
        this.createContentAreas();
        
        // Initially collapsed
        this.collapse();
        
        document.body.appendChild(this.panel);
    }
    
    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            background: rgba(0, 100, 150, 0.3);
            padding: 10px 15px;
            border-bottom: 1px solid rgba(0, 255, 255, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        `;
        title.textContent = 'COCKPIT CONTROLS';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.style.cssText = `
            background: none;
            border: 1px solid #00ffff;
            color: #00ffff;
            padding: 4px 8px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            border-radius: 4px;
            transition: all 0.2s;
        `;
        toggleBtn.textContent = '▼';
        
        header.appendChild(title);
        header.appendChild(toggleBtn);
        
        // Toggle expand/collapse
        header.addEventListener('click', () => {
            if (this.isExpanded) {
                this.collapse();
                toggleBtn.textContent = '▼';
            } else {
                this.expand();
                toggleBtn.textContent = '▲';
            }
        });
        
        this.panel.appendChild(header);
    }
    
    createTabs() {
        const tabContainer = document.createElement('div');
        tabContainer.style.cssText = `
            display: flex;
            background: rgba(0, 50, 100, 0.2);
            border-bottom: 1px solid rgba(0, 255, 255, 0.2);
        `;
        
        const tabs = ['AR Labels', 'Targeting', 'Systems', 'HUD'];
        this.tabButtons = {};
        this.currentTab = 'AR Labels';
        
        tabs.forEach(tabName => {
            const tab = document.createElement('button');
            tab.style.cssText = `
                flex: 1;
                padding: 8px;
                background: none;
                border: none;
                border-right: 1px solid rgba(0, 255, 255, 0.2);
                color: #00ffff;
                font-family: inherit;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                text-transform: uppercase;
            `;
            tab.textContent = tabName;
            
            tab.addEventListener('click', () => this.switchTab(tabName));
            
            this.tabButtons[tabName] = tab;
            tabContainer.appendChild(tab);
        });
        
        // Remove last border
        this.tabButtons[tabs[tabs.length - 1]].style.borderRight = 'none';
        
        this.panel.appendChild(tabContainer);
    }
    
    createContentAreas() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.cssText = `
            padding: 15px;
            max-height: 500px;
            overflow-y: auto;
        `;
        
        // Create content for each tab
        this.tabContents = {
            'AR Labels': this.createARLabelControls(),
            'Targeting': this.createTargetingControls(),
            'Systems': this.createSystemControls(),
            'HUD': this.createHUDControls()
        };
        
        // Initially show AR Labels tab
        this.contentContainer.appendChild(this.tabContents['AR Labels']);
        this.panel.appendChild(this.contentContainer);
        
        // Highlight active tab
        this.updateTabHighlight();
    }
    
    createARLabelControls() {
        const container = document.createElement('div');
        
        // Master enable toggle
        container.appendChild(this.createToggle('Enable AR Labels', 
            this.settings.arLabels.enabled,
            (value) => {
                this.settings.arLabels.enabled = value;
                if (this.hud.arLabels) {
                    this.hud.arLabels.setEnabled(value);
                }
            }
        ));
        
        // Max visible slider
        container.appendChild(this.createSlider('Max Visible Labels', 
            this.settings.arLabels.maxVisible, 5, 50,
            (value) => {
                this.settings.arLabels.maxVisible = value;
                if (this.hud.arLabels) {
                    this.hud.arLabels.setMaxLabels(value);
                }
            }
        ));
        
        // Range filter
        container.appendChild(this.createSlider('Range Filter (km)', 
            this.settings.arLabels.rangeFilter / 1000, 1, 1000,
            (value) => {
                this.settings.arLabels.rangeFilter = value * 1000;
                if (this.hud.arLabels) {
                    this.hud.arLabels.setRangeFilter(value * 1000);
                }
            }
        ));
        
        // Filter toggles
        const filterSection = document.createElement('div');
        filterSection.style.cssText = `
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(0, 255, 255, 0.2);
        `;
        
        const filterTitle = document.createElement('div');
        filterTitle.style.cssText = `
            font-size: 14px;
            margin-bottom: 10px;
            color: #00ff88;
        `;
        filterTitle.textContent = 'OBJECT FILTERS';
        filterSection.appendChild(filterTitle);
        
        ['Planets', 'Moons', 'Stations', 'Ships', 'Hostiles'].forEach(type => {
            const key = `show${type}`;
            filterSection.appendChild(this.createToggle(`Show ${type}`, 
                this.settings.arLabels[key],
                (value) => {
                    this.settings.arLabels[key] = value;
                    this.updateARLabelFilters();
                }
            ));
        });
        
        container.appendChild(filterSection);
        
        // Clustering toggle
        container.appendChild(this.createToggle('Enable Clustering', 
            this.settings.arLabels.clusteringEnabled,
            (value) => {
                this.settings.arLabels.clusteringEnabled = value;
                // Update clustering in AR system
            }
        ));
        
        return container;
    }
    
    createTargetingControls() {
        const container = document.createElement('div');
        
        // Auto-target toggle
        container.appendChild(this.createToggle('Auto-Target Hostiles', 
            this.settings.targeting.autoTarget,
            (value) => {
                this.settings.targeting.autoTarget = value;
            }
        ));
        
        // Priority mode selector
        const prioritySection = document.createElement('div');
        prioritySection.style.cssText = 'margin: 15px 0;';
        
        const priorityLabel = document.createElement('div');
        priorityLabel.style.cssText = 'font-size: 12px; margin-bottom: 8px;';
        priorityLabel.textContent = 'TARGET PRIORITY MODE';
        
        const prioritySelect = document.createElement('select');
        prioritySelect.style.cssText = `
            width: 100%;
            padding: 8px;
            background: rgba(0, 50, 100, 0.3);
            border: 1px solid rgba(0, 255, 255, 0.3);
            color: #00ffff;
            font-family: inherit;
            font-size: 12px;
            border-radius: 4px;
        `;
        
        ['Nearest', 'Highest Threat', 'Most Valuable'].forEach(mode => {
            const option = document.createElement('option');
            option.value = mode.toLowerCase().replace(' ', '_');
            option.textContent = mode;
            prioritySelect.appendChild(option);
        });
        
        prioritySelect.value = this.settings.targeting.priorityMode;
        prioritySelect.addEventListener('change', (e) => {
            this.settings.targeting.priorityMode = e.target.value;
        });
        
        prioritySection.appendChild(priorityLabel);
        prioritySection.appendChild(prioritySelect);
        container.appendChild(prioritySection);
        
        // Lead indicator toggle
        container.appendChild(this.createToggle('Show Lead Indicator', 
            this.settings.targeting.leadIndicator,
            (value) => {
                this.settings.targeting.leadIndicator = value;
            }
        ));
        
        // Target info detail level
        const infoSection = document.createElement('div');
        infoSection.style.cssText = 'margin-top: 15px;';
        
        const infoLabel = document.createElement('div');
        infoLabel.style.cssText = 'font-size: 12px; margin-bottom: 8px;';
        infoLabel.textContent = 'TARGET INFO DETAIL';
        
        const infoButtons = document.createElement('div');
        infoButtons.style.cssText = 'display: flex; gap: 5px;';
        
        ['Full', 'Minimal', 'None'].forEach(level => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                flex: 1;
                padding: 6px;
                background: ${this.settings.targeting.targetInfo === level.toLowerCase() ? 
                    'rgba(0, 255, 255, 0.2)' : 'rgba(0, 50, 100, 0.2)'};
                border: 1px solid rgba(0, 255, 255, 0.3);
                color: #00ffff;
                font-family: inherit;
                font-size: 11px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
            `;
            btn.textContent = level;
            
            btn.addEventListener('click', () => {
                this.settings.targeting.targetInfo = level.toLowerCase();
                infoButtons.querySelectorAll('button').forEach(b => {
                    b.style.background = 'rgba(0, 50, 100, 0.2)';
                });
                btn.style.background = 'rgba(0, 255, 255, 0.2)';
            });
            
            infoButtons.appendChild(btn);
        });
        
        infoSection.appendChild(infoLabel);
        infoSection.appendChild(infoButtons);
        container.appendChild(infoSection);
        
        return container;
    }
    
    createSystemControls() {
        const container = document.createElement('div');
        
        // Power distribution
        const powerSection = document.createElement('div');
        powerSection.style.cssText = 'margin-bottom: 20px;';
        
        const powerTitle = document.createElement('div');
        powerTitle.style.cssText = `
            font-size: 14px;
            margin-bottom: 10px;
            color: #ffaa00;
        `;
        powerTitle.textContent = 'POWER DISTRIBUTION';
        powerSection.appendChild(powerTitle);
        
        ['Weapons', 'Engines', 'Shields'].forEach(system => {
            const slider = this.createSlider(system, 
                this.settings.systems.powerDistribution[system.toLowerCase()], 0, 100,
                (value) => {
                    this.updatePowerDistribution(system.toLowerCase(), value);
                }
            );
            powerSection.appendChild(slider);
        });
        
        // Balance button
        const balanceBtn = document.createElement('button');
        balanceBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-top: 10px;
            background: rgba(255, 170, 0, 0.2);
            border: 1px solid #ffaa00;
            color: #ffaa00;
            font-family: inherit;
            font-size: 12px;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
            text-transform: uppercase;
        `;
        balanceBtn.textContent = 'Balance Power';
        balanceBtn.addEventListener('click', () => this.balancePower());
        powerSection.appendChild(balanceBtn);
        
        container.appendChild(powerSection);
        
        // Autopilot settings
        const autoSection = document.createElement('div');
        autoSection.style.cssText = `
            padding-top: 15px;
            border-top: 1px solid rgba(0, 255, 255, 0.2);
        `;
        
        const autoTitle = document.createElement('div');
        autoTitle.style.cssText = `
            font-size: 14px;
            margin-bottom: 10px;
            color: #00ff88;
        `;
        autoTitle.textContent = 'AUTOPILOT SETTINGS';
        autoSection.appendChild(autoTitle);
        
        autoSection.appendChild(this.createSlider('Max Speed (km/s)', 
            this.settings.systems.autopilot.maxSpeed / 1000, 0.1, 10,
            (value) => {
                this.settings.systems.autopilot.maxSpeed = value * 1000;
            }
        ));
        
        autoSection.appendChild(this.createSlider('Approach Distance', 
            this.settings.systems.autopilot.approachDistance, 50, 1000,
            (value) => {
                this.settings.systems.autopilot.approachDistance = value;
            }
        ));
        
        container.appendChild(autoSection);
        
        return container;
    }
    
    createHUDControls() {
        const container = document.createElement('div');
        
        // Brightness slider
        container.appendChild(this.createSlider('HUD Brightness', 
            this.settings.hud.brightness * 100, 20, 100,
            (value) => {
                this.settings.hud.brightness = value / 100;
                this.updateHUDBrightness();
            }
        ));
        
        // Color selector
        const colorSection = document.createElement('div');
        colorSection.style.cssText = 'margin: 15px 0;';
        
        const colorLabel = document.createElement('div');
        colorLabel.style.cssText = 'font-size: 12px; margin-bottom: 8px;';
        colorLabel.textContent = 'HUD COLOR SCHEME';
        
        const colorButtons = document.createElement('div');
        colorButtons.style.cssText = 'display: flex; gap: 5px;';
        
        const colors = {
            'Cyan': '#00ffff',
            'Green': '#00ff00',
            'Orange': '#ff8800',
            'Red': '#ff0044'
        };
        
        Object.entries(colors).forEach(([name, color]) => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                flex: 1;
                padding: 8px;
                background: ${color}22;
                border: 1px solid ${color};
                color: ${color};
                font-family: inherit;
                font-size: 11px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
            `;
            btn.textContent = name;
            
            btn.addEventListener('click', () => {
                this.settings.hud.color = name.toLowerCase();
                this.updateHUDColor(color);
                colorButtons.querySelectorAll('button').forEach(b => {
                    b.style.opacity = '0.5';
                });
                btn.style.opacity = '1';
            });
            
            if (this.settings.hud.color === name.toLowerCase()) {
                btn.style.opacity = '1';
            } else {
                btn.style.opacity = '0.5';
            }
            
            colorButtons.appendChild(btn);
        });
        
        colorSection.appendChild(colorLabel);
        colorSection.appendChild(colorButtons);
        container.appendChild(colorSection);
        
        // Layout selector
        const layoutSection = document.createElement('div');
        layoutSection.style.cssText = 'margin: 15px 0;';
        
        const layoutLabel = document.createElement('div');
        layoutLabel.style.cssText = 'font-size: 12px; margin-bottom: 8px;';
        layoutLabel.textContent = 'HUD LAYOUT';
        
        const layoutButtons = document.createElement('div');
        layoutButtons.style.cssText = 'display: flex; gap: 5px;';
        
        ['Default', 'Combat', 'Exploration'].forEach(layout => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                flex: 1;
                padding: 6px;
                background: ${this.settings.hud.layout === layout.toLowerCase() ? 
                    'rgba(0, 255, 255, 0.2)' : 'rgba(0, 50, 100, 0.2)'};
                border: 1px solid rgba(0, 255, 255, 0.3);
                color: #00ffff;
                font-family: inherit;
                font-size: 11px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
            `;
            btn.textContent = layout;
            
            btn.addEventListener('click', () => {
                this.settings.hud.layout = layout.toLowerCase();
                this.updateHUDLayout(layout.toLowerCase());
                layoutButtons.querySelectorAll('button').forEach(b => {
                    b.style.background = 'rgba(0, 50, 100, 0.2)';
                });
                btn.style.background = 'rgba(0, 255, 255, 0.2)';
            });
            
            layoutButtons.appendChild(btn);
        });
        
        layoutSection.appendChild(layoutLabel);
        layoutSection.appendChild(layoutButtons);
        container.appendChild(layoutSection);
        
        // Minimap controls
        container.appendChild(this.createToggle('Show Minimap', 
            this.settings.hud.showMinimap,
            (value) => {
                this.settings.hud.showMinimap = value;
                if (this.hud.miniMap3D) {
                    this.hud.tacticalPanel.style.display = value ? 'flex' : 'none';
                }
            }
        ));
        
        container.appendChild(this.createSlider('Minimap Zoom', 
            this.settings.hud.minimapZoom, 0.5, 3,
            (value) => {
                this.settings.hud.minimapZoom = value;
                if (this.hud.miniMap3D) {
                    this.hud.miniMap3D.setZoom(value);
                }
            }
        ));
        
        return container;
    }
    
    // UI Control creators
    createToggle(label, initialValue, onChange) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 8px 0;
            padding: 8px;
            background: rgba(0, 50, 100, 0.1);
            border-radius: 4px;
        `;
        
        const labelEl = document.createElement('label');
        labelEl.style.cssText = `
            font-size: 12px;
            cursor: pointer;
            user-select: none;
        `;
        labelEl.textContent = label;
        
        const toggle = document.createElement('div');
        toggle.style.cssText = `
            width: 40px;
            height: 20px;
            background: ${initialValue ? 'rgba(0, 255, 100, 0.3)' : 'rgba(255, 0, 0, 0.3)'};
            border: 1px solid ${initialValue ? '#00ff64' : '#ff0044'};
            border-radius: 10px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s;
        `;
        
        const slider = document.createElement('div');
        slider.style.cssText = `
            width: 16px;
            height: 16px;
            background: ${initialValue ? '#00ff64' : '#ff0044'};
            border-radius: 50%;
            position: absolute;
            top: 1px;
            ${initialValue ? 'right: 1px;' : 'left: 1px;'}
            transition: all 0.3s;
        `;
        
        toggle.appendChild(slider);
        
        let value = initialValue;
        const handleToggle = () => {
            value = !value;
            toggle.style.background = value ? 'rgba(0, 255, 100, 0.3)' : 'rgba(255, 0, 0, 0.3)';
            toggle.style.borderColor = value ? '#00ff64' : '#ff0044';
            slider.style.background = value ? '#00ff64' : '#ff0044';
            if (value) {
                slider.style.right = '1px';
                slider.style.left = 'auto';
            } else {
                slider.style.left = '1px';
                slider.style.right = 'auto';
            }
            onChange(value);
        };
        
        toggle.addEventListener('click', handleToggle);
        labelEl.addEventListener('click', handleToggle);
        
        container.appendChild(labelEl);
        container.appendChild(toggle);
        
        return container;
    }
    
    createSlider(label, initialValue, min, max, onChange) {
        const container = document.createElement('div');
        container.style.cssText = 'margin: 12px 0;';
        
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 12px;
        `;
        
        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        
        const valueEl = document.createElement('span');
        valueEl.style.color = '#00ff88';
        valueEl.textContent = initialValue.toFixed(max < 10 ? 1 : 0);
        
        header.appendChild(labelEl);
        header.appendChild(valueEl);
        
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = `
            position: relative;
            height: 20px;
            background: rgba(0, 50, 100, 0.3);
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 10px;
            cursor: pointer;
        `;
        
        const fill = document.createElement('div');
        fill.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            background: linear-gradient(90deg, #00ffff, #00ff88);
            border-radius: 10px;
            width: ${((initialValue - min) / (max - min)) * 100}%;
            transition: width 0.1s;
        `;
        
        const handle = document.createElement('div');
        handle.style.cssText = `
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            background: #00ffff;
            border: 2px solid rgba(0, 20, 40, 0.8);
            border-radius: 50%;
            left: ${((initialValue - min) / (max - min)) * 100}%;
            margin-left: -8px;
            transition: left 0.1s;
        `;
        
        sliderContainer.appendChild(fill);
        sliderContainer.appendChild(handle);
        
        // Slider interaction
        let isDragging = false;
        
        const updateValue = (e) => {
            const rect = sliderContainer.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const percent = x / rect.width;
            const value = min + (max - min) * percent;
            
            valueEl.textContent = value.toFixed(max < 10 ? 1 : 0);
            fill.style.width = `${percent * 100}%`;
            handle.style.left = `${percent * 100}%`;
            
            onChange(value);
        };
        
        sliderContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            updateValue(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) updateValue(e);
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        container.appendChild(header);
        container.appendChild(sliderContainer);
        
        return container;
    }
    
    // Control methods
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update content
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(this.tabContents[tabName]);
        
        // Update tab highlight
        this.updateTabHighlight();
    }
    
    updateTabHighlight() {
        Object.entries(this.tabButtons).forEach(([name, btn]) => {
            if (name === this.currentTab) {
                btn.style.background = 'rgba(0, 255, 255, 0.2)';
                btn.style.color = '#00ffff';
            } else {
                btn.style.background = 'none';
                btn.style.color = '#0088aa';
            }
        });
    }
    
    expand() {
        this.isExpanded = true;
        this.contentContainer.style.display = 'block';
        this.panel.querySelector('[style*="flex"]').style.display = 'flex'; // Show tabs
    }
    
    collapse() {
        this.isExpanded = false;
        this.contentContainer.style.display = 'none';
        this.panel.querySelector('[style*="flex"]').style.display = 'none'; // Hide tabs
    }
    
    // Update methods
    updateARLabelFilters() {
        if (this.hud.arLabels) {
            this.hud.arLabels.setFilters({
                showPlanets: this.settings.arLabels.showPlanets,
                showMoons: this.settings.arLabels.showMoons,
                showStations: this.settings.arLabels.showStations,
                showShips: this.settings.arLabels.showShips,
                showHostiles: this.settings.arLabels.showHostiles
            });
        }
    }
    
    updatePowerDistribution(system, value) {
        this.settings.systems.powerDistribution[system] = value;
        
        // Normalize to 100%
        const total = Object.values(this.settings.systems.powerDistribution)
            .reduce((sum, val) => sum + val, 0);
        
        if (total > 100) {
            const scale = 100 / total;
            Object.keys(this.settings.systems.powerDistribution).forEach(key => {
                this.settings.systems.powerDistribution[key] *= scale;
            });
        }
        
        // Update UI
        this.createSystemControls();
        
        // Apply to game systems
        // TODO: Connect to actual game systems
    }
    
    balancePower() {
        this.settings.systems.powerDistribution = {
            weapons: 33.3,
            engines: 33.3,
            shields: 33.4
        };
        
        // Refresh UI
        this.switchTab('Systems');
    }
    
    updateHUDBrightness() {
        const alpha = this.settings.hud.brightness;
        document.documentElement.style.setProperty('--hud-brightness', alpha);
        
        // Update all HUD elements
        const hudElements = document.querySelectorAll('#starship-hud *');
        hudElements.forEach(el => {
            if (el.style.opacity) {
                el.style.opacity = parseFloat(el.style.opacity) * alpha;
            }
        });
    }
    
    updateHUDColor(color) {
        document.documentElement.style.setProperty('--hud-primary-color', color);
        
        // Update specific elements that use the color
        const hudElements = document.querySelectorAll('.hud-label, .console-header');
        hudElements.forEach(el => {
            el.style.color = color;
        });
    }
    
    updateHUDLayout(layout) {
        // Rearrange HUD elements based on layout
        switch(layout) {
            case 'combat':
                // Prioritize tactical info, targeting, weapons
                if (this.hud.tacticalPanel) {
                    this.hud.tacticalPanel.style.width = '350px';
                    this.hud.tacticalPanel.style.height = '400px';
                }
                break;
            case 'exploration':
                // Prioritize navigation, sensors, fuel
                if (this.hud.tacticalPanel) {
                    this.hud.tacticalPanel.style.width = '250px';
                    this.hud.tacticalPanel.style.height = '280px';
                }
                break;
            default:
                // Balanced layout
                if (this.hud.tacticalPanel) {
                    this.hud.tacticalPanel.style.width = '280px';
                    this.hud.tacticalPanel.style.height = '320px';
                }
        }
    }
    
    // Get current settings
    getSettings() {
        return this.settings;
    }
    
    // Load settings
    loadSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        
        // Apply all settings
        this.updateARLabelFilters();
        this.updateHUDBrightness();
        this.updateHUDColor(this.settings.hud.color);
        this.updateHUDLayout(this.settings.hud.layout);
    }
}