// Enhanced AR Label System with Smart Clustering and Cockpit Integration
// Builds upon ARLabels.js with advanced features for a cohesive cockpit experience

import * as THREE from 'three';

export class EnhancedARLabelSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.labels = new Map();
        this.clusters = new Map();
        this.enabled = true;
        this.labelContainer = new THREE.Object3D();
        this.labelContainer.name = 'EnhancedARLabels';
        scene.add(this.labelContainer);
        
        // Enhanced configuration with filtering and clustering
        this.config = {
            // Distance settings
            maxDistance: 100000,
            minDistance: 100,
            nearDistance: 5000,      // Objects closer than this get priority
            farDistance: 50000,      // Objects farther start fading
            
            // Label management
            maxLabelsVisible: 20,    // Maximum labels shown at once
            clusterThreshold: 30,    // Screen pixels before clustering
            priorityBoost: {
                targeted: 1000,
                hostile: 500,
                station: 300,
                planet: 200,
                moon: 100,
                neutral: 50
            },
            
            // Visual settings
            minOpacity: 0.2,
            maxOpacity: 0.95,
            labelScale: {
                min: 0.5,
                max: 2.0,
                distanceFactor: 0.0001
            },
            
            // Filtering options (controlled from cockpit)
            filters: {
                showPlanets: true,
                showMoons: true,
                showStations: true,
                showShips: true,
                showHostiles: true,
                minSize: 0,           // Minimum object size to show
                maxRange: 100000,     // Maximum range filter
                onlyTargetable: false // Only show targetable objects
            },
            
            // Colors with enhanced states
            colors: {
                friendly: '#00ff88',
                neutral: '#00aaff',
                hostile: '#ff3344',
                planet: '#4488ff',
                moon: '#888888',
                station: '#00ffcc',
                star: '#ffcc00',
                clustered: '#666666',
                priority: '#ffff00',
                scanning: '#ff00ff'
            }
        };
        
        // Screen space tracking for collision detection
        this.screenPositions = new Map();
        this.frameCount = 0;
        
        // Performance optimization
        this.updateInterval = 10; // Update every N frames - increased to reduce flicker
        this.lastClusterUpdate = 0;
        this.clusterUpdateInterval = 60; // Recluster every N frames - less frequent
    }
    
    createARLabel(object, data) {
        // Enhanced data structure
        const enhancedData = {
            ...data,
            priority: this.calculatePriority(data),
            lastUpdate: 0,
            screenPosition: new THREE.Vector2(),
            clustered: false,
            clusterParent: null,
            visible: true,
            opacity: 1,
            scale: 1,
            distanceToPlayer: 0
        };
        
        // Create canvas for AR label
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Create sprite with enhanced rendering
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: 0
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.name = `${data.name}_enhanced_ar_label`;
        sprite.renderOrder = 1000 + enhancedData.priority;
        
        // Store references
        sprite.userData = {
            object,
            data: enhancedData,
            context,
            texture,
            canvas
        };
        
        // Set initial scale - much smaller
        const baseScale = 20;  // Reduced from 50
        sprite.scale.set(baseScale * 2, baseScale, 1);
        
        // Add to container and map
        this.labelContainer.add(sprite);
        this.labels.set(data.name, sprite);
        
        return sprite;
    }
    
    calculatePriority(data) {
        let priority = 0;
        
        // Base priority by type
        if (data.targetLocked) priority += this.config.priorityBoost.targeted;
        if (data.faction === 'hostile') priority += this.config.priorityBoost.hostile;
        if (data.type === 'station') priority += this.config.priorityBoost.station;
        if (data.type === 'planet') priority += this.config.priorityBoost.planet;
        if (data.type === 'moon') priority += this.config.priorityBoost.moon;
        
        // Additional factors
        if (data.threat === 'high') priority += 300;
        if (data.dockable) priority += 100;
        if (data.hasQuest) priority += 200;
        
        return priority;
    }
    
    updateAll(playerShip, celestialObjects, enemies = []) {
        if (!this.enabled || !playerShip) return;
        
        this.frameCount++;
        
        // Add new labels for objects that don't have them
        this.ensureLabelsExist(celestialObjects, enemies);
        
        // Update label priorities and visibility
        if (this.frameCount % this.updateInterval === 0) {
            this.updateLabelStates(playerShip);
        }
        
        // Perform clustering check
        if (this.frameCount - this.lastClusterUpdate > this.clusterUpdateInterval) {
            this.performClustering();
            this.lastClusterUpdate = this.frameCount;
        }
        
        // Update visible labels
        this.updateVisibleLabels(playerShip);
    }
    
    ensureLabelsExist(celestialObjects, enemies) {
        // Add celestial object labels
        celestialObjects.forEach(obj => {
            if (!this.labels.has(obj.name) && obj.bodyObject && this.shouldShowObject(obj)) {
                const data = {
                    name: obj.name,
                    type: obj.isStar ? 'star' : obj.isMoon ? 'moon' : obj.isStation ? 'station' : 'planet',
                    faction: obj.faction || 'neutral',
                    dockable: obj.isStation || false,
                    velocity: obj.velocity || null,
                    radius: obj.radius || 50,
                    mass: obj.mass || 1
                };
                this.createARLabel(obj.bodyObject, data);
            }
        });
        
        // Add enemy ship labels
        enemies.forEach(enemy => {
            const name = `Enemy_${enemy.id}`;
            if (!this.labels.has(name) && enemy.model) {
                const data = {
                    name: name,
                    type: 'ship',
                    subtype: enemy.type,
                    faction: 'hostile',
                    threat: 'high',
                    hull: enemy.health,
                    maxHull: enemy.maxHealth,
                    velocity: enemy.velocity || new THREE.Vector3()
                };
                this.createARLabel(enemy.model, data);
            }
        });
    }
    
    shouldShowObject(obj) {
        const filters = this.config.filters;
        
        // Type filtering
        if (obj.isStar) return true; // Always show stars
        if (obj.isPlanet && !filters.showPlanets) return false;
        if (obj.isMoon && !filters.showMoons) return false;
        if (obj.isStation && !filters.showStations) return false;
        if (obj.type === 'ship' && !filters.showShips) return false;
        
        // Size filtering
        if (obj.radius && obj.radius < filters.minSize) return false;
        
        return true;
    }
    
    updateLabelStates(playerShip) {
        const playerPos = playerShip.position;
        const visibleLabels = [];
        
        // Calculate states for all labels
        this.labels.forEach((sprite, name) => {
            const data = sprite.userData.data;
            const object = sprite.userData.object;
            
            if (!object) return;
            
            // Get world position
            const objectPos = new THREE.Vector3();
            object.getWorldPosition(objectPos);
            
            // Calculate distance
            data.distanceToPlayer = playerPos.distanceTo(objectPos);
            
            // Apply filters with hysteresis to prevent flicker
            const hideThreshold = this.config.filters.maxRange * 1.1; // 10% buffer
            const showThreshold = this.config.filters.maxRange;
            
            if (data.distanceToPlayer > hideThreshold) {
                sprite.visible = false;
                return;
            } else if (data.distanceToPlayer > showThreshold && !sprite.visible) {
                // Don't show if we're in the buffer zone and already hidden
                return;
            }
            
            if (!this.shouldShowObject(data)) {
                sprite.visible = false;
                return;
            }
            
            // Calculate screen position
            const screenPos = this.worldToScreen(objectPos);
            data.screenPosition.copy(screenPos);
            
            // Update priority based on current state
            data.priority = this.calculatePriority(data);
            if (data.distanceToPlayer < this.config.nearDistance) {
                data.priority += 1000; // Boost nearby objects
            }
            
            // Add to visible list
            visibleLabels.push({ sprite, data, distance: data.distanceToPlayer });
        });
        
        // Sort by priority and distance
        visibleLabels.sort((a, b) => {
            // First by priority
            if (b.data.priority !== a.data.priority) {
                return b.data.priority - a.data.priority;
            }
            // Then by distance (closer first)
            return a.distance - b.distance;
        });
        
        // Limit visible labels with stable sorting to prevent flicker
        const currentlyVisible = visibleLabels.filter(item => item.sprite.visible).length;
        
        visibleLabels.forEach((item, index) => {
            // Keep currently visible items visible if they're still in range
            if (item.sprite.visible && index < this.config.maxLabelsVisible * 1.2) {
                item.data.visible = true;
                item.sprite.visible = true;
            } else if (!item.sprite.visible && index < this.config.maxLabelsVisible) {
                item.data.visible = true;
                item.sprite.visible = true;
            } else {
                item.data.visible = false;
                item.sprite.visible = false;
            }
        });
        
        // Store screen positions for clustering
        this.screenPositions.clear();
        visibleLabels.forEach(item => {
            if (item.data.visible) {
                this.screenPositions.set(item.sprite.name, item.data.screenPosition);
            }
        });
    }
    
    performClustering() {
        const clusters = [];
        const threshold = this.config.clusterThreshold;
        
        // Reset cluster states
        this.labels.forEach(sprite => {
            sprite.userData.data.clustered = false;
            sprite.userData.data.clusterParent = null;
        });
        
        // Find clusters
        this.screenPositions.forEach((pos1, name1) => {
            const sprite1 = this.labels.get(name1.replace('_enhanced_ar_label', ''));
            if (!sprite1 || sprite1.userData.data.clustered) return;
            
            const cluster = [sprite1];
            
            this.screenPositions.forEach((pos2, name2) => {
                if (name1 === name2) return;
                
                const sprite2 = this.labels.get(name2.replace('_enhanced_ar_label', ''));
                if (!sprite2 || sprite2.userData.data.clustered) return;
                
                const distance = pos1.distanceTo(pos2);
                if (distance < threshold) {
                    cluster.push(sprite2);
                    sprite2.userData.data.clustered = true;
                    sprite2.userData.data.clusterParent = sprite1;
                }
            });
            
            if (cluster.length > 1) {
                clusters.push(cluster);
                // Keep the highest priority label visible
                cluster.sort((a, b) => b.userData.data.priority - a.userData.data.priority);
                cluster[0].userData.data.clustered = false;
                for (let i = 1; i < cluster.length; i++) {
                    cluster[i].visible = false;
                }
            }
        });
        
        this.clusters = new Map(clusters.map((c, i) => [i, c]));
    }
    
    updateVisibleLabels(playerShip) {
        const playerPos = playerShip.position;
        
        this.labels.forEach((sprite, name) => {
            if (!sprite.visible) return;
            
            const data = sprite.userData.data;
            const object = sprite.userData.object;
            const context = sprite.userData.context;
            const texture = sprite.userData.texture;
            const canvas = sprite.userData.canvas;
            
            if (!object) return;
            
            // Get world position
            const objectPos = new THREE.Vector3();
            object.getWorldPosition(objectPos);
            
            // Update sprite position with smart offset
            sprite.position.copy(objectPos);
            const offset = this.calculateLabelOffset(data);
            sprite.position.y += offset;
            
            // Calculate distance-based scale with smoother transitions
            const distance = data.distanceToPlayer;
            const normalizedDistance = distance / this.config.maxDistance;
            const scaleFactor = THREE.MathUtils.clamp(
                1 - normalizedDistance * 0.5, // Less aggressive scaling
                this.config.labelScale.min,
                this.config.labelScale.max
            );
            
            const baseScale = 20;  // Match the initial scale
            sprite.scale.set(baseScale * 2 * scaleFactor, baseScale * scaleFactor, 1);
            
            // Calculate opacity
            let opacity = 1;
            if (distance > this.config.farDistance) {
                opacity = 1 - ((distance - this.config.farDistance) / (this.config.maxDistance - this.config.farDistance));
            }
            opacity = THREE.MathUtils.clamp(opacity, this.config.minOpacity, this.config.maxOpacity);
            
            // Apply cluster dimming
            if (data.clustered && data.clusterParent) {
                opacity *= 0.5;
            }
            
            sprite.material.opacity = opacity;
            
            // Update label content less frequently to reduce CPU load
            if (this.frameCount % (this.updateInterval * 3) === 0) {
                this.updateLabelContent(context, canvas, texture, data, playerShip, object);
            }
        });
    }
    
    calculateLabelOffset(data) {
        // Smart offset based on object type and size
        let baseOffset = 50;
        
        if (data.type === 'star') baseOffset = 300;
        else if (data.type === 'planet') baseOffset = 150;
        else if (data.type === 'moon') baseOffset = 80;
        else if (data.type === 'station') baseOffset = 100;
        else if (data.type === 'ship') baseOffset = 30;
        
        // Adjust for object radius if available
        if (data.radius) {
            baseOffset = Math.max(baseOffset, data.radius * 1.5);
        }
        
        return baseOffset;
    }
    
    updateLabelContent(ctx, canvas, texture, data, playerShip, object) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate relative velocity
        let relativeVelocity = 'N/A';
        if (data.velocity && playerShip.velocity) {
            const relVel = data.velocity.clone().sub(playerShip.velocity);
            relativeVelocity = `${(relVel.length() / 1000).toFixed(1)} km/s`;
        }
        
        // Format distance
        const distance = data.distanceToPlayer;
        let distanceText;
        if (distance < 1000) {
            distanceText = `${distance.toFixed(0)}u`;
        } else if (distance < 1000000) {
            distanceText = `${(distance / 1000).toFixed(1)}km`;
        } else {
            distanceText = `${(distance / 149.6e6).toFixed(2)}AU`;
        }
        
        // Prepare label info
        const info = {
            name: data.name,
            type: data.type,
            subtype: data.subtype,
            distance: distanceText,
            relativeVelocity: relativeVelocity,
            faction: data.faction,
            threat: data.threat,
            dockable: data.dockable,
            targetLocked: data.targetLocked,
            clustered: data.clustered,
            clusterCount: data.clusterCount || 0,
            hull: data.hull,
            maxHull: data.maxHull,
            priority: data.priority > 500
        };
        
        // Draw the label
        this.drawEnhancedLabel(ctx, canvas, info, data);
        
        // Update texture
        texture.needsUpdate = true;
    }
    
    drawEnhancedLabel(ctx, canvas, info, data) {
        const width = canvas.width;
        const height = canvas.height;
        
        // Determine primary color
        let primaryColor = this.config.colors.neutral;
        if (info.targetLocked) {
            primaryColor = this.config.colors.priority;
        } else if (info.faction === 'hostile') {
            primaryColor = this.config.colors.hostile;
        } else if (info.faction === 'friendly') {
            primaryColor = this.config.colors.friendly;
        } else if (data.type === 'star') {
            primaryColor = this.config.colors.star;
        } else if (data.type === 'planet') {
            primaryColor = this.config.colors.planet;
        } else if (data.type === 'moon') {
            primaryColor = this.config.colors.moon;
        } else if (data.type === 'station') {
            primaryColor = this.config.colors.station;
        }
        
        // Clustered indicator
        if (info.clustered) {
            ctx.fillStyle = this.config.colors.clustered;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1;
        }
        
        // Priority indicator
        if (info.priority) {
            // Animated priority border
            const time = Date.now() * 0.002;
            const pulse = Math.sin(time) * 0.3 + 0.7;
            
            ctx.strokeStyle = this.config.colors.priority;
            ctx.lineWidth = 3;
            ctx.globalAlpha = pulse;
            ctx.strokeRect(5, 5, width - 10, height - 10);
            ctx.globalAlpha = 1;
        }
        
        // Compact frame design
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        
        // Minimalist corner brackets
        const bracketSize = 15;
        ctx.beginPath();
        // Top left
        ctx.moveTo(10, 10 + bracketSize);
        ctx.lineTo(10, 10);
        ctx.lineTo(10 + bracketSize, 10);
        // Top right
        ctx.moveTo(width - 10 - bracketSize, 10);
        ctx.lineTo(width - 10, 10);
        ctx.lineTo(width - 10, 10 + bracketSize);
        ctx.stroke();
        
        // Target lock animation
        if (info.targetLocked) {
            const lockTime = Date.now() * 0.003;
            const lockPulse = Math.sin(lockTime) * 0.5 + 0.5;
            
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.globalAlpha = lockPulse;
            ctx.setLineDash([5, 5]);
            
            // Animated targeting reticle
            const reticleSize = 40;
            const centerX = width / 2;
            const centerY = height / 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, reticleSize, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }
        
        // Name with priority indicator
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.font = info.priority ? 'bold 20px "Orbitron", monospace' : '18px "Orbitron", monospace';
        ctx.textAlign = 'center';
        
        const displayName = info.clustered && info.clusterCount > 0 ? 
            `${info.name} [+${info.clusterCount}]` : info.name;
        ctx.fillText(displayName.toUpperCase(), width / 2, 35);
        
        ctx.shadowBlur = 0;
        
        // Compact info display
        ctx.font = '14px "Orbitron", monospace';
        ctx.textAlign = 'left';
        
        let yPos = 60;
        const lineHeight = 20;
        const leftMargin = 20;
        const dataX = 90;
        
        // Distance and velocity on same line
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('DIST:', leftMargin, yPos);
        ctx.fillStyle = primaryColor;
        ctx.fillText(info.distance, dataX, yPos);
        
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('VEL:', leftMargin + 160, yPos);
        ctx.fillStyle = primaryColor;
        ctx.fillText(info.relativeVelocity, dataX + 160, yPos);
        
        // Type/subtype
        yPos += lineHeight;
        if (info.subtype) {
            ctx.fillStyle = primaryColor;
            ctx.font = '12px "Orbitron", monospace';
            ctx.fillText(`${info.type.toUpperCase()} - ${info.subtype.toUpperCase()}`, leftMargin, yPos);
        } else {
            ctx.fillStyle = primaryColor;
            ctx.fillText(info.type.toUpperCase(), leftMargin, yPos);
        }
        
        // Status indicators (compact)
        yPos += lineHeight;
        const indicators = [];
        
        if (info.dockable) indicators.push('◈ DOCK');
        if (info.threat === 'high') indicators.push('⚠ THREAT');
        if (info.hull !== undefined) {
            const hullPercent = Math.floor((info.hull / info.maxHull) * 100);
            indicators.push(`HP: ${hullPercent}%`);
        }
        
        if (indicators.length > 0) {
            ctx.fillStyle = info.threat === 'high' ? '#ff5555' : '#00ff00';
            ctx.font = '12px "Orbitron", monospace';
            ctx.fillText(indicators.join(' | '), leftMargin, yPos);
        }
        
        // Subtle scan line effect
        ctx.strokeStyle = primaryColor;
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 1;
        const scanOffset = (Date.now() * 0.05) % height;
        ctx.beginPath();
        ctx.moveTo(0, scanOffset);
        ctx.lineTo(width, scanOffset);
        ctx.stroke();
    }
    
    worldToScreen(position) {
        const vector = position.clone();
        vector.project(this.camera);
        
        return new THREE.Vector2(
            (vector.x + 1) * window.innerWidth / 2,
            (-vector.y + 1) * window.innerHeight / 2
        );
    }
    
    // Cockpit integration methods
    setFilters(filters) {
        Object.assign(this.config.filters, filters);
    }
    
    setMaxLabels(max) {
        this.config.maxLabelsVisible = max;
    }
    
    setRangeFilter(range) {
        this.config.filters.maxRange = range;
    }
    
    highlightObject(objectName) {
        const sprite = this.labels.get(objectName);
        if (sprite) {
            sprite.userData.data.priority += 2000;
            sprite.userData.data.highlighted = true;
        }
    }
    
    clearHighlights() {
        this.labels.forEach(sprite => {
            if (sprite.userData.data.highlighted) {
                sprite.userData.data.priority -= 2000;
                sprite.userData.data.highlighted = false;
            }
        });
    }
    
    setTargetLocked(objectName, locked) {
        const sprite = this.labels.get(objectName);
        if (sprite) {
            sprite.userData.data.targetLocked = locked;
            sprite.userData.data.priority = this.calculatePriority(sprite.userData.data);
        }
    }
    
    getVisibleLabels() {
        const visible = [];
        this.labels.forEach((sprite, name) => {
            if (sprite.visible) {
                visible.push({
                    name: name,
                    data: sprite.userData.data,
                    position: sprite.position.clone()
                });
            }
        });
        return visible;
    }
    
    getClusters() {
        return Array.from(this.clusters.values());
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        this.labelContainer.visible = enabled;
    }
    
    dispose() {
        this.labels.forEach(sprite => {
            if (sprite.material) sprite.material.dispose();
            if (sprite.material.map) sprite.material.map.dispose();
            this.labelContainer.remove(sprite);
        });
        this.labels.clear();
        this.clusters.clear();
        this.screenPositions.clear();
    }
}