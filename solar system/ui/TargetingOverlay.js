import * as THREE from 'three';
import { getShipConfig } from '../ships/ShipConfigurations.js';

export class TargetingOverlay {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Create overlay canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'targeting-overlay';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        this.ctx = this.canvas.getContext('2d');
        
        // Targeting state
        this.targets = new Map();
        this.currentTarget = null;
        this.playerShip = null;
        
        // IFF colors
        this.colors = {
            friendly: '#00ff88',
            hostile: '#ff4444',
            neutral: '#ffaa00',
            station: '#00aaff',
            selected: '#ffffff',
            leadIndicator: '#ffcc00'
        };
        
        // Initialize
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setPlayerShip(ship) {
        this.playerShip = ship;
    }
    
    updateTargets(enemies, friendlies = [], stations = []) {
        this.targets.clear();
        
        // Add enemies
        enemies.forEach(enemy => {
            this.targets.set(enemy.id || enemy.model.uuid, {
                object: enemy.model,
                type: 'hostile',
                shipData: enemy
            });
        });
        
        // Add friendlies
        friendlies.forEach(friendly => {
            this.targets.set(friendly.uuid, {
                object: friendly,
                type: 'friendly',
                shipData: null
            });
        });
        
        // Add stations
        stations.forEach(station => {
            this.targets.set(station.uuid, {
                object: station,
                type: 'station',
                shipData: null
            });
        });
    }
    
    setCurrentTarget(targetId) {
        this.currentTarget = targetId;
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.camera || !this.playerShip) return;
        
        // Update camera matrices - newer Three.js versions handle this automatically
        this.camera.updateMatrixWorld();
        
