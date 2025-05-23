// Augmented Reality Labels for Starship Mode
// Creates holographic-style labels appropriate for in-game starship HUD

import * as THREE from 'three';

export class ARLabelSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.labels = new Map();
        this.enabled = true;
        this.labelContainer = new THREE.Object3D();
        this.labelContainer.name = 'ARLabels';
        scene.add(this.labelContainer);
        
        // Label configuration
        this.config = {
            maxDistance: 100000, // Maximum distance to show labels
            minOpacity: 0.3,
            maxOpacity: 0.9,
            colors: {
                friendly: '#00ff88',
                neutral: '#00aaff',
                hostile: '#ff3344',
                planet: '#4488ff',
                moon: '#888888',
                station: '#00ffcc',
                star: '#ffcc00'
            }
        };
    }
    
    createARLabel(object, data) {
        // Create canvas for AR label
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.name = `${data.name}_ar_label`;
        sprite.renderOrder = 1000;
        
        // Store update function
        sprite.updateARLabel = (playerShip) => {
            this.updateARLabelContent(sprite, object, data, playerShip, context, texture, canvas);
        };
        
        // Initial scale
        const baseScale = 50;
        sprite.scale.set(baseScale * 2, baseScale, 1);
        
        // Add to container
        this.labelContainer.add(sprite);
        this.labels.set(data.name, { sprite, object, data });
        
        return sprite;
    }
    
    updateARLabelContent(sprite, object, data, playerShip, context, texture, canvas) {
        if (!this.enabled || !playerShip) {
            sprite.visible = false;
            return;
        }
        
        // Get positions
        const objectPos = new THREE.Vector3();
        object.getWorldPosition(objectPos);
        const playerPos = playerShip.position;
        
        // Calculate distance and direction
        const distance = playerPos.distanceTo(objectPos);
        
        // Check max distance
        if (distance > this.config.maxDistance) {
            sprite.visible = false;
            return;
        }
        
        sprite.visible = true;
        
        // Calculate relative velocity if applicable
        let relativeVelocity = 'N/A';
        if (data.velocity) {
            const relVel = data.velocity.clone().sub(playerShip.velocity || new THREE.Vector3());
            relativeVelocity = `${(relVel.length() / 1000).toFixed(1)} km/s`;
        }
        
        // Format distance
        let distanceText;
        if (distance < 1000) {
            distanceText = `${distance.toFixed(0)}u`;
        } else if (distance < 1000000) {
            distanceText = `${(distance / 1000).toFixed(1)}km`;
        } else {
            distanceText = `${(distance / 149.6e6).toFixed(2)}AU`;
        }
        
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw AR-style label
        this.drawARLabel(context, canvas, {
            name: data.name,
            type: data.type || 'unknown',
            distance: distanceText,
            relativeVelocity: relativeVelocity,
            faction: data.faction,
            threat: data.threat || 'none',
            dockable: data.dockable || false,
            targetLocked: data.targetLocked || false
        });
        
        // Update sprite position to be above object
        sprite.position.copy(objectPos);
        const offset = data.isStar ? 200 : 50;
        sprite.position.y += offset;
        
        // Calculate opacity based on distance
        const opacityFactor = 1 - (distance / this.config.maxDistance);
        sprite.material.opacity = THREE.MathUtils.lerp(
            this.config.minOpacity,
            this.config.maxOpacity,
            opacityFactor
        );
        
        // Update texture
        texture.needsUpdate = true;
    }
    
    drawARLabel(ctx, canvas, info) {
        const width = canvas.width;
        const height = canvas.height;
        
        // Determine color based on type/faction
        let primaryColor = this.config.colors.neutral;
        if (info.faction === 'hostile' || info.threat === 'high') {
            primaryColor = this.config.colors.hostile;
        } else if (info.faction === 'friendly') {
            primaryColor = this.config.colors.friendly;
        } else if (info.type === 'star') {
            primaryColor = this.config.colors.star;
        } else if (info.type === 'planet') {
            primaryColor = this.config.colors.planet;
        } else if (info.type === 'moon') {
            primaryColor = this.config.colors.moon;
        } else if (info.type === 'station') {
            primaryColor = this.config.colors.station;
        }
        
        // Draw holographic frame
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        
        // Top frame
        ctx.beginPath();
        ctx.moveTo(20, 20);
        ctx.lineTo(width - 20, 20);
        ctx.lineTo(width - 40, 40);
        ctx.stroke();
        
        // Bottom frame
        ctx.beginPath();
        ctx.moveTo(20, height - 20);
        ctx.lineTo(width - 20, height - 20);
        ctx.lineTo(width - 40, height - 40);
        ctx.stroke();
        
        // Target lock indicator if locked
        if (info.targetLocked) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            
            // Draw targeting brackets
            const bracketSize = 30;
            // Top left
            ctx.beginPath();
            ctx.moveTo(10, 10 + bracketSize);
            ctx.lineTo(10, 10);
            ctx.lineTo(10 + bracketSize, 10);
            ctx.stroke();
            
            // Top right
            ctx.beginPath();
            ctx.moveTo(width - 10 - bracketSize, 10);
            ctx.lineTo(width - 10, 10);
            ctx.lineTo(width - 10, 10 + bracketSize);
            ctx.stroke();
            
            ctx.setLineDash([]);
        }
        
        // Reset alpha
        ctx.globalAlpha = 1.0;
        
        // Draw name with glow effect
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(info.name.toUpperCase(), width / 2, 50);
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Draw info grid
        ctx.font = '16px "Orbitron", monospace';
        ctx.fillStyle = primaryColor;
        ctx.textAlign = 'left';
        
        let yPos = 90;
        const lineHeight = 25;
        
        // Distance
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DIST:', 40, yPos);
        ctx.fillStyle = primaryColor;
        ctx.fillText(info.distance, 120, yPos);
        
        // Relative velocity
        yPos += lineHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('REL V:', 40, yPos);
        ctx.fillStyle = primaryColor;
        ctx.fillText(info.relativeVelocity, 120, yPos);
        
        // Type/Status
        yPos += lineHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('TYPE:', 40, yPos);
        ctx.fillStyle = primaryColor;
        ctx.fillText(info.type.toUpperCase(), 120, yPos);
        
        // Docking indicator
        if (info.dockable) {
            yPos += lineHeight;
            ctx.fillStyle = '#00ff00';
            ctx.fillText('◈ DOCKING AVAILABLE', 40, yPos);
        }
        
        // Threat indicator
        if (info.threat !== 'none') {
            yPos += lineHeight;
            ctx.fillStyle = info.threat === 'high' ? '#ff0000' : '#ffaa00';
            ctx.fillText(`⚠ THREAT: ${info.threat.toUpperCase()}`, 40, yPos);
        }
        
        // Draw scan lines effect
        ctx.strokeStyle = primaryColor;
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    updateAll(playerShip, celestialObjects) {
        if (!this.enabled) return;
        
        // Update existing labels
        this.labels.forEach((labelData, name) => {
            if (labelData.sprite.updateARLabel) {
                labelData.sprite.updateARLabel(playerShip);
            }
        });
        
        // Add labels for celestial objects that don't have them
        celestialObjects.forEach(obj => {
            if (!this.labels.has(obj.name) && obj.bodyObject) {
                const data = {
                    name: obj.name,
                    type: obj.isStar ? 'star' : obj.isMoon ? 'moon' : obj.isStation ? 'station' : 'planet',
                    faction: obj.faction || 'neutral',
                    dockable: obj.isStation || false,
                    velocity: obj.velocity || null
                };
                this.createARLabel(obj.bodyObject, data);
            }
        });
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        this.labelContainer.visible = enabled;
    }
    
    setTargetLocked(objectName, locked) {
        const labelData = this.labels.get(objectName);
        if (labelData) {
            labelData.data.targetLocked = locked;
        }
    }
    
    clear() {
        this.labels.forEach((labelData) => {
            this.labelContainer.remove(labelData.sprite);
            if (labelData.sprite.material) labelData.sprite.material.dispose();
            if (labelData.sprite.material.map) labelData.sprite.material.map.dispose();
        });
        this.labels.clear();
    }
}