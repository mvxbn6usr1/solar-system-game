import * as THREE from 'three';
import { aiBehaviorSystem } from './AIBehaviors.js';
import { getShipConfig, scaleHardpointPosition } from '../ships/ShipConfigurations.js';

// Base AI Ship class - designed to be extended for different ship types
export class AIShip {
    constructor(scene, model, shipConfig = {}) {
        this.scene = scene;
        this.model = model;
        this.id = `ai_ship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.shipType = shipConfig.shipType || 'fighter';
        this.modelName = shipConfig.modelName || 'Sky_Predator';
        
        // Ship properties (can be overridden by shipConfig)
        this.properties = {
            // Health/damage
            hull: 300,
            maxHull: 300,
            shields: 500,
            maxShields: 500,
            
            // Combat stats
            weaponDamage: 15,
            weaponRange: 1000,
            weaponCooldown: 1.5, // seconds
            
            // Movement
            maxSpeed: 200,
            acceleration: 50,
            turnRate: 1.5,
            
            // AI behavior
            aggressiveness: 0.7, // 0-1, how likely to attack vs evade
            accuracy: 0.8, // 0-1, shooting accuracy
            reactionTime: 0.5, // seconds before responding to threats
            
            ...shipConfig
        };
        
        // Combat state
        this.state = {
            currentTarget: null,
            lastFireTime: 0,
            isEvading: false,
            isDamaged: false,
            velocity: new THREE.Vector3(),
            desiredDirection: new THREE.Vector3()
        };
        
        // Behavior patterns
        this.behaviorMode = 'patrol'; // patrol, engage, evade, pursue
        
        // Get ship configuration
        this.shipConfig = getShipConfig(this.modelName);
        
        // Weapon hardpoints
        this.weapons = [];
        this.setupWeapons();
        
        // Store velocity for AI behaviors
        this.model.userData.velocity = this.state.velocity;
        
        // Engine effects handled by EnhancedWeaponEffects
    }
    
    setupWeapons() {
        // Use ship configuration for weapon setup
        const modelScale = this.model.scale.x;
        this.weapons = this.shipConfig.weaponHardpoints.map(hardpoint => {
            const scaledPos = scaleHardpointPosition(hardpoint.position, modelScale);
            return {
                position: new THREE.Vector3(scaledPos.x, scaledPos.y, scaledPos.z),
                type: hardpoint.type,
                damage: this.properties.weaponDamage,
                cooldown: this.properties.weaponCooldown,
                lastFired: 0
            };
        });
    }
    
    // Engine effects now handled by EnhancedWeaponEffects
    
    update(deltaTime, playerShip, allShips = []) {
        // Update AI behavior
        this.updateBehavior(playerShip, allShips);
        
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update combat
        this.updateCombat(deltaTime, playerShip);
        
        // Update effects
        this.updateEffects(deltaTime);
    }
    
    updateBehavior(playerShip, allShips) {
        // Check if playerShip exists and has position
        if (!playerShip || !playerShip.position) {
            console.warn('AI updateBehavior: playerShip is null or has no position');
            return;
        }
        
        const distanceToPlayer = this.model.position.distanceTo(playerShip.position);
        
        // Update target
        this.state.currentTarget = playerShip;
        
        // State machine for AI behavior
        switch (this.behaviorMode) {
            case 'patrol':
                if (distanceToPlayer < this.properties.weaponRange * 1.5) {
                    this.behaviorMode = 'engage';
                }
                break;
                
            case 'engage':
                if (this.properties.hull < this.properties.maxHull * 0.3) {
                    this.behaviorMode = 'evade';
                } else if (distanceToPlayer > this.properties.weaponRange * 2) {
                    this.behaviorMode = 'pursue';
                }
                break;
                
            case 'evade':
                if (this.properties.hull > this.properties.maxHull * 0.5) {
                    this.behaviorMode = 'engage';
                }
                break;
                
            case 'pursue':
                if (distanceToPlayer < this.properties.weaponRange) {
                    this.behaviorMode = 'engage';
                }
                break;
        }
    }
    
    updateMovement(deltaTime) {
        if (!this.state.currentTarget || !this.state.currentTarget.position) return;
        
        // Use advanced AI behaviors
        const behaviorType = aiBehaviorSystem.behaviors[this.shipType];
        if (!behaviorType) return;
        
        let behaviorResult;
        switch (this.behaviorMode) {
            case 'engage':
                behaviorResult = behaviorType.engage ? 
                    behaviorType.engage(this, this.state.currentTarget, deltaTime) :
                    { desiredDirection: new THREE.Vector3(0, 0, -1), desiredSpeed: this.properties.maxSpeed };
                break;
                
            case 'evade':
                behaviorResult = behaviorType.evade ?
                    behaviorType.evade(this, this.state.currentTarget, deltaTime) :
                    { desiredDirection: new THREE.Vector3(0, 0, 1), desiredSpeed: this.properties.maxSpeed };
                break;
                
            case 'pursue':
                behaviorResult = behaviorType.pursuit ?
                    behaviorType.pursuit(this, this.state.currentTarget, deltaTime) :
                    { desiredDirection: new THREE.Vector3(0, 0, -1), desiredSpeed: this.properties.maxSpeed };
                break;
                
            default:
                behaviorResult = { desiredDirection: new THREE.Vector3(0, 0, 0), desiredSpeed: 0 };
        }
        
        this.state.desiredDirection = behaviorResult.desiredDirection;
        const targetSpeed = behaviorResult.desiredSpeed || this.properties.maxSpeed;
        
        // Smooth acceleration with damping
        const acceleration = this.state.desiredDirection.clone()
            .multiplyScalar(this.properties.acceleration * deltaTime);
        
        // Apply velocity damping for smoother movement
        this.state.velocity.multiplyScalar(0.98);
        this.state.velocity.add(acceleration);
        
        // Limit speed with smooth approach
        const currentSpeed = this.state.velocity.length();
        if (currentSpeed > this.properties.maxSpeed) {
            this.state.velocity.normalize().multiplyScalar(this.properties.maxSpeed);
        }
        
        // Smooth speed transitions
        if (currentSpeed < targetSpeed * 0.9) {
            const speedBoost = Math.min(targetSpeed - currentSpeed, this.properties.acceleration * deltaTime);
            if (this.state.velocity.length() > 0.01) {
                this.state.velocity.normalize().multiplyScalar(currentSpeed + speedBoost);
            }
        }
        
        // Update position with interpolation
        const movement = this.state.velocity.clone().multiplyScalar(deltaTime);
        this.model.position.add(movement);
        
        // Smooth rotation to face movement direction
        if (this.state.velocity.length() > 0.1) {
            const targetQuaternion = new THREE.Quaternion();
            const lookDirection = this.state.velocity.clone().normalize();
            const rotationMatrix = new THREE.Matrix4().lookAt(
                new THREE.Vector3(),
                lookDirection,
                new THREE.Vector3(0, 1, 0)
            );
            targetQuaternion.setFromRotationMatrix(rotationMatrix);
            
            // More responsive but smooth rotation
            const rotationSpeed = Math.min(this.properties.turnRate * 2, 5.0);
            this.model.quaternion.slerp(targetQuaternion, rotationSpeed * deltaTime);
        }
        
        // Update world matrix for accurate positioning
        this.model.updateMatrixWorld(true);
    }
    
    updateCombat(deltaTime, playerShip) {
        if (!this.state.currentTarget || this.behaviorMode === 'evade') return;
        
        const currentTime = Date.now() / 1000;
        const distanceToTarget = this.model.position.distanceTo(this.state.currentTarget.position);
        
        // Check if we can fire
        if (distanceToTarget <= this.properties.weaponRange) {
            // Fire each weapon independently
            this.weapons.forEach((weapon, index) => {
                if (currentTime - weapon.lastFired >= weapon.cooldown) {
                    // Calculate accuracy
                    const accuracyRoll = Math.random();
                    if (accuracyRoll <= this.properties.accuracy) {
                        this.fireWeapon(weapon, index);
                        weapon.lastFired = currentTime;
                    }
                }
            });
        }
    }
    
    fireWeapon(weapon, weaponIndex) {
        // This will be called by combat manager to create projectiles
        if (this.onFireWeapon) {
            const worldPosition = new THREE.Vector3();
            this.model.localToWorld(worldPosition.copy(weapon.position));
            
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(this.model.quaternion);
            
            this.onFireWeapon({
                origin: worldPosition,
                direction: direction,
                damage: weapon.damage,
                owner: this,
                weaponIndex: weaponIndex,
                weaponType: weapon.type
            });
        }
    }
    
    updateEffects(deltaTime) {
        // Effects now handled by EnhancedWeaponEffects
    }
    
    takeDamage(amount) {
        // Apply damage to shields first, then hull
        if (this.properties.shields > 0) {
            const shieldDamage = Math.min(amount, this.properties.shields);
            this.properties.shields -= shieldDamage;
            amount -= shieldDamage;
        }
        
        if (amount > 0) {
            this.properties.hull = Math.max(0, this.properties.hull - amount);
            this.state.isDamaged = true;
            
            // Trigger evasive behavior if heavily damaged
            if (this.properties.hull < this.properties.maxHull * 0.3) {
                this.behaviorMode = 'evade';
            }
        }
        
        return this.properties.hull > 0; // Return true if still alive
    }
    
    destroy() {
        // Clean up
        if (this.model && this.model.parent) {
            this.model.parent.remove(this.model);
        }
        if (this.onDestroy) {
            this.onDestroy(this);
        }
    }
}

// Specific AI ship types
export class FighterAI extends AIShip {
    constructor(scene, model, modelName = 'Sky_Predator') {
        super(scene, model, {
            shipType: 'fighter',
            modelName: modelName,
            hull: 150,
            maxHull: 150,
            shields: 200,
            maxShields: 200,
            weaponDamage: 20,
            weaponRange: 800,
            weaponCooldown: 0.8,
            maxSpeed: 300,
            acceleration: 100,
            turnRate: 2.5,
            aggressiveness: 0.9,
            accuracy: 0.7
        });
    }
}

export class CruiserAI extends AIShip {
    constructor(scene, model, modelName = 'Sky_Predator') {
        super(scene, model, {
            shipType: 'cruiser',
            modelName: modelName,
            hull: 500,
            maxHull: 500,
            shields: 800,
            maxShields: 800,
            weaponDamage: 40,
            weaponRange: 1500,
            weaponCooldown: 2.5,
            maxSpeed: 150,
            acceleration: 30,
            turnRate: 0.8,
            aggressiveness: 0.6,
            accuracy: 0.9
        });
    }
    
    // Weapon setup inherited from base class, uses ship configuration
}