        // Draw all targets
        this.targets.forEach((targetData, targetId) => {
            const isCurrentTarget = targetId === this.currentTarget;
            this.drawTarget(targetData, isCurrentTarget);
        });
    }
    
    drawTarget(targetData, isSelected) {
        const { object, type, shipData } = targetData;
        if (!object || !object.position) return;
        
        // Get screen position
        const screenPos = this.worldToScreen(object.position);
        if (!screenPos.visible) return;
        
        // Get distance to player
        const distance = object.position.distanceTo(this.playerShip.position);
        
        // Determine target size based on ship configuration
        let targetRadius = 20;
        if (object.userData && object.userData.modelName) {
            const config = getShipConfig(object.userData.modelName);
            targetRadius = Math.max(20, Math.min(80, config.desiredLength * 2));
        }
        
        // Scale based on distance
        const scale = Math.max(0.5, Math.min(2, 1000 / distance));
        targetRadius *= scale;
        
        // Choose color
        let color = this.colors[type] || this.colors.neutral;
        if (isSelected) {
            color = this.colors.selected;
        }
        
        // Draw target bracket
        this.drawTargetBracket(screenPos.x, screenPos.y, targetRadius, color, isSelected);
        
        // Draw target info
        this.drawTargetInfo(screenPos.x, screenPos.y, targetRadius, distance, type, shipData, isSelected);
        
        // Draw lead indicator for current target
        if (isSelected && type === 'hostile' && shipData) {
            this.drawLeadIndicator(object, shipData);
        }
    }
    
    drawTargetBracket(x, y, radius, color, isSelected) {
        const ctx = this.ctx;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;
        
        // Corner brackets
        const bracketSize = radius * 0.3;
        const gap = radius * 0.7;
        
        // Top-left
        ctx.beginPath();
        ctx.moveTo(x - radius, y - gap);
        ctx.lineTo(x - radius, y - radius);
        ctx.lineTo(x - gap, y - radius);
        ctx.stroke();
        
        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + gap, y - radius);
        ctx.lineTo(x + radius, y - radius);
        ctx.lineTo(x + radius, y - gap);
        ctx.stroke();
        
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x - radius, y + gap);
        ctx.lineTo(x - radius, y + radius);
        ctx.lineTo(x - gap, y + radius);
        ctx.stroke();
        
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + gap, y + radius);
        ctx.lineTo(x + radius, y + radius);
        ctx.lineTo(x + radius, y + gap);
        ctx.stroke();
        
        // Selected target gets additional elements
        if (isSelected) {
            // Rotating diamond
            const time = Date.now() * 0.001;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(time);
            
            ctx.beginPath();
            ctx.moveTo(0, -radius * 1.2);
            ctx.lineTo(radius * 0.3, 0);
            ctx.lineTo(0, radius * 1.2);
            ctx.lineTo(-radius * 0.3, 0);
            ctx.closePath();
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    drawTargetInfo(x, y, radius, distance, type, shipData, isSelected) {
        const ctx = this.ctx;
        
        ctx.font = '12px monospace';
        ctx.fillStyle = this.colors[type] || this.colors.neutral;
        ctx.textAlign = 'center';
        
        // Distance display
        let distanceText = '';
        if (distance < 1000) {
            distanceText = `${Math.round(distance)}m`;
        } else {
            distanceText = `${(distance / 1000).toFixed(1)}km`;
        }
        
        ctx.fillText(distanceText, x, y + radius + 20);
        
        // Additional info for selected target
        if (isSelected && shipData) {
            // Health bar
            const barWidth = radius * 2;
            const barHeight = 4;
            const barY = y + radius + 30;
            
            // Shield bar
            if (shipData.properties.shields > 0) {
                const shieldPercent = shipData.properties.shields / shipData.properties.maxShields;
                
                ctx.fillStyle = 'rgba(0, 128, 255, 0.3)';
                ctx.fillRect(x - barWidth/2, barY, barWidth, barHeight);
                
                ctx.fillStyle = '#0088ff';
                ctx.fillRect(x - barWidth/2, barY, barWidth * shieldPercent, barHeight);
            }
            
            // Hull bar
            const hullPercent = shipData.properties.hull / shipData.properties.maxHull;
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(x - barWidth/2, barY + barHeight + 2, barWidth, barHeight);
            
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(x - barWidth/2, barY + barHeight + 2, barWidth * hullPercent, barHeight);
            
            // Ship type
            ctx.font = '10px monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(shipData.shipType.toUpperCase(), x, y - radius - 10);
        }
    }
    
    drawLeadIndicator(target, targetData) {
        if (!this.playerShip || !targetData.state || !targetData.state.velocity) return;
        
        // Calculate projectile speed (from combat system)
        const projectileSpeed = 800; // matches CombatSystem projectile speed
        
        // Get relative positions and velocities
        const targetPos = target.position.clone();
        const playerPos = this.playerShip.position.clone();
        const targetVel = targetData.state.velocity.clone();
        const playerVel = this.playerShip.userData?.velocity || new THREE.Vector3();
        
        // Calculate intercept point
        const relativeVel = targetVel.clone().sub(playerVel);
        const toTarget = targetPos.clone().sub(playerPos);
        const distance = toTarget.length();
        
        // Simplified lead calculation
        const timeToIntercept = distance / projectileSpeed;
        const leadPoint = targetPos.clone().add(relativeVel.clone().multiplyScalar(timeToIntercept));
        
        // Convert to screen position
        const screenPos = this.worldToScreen(leadPoint);
        if (!screenPos.visible) return;
        
        // Draw lead indicator
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors.leadIndicator;
        ctx.fillStyle = this.colors.leadIndicator;
        ctx.lineWidth = 2;
        
        // Lead reticle
        const size = 15;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
        ctx.stroke();
        
        // Center dot
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Crosshair
        ctx.beginPath();
        ctx.moveTo(screenPos.x - size - 5, screenPos.y);
        ctx.lineTo(screenPos.x - size + 5, screenPos.y);
        ctx.moveTo(screenPos.x + size - 5, screenPos.y);
        ctx.lineTo(screenPos.x + size + 5, screenPos.y);
        ctx.moveTo(screenPos.x, screenPos.y - size - 5);
        ctx.lineTo(screenPos.x, screenPos.y - size + 5);
        ctx.moveTo(screenPos.x, screenPos.y + size - 5);
        ctx.lineTo(screenPos.x, screenPos.y + size + 5);
        ctx.stroke();
    }
    
    worldToScreen(position) {
        const vector = position.clone();
        vector.project(this.camera);
        
        const x = (vector.x + 1) * this.canvas.width / 2;
        const y = (-vector.y + 1) * this.canvas.height / 2;
        const visible = vector.z > -1 && vector.z < 1;
        
        return { x, y, visible };
    }
    
    dispose() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
} 