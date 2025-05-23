import * as THREE from 'three';
import { getShipConfig } from '../ships/ShipConfigurations.js';

export class ImprovedHitboxes {
    constructor() {
        this.hitboxes = new Map();
        this.debugMode = false;
        this.debugHelpers = new Map();
    }
    
    /**
     * Create hitbox for a ship based on its configuration
     */
    createHitbox(ship, modelName) {
        const config = getShipConfig(modelName);
        
        // Calculate actual bounds from the model
        const box = new THREE.Box3().setFromObject(ship);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        // Create oriented bounding box (OBB) data
        const hitboxData = {
            type: config.stats?.isStation ? 'station' : 'ship',
            size: size,
            center: center,
            // Store local center offset for when ship rotates
            localCenter: ship.worldToLocal(center.clone()),
            
            // Create multiple hitboxes for larger ships
            subBoxes: this.createSubHitboxes(config, size),
            
            // Store ship reference
            ship: ship,
            config: config
        };
        
        this.hitboxes.set(ship.uuid, hitboxData);
        
        // Create debug visualization if enabled
        if (this.debugMode) {
            this.createDebugHelper(ship, hitboxData);
        }
        
        return hitboxData;
    }
    
    /**
     * Create sub-hitboxes for more accurate collision on larger ships
     */
    createSubHitboxes(config, totalSize) {
        const subBoxes = [];
        
        if (config.stats?.isStation) {
            // Stations get a sphere hitbox plus sub-boxes
            subBoxes.push({
                type: 'sphere',
                radius: Math.max(totalSize.x, totalSize.y, totalSize.z) * 0.5,
                offset: new THREE.Vector3(0, 0, 0)
            });
        } else if (config.desiredLength > 30) {
            // Large ships get multiple boxes along their length
            const numBoxes = Math.ceil(config.desiredLength / 15);
            const boxLength = totalSize.z / numBoxes;
            
            for (let i = 0; i < numBoxes; i++) {
                const offset = new THREE.Vector3(
                    0,
                    0,
                    (i - (numBoxes - 1) / 2) * boxLength
                );
                
                subBoxes.push({
                    type: 'box',
                    size: new THREE.Vector3(totalSize.x, totalSize.y, boxLength),
                    offset: offset
                });
            }
        } else {
            // Smaller ships get a single box
            subBoxes.push({
                type: 'box',
                size: totalSize.clone(),
                offset: new THREE.Vector3(0, 0, 0)
            });
        }
        
        return subBoxes;
    }
    
    /**
     * Check collision between a projectile and all registered ships
     */
    checkProjectileCollision(projectile, excludeShip = null) {
        const projectilePos = projectile.position;
        
        for (const [shipId, hitboxData] of this.hitboxes) {
            if (hitboxData.ship === excludeShip) continue;
            if (!hitboxData.ship.visible) continue;
            
            // Get world position of ship's center
            const worldCenter = hitboxData.ship.localToWorld(hitboxData.localCenter.clone());
            
            // Quick sphere check first
            const distance = projectilePos.distanceTo(worldCenter);
            const maxSize = Math.max(hitboxData.size.x, hitboxData.size.y, hitboxData.size.z);
            
            if (distance > maxSize) continue;
            
            // Detailed sub-box check
            for (const subBox of hitboxData.subBoxes) {
                if (this.checkSubBoxCollision(projectile, hitboxData.ship, subBox)) {
                    return {
                        hit: true,
                        ship: hitboxData.ship,
                        hitPoint: projectilePos.clone(),
                        normal: this.calculateHitNormal(projectilePos, hitboxData.ship, subBox)
                    };
                }
            }
        }
        
        return { hit: false };
    }
    
    /**
     * Check collision with a specific sub-box
     */
    checkSubBoxCollision(projectile, ship, subBox) {
        const projectilePos = projectile.position;
        
        if (subBox.type === 'sphere') {
            // Sphere collision
            const sphereCenter = ship.localToWorld(subBox.offset.clone());
            return projectilePos.distanceTo(sphereCenter) <= subBox.radius;
            
        } else if (subBox.type === 'box') {
            // Oriented bounding box collision
            // Transform projectile position to ship's local space
            const localPos = ship.worldToLocal(projectilePos.clone());
            
            // Check against local box bounds
            const halfSize = subBox.size.clone().multiplyScalar(0.5);
            const minBounds = subBox.offset.clone().sub(halfSize);
            const maxBounds = subBox.offset.clone().add(halfSize);
            
            return localPos.x >= minBounds.x && localPos.x <= maxBounds.x &&
                   localPos.y >= minBounds.y && localPos.y <= maxBounds.y &&
                   localPos.z >= minBounds.z && localPos.z <= maxBounds.z;
        }
        
        return false;
    }
    
    /**
     * Calculate hit normal for impact effects
     */
    calculateHitNormal(hitPoint, ship, subBox) {
        if (subBox.type === 'sphere') {
            const sphereCenter = ship.localToWorld(subBox.offset.clone());
            return hitPoint.clone().sub(sphereCenter).normalize();
        } else {
            // For box, find closest face
            const localHit = ship.worldToLocal(hitPoint.clone());
            const halfSize = subBox.size.clone().multiplyScalar(0.5);
            const center = subBox.offset;
            
            // Find which face is closest
            const faces = [
                { normal: new THREE.Vector3(1, 0, 0), dist: Math.abs(localHit.x - (center.x + halfSize.x)) },
                { normal: new THREE.Vector3(-1, 0, 0), dist: Math.abs(localHit.x - (center.x - halfSize.x)) },
                { normal: new THREE.Vector3(0, 1, 0), dist: Math.abs(localHit.y - (center.y + halfSize.y)) },
                { normal: new THREE.Vector3(0, -1, 0), dist: Math.abs(localHit.y - (center.y - halfSize.y)) },
                { normal: new THREE.Vector3(0, 0, 1), dist: Math.abs(localHit.z - (center.z + halfSize.z)) },
                { normal: new THREE.Vector3(0, 0, -1), dist: Math.abs(localHit.z - (center.z - halfSize.z)) }
            ];
            
            faces.sort((a, b) => a.dist - b.dist);
            const localNormal = faces[0].normal;
            
            // Transform normal to world space
            return localNormal.transformDirection(ship.matrixWorld).normalize();
        }
    }
    
    /**
     * Create debug visualization
     */
    createDebugHelper(ship, hitboxData) {
        const helpers = [];
        
        for (const subBox of hitboxData.subBoxes) {
            let helper;
            
            if (subBox.type === 'sphere') {
                const geometry = new THREE.SphereGeometry(subBox.radius, 16, 16);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.3
                });
                helper = new THREE.Mesh(geometry, material);
                helper.position.copy(subBox.offset);
                
            } else if (subBox.type === 'box') {
                const geometry = new THREE.BoxGeometry(subBox.size.x, subBox.size.y, subBox.size.z);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.3
                });
                helper = new THREE.Mesh(geometry, material);
                helper.position.copy(subBox.offset);
            }
            
            ship.add(helper);
            helpers.push(helper);
        }
        
        this.debugHelpers.set(ship.uuid, helpers);
    }
    
    /**
     * Toggle debug visualization
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        
        if (enabled) {
            // Create helpers for existing hitboxes
            for (const [shipId, hitboxData] of this.hitboxes) {
                if (!this.debugHelpers.has(shipId)) {
                    this.createDebugHelper(hitboxData.ship, hitboxData);
                }
            }
        } else {
            // Remove all debug helpers
            for (const [shipId, helpers] of this.debugHelpers) {
                const hitboxData = this.hitboxes.get(shipId);
                if (hitboxData) {
                    helpers.forEach(helper => hitboxData.ship.remove(helper));
                }
            }
            this.debugHelpers.clear();
        }
    }
    
    /**
     * Update hitbox when ship is destroyed
     */
    removeHitbox(ship) {
        const shipId = ship.uuid;
        
        // Remove debug helpers if any
        const helpers = this.debugHelpers.get(shipId);
        if (helpers) {
            helpers.forEach(helper => ship.remove(helper));
            this.debugHelpers.delete(shipId);
        }
        
        // Remove hitbox data
        this.hitboxes.delete(shipId);
    }
    
    /**
     * Get effective hit radius for a ship (for compatibility)
     */
    getEffectiveHitRadius(ship) {
        const hitboxData = this.hitboxes.get(ship.uuid);
        if (!hitboxData) return 5; // Default fallback
        
        // Return approximate radius based on size
        return Math.max(
            hitboxData.size.x,
            hitboxData.size.y,
            hitboxData.size.z
        ) * 0.5;
    }
} 