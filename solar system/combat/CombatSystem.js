import * as THREE from 'three';
import { getShipConfig, scaleHardpointPosition } from '../ships/ShipConfigurations.js';

export class CombatSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Combat entities
        this.playerShip = null;
        this.aiShips = new Map();
        this.projectiles = [];
        this.explosions = [];
        
        // Combat settings
        this.settings = {
            projectileSpeed: 800, // Increased speed for better hit registration
            projectileLifetime: 4, // seconds
            explosionDuration: 1.5,
            combatRange: 5000 // max engagement distance
        };
        
        // Projectile pool for performance
        this.projectilePool = [];
        this.maxProjectiles = 100;
        this.initProjectilePool();
        
        // Effects - Enhanced projectile materials
        this.laserMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400
        });
        
        this.enemyLaserMaterial = new THREE.MeshBasicMaterial({
            color: 0x44ff00
        });
    }
    
    initProjectilePool() {
        const projectileGeometry = new THREE.CylinderGeometry(0.3, 0.3, 8, 6);
        projectileGeometry.rotateX(Math.PI / 2);
        
        for (let i = 0; i < this.maxProjectiles; i++) {
            const projectile = new THREE.Mesh(projectileGeometry, this.laserMaterial);
            projectile.visible = false;
            
            // Add glowing effect
            const glowGeometry = new THREE.CylinderGeometry(0.6, 0.6, 12, 6);
            glowGeometry.rotateX(Math.PI / 2);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xff4400,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            projectile.add(glow);
            
            this.scene.add(projectile);
            this.projectilePool.push(projectile);
        }
    }
    
    setPlayerShip(ship) {
        this.playerShip = ship;
    }
    
    addAIShip(aiShip) {
        this.aiShips.set(aiShip.id, aiShip);
        
        // Set up weapon firing callback
        aiShip.onFireWeapon = (weaponData) => {
            this.createProjectile(weaponData, false);
            
            // Create visual effects if enhancedWeaponEffects is available
            if (window.enhancedWeaponEffects) {
                window.enhancedWeaponEffects.createWeaponFireEffect(aiShip.model, {
                    position: weaponData.origin,
                    type: weaponData.weaponType || 'blaster'
                }, false);
            }
        };
        
        // Set up destruction callback
        aiShip.onDestroy = (ship) => {
            this.createExplosion(ship.model.position);
            this.aiShips.delete(ship.id);
            
            // Cleanup effects
            if (window.enhancedWeaponEffects) {
                window.enhancedWeaponEffects.cleanupShipEffects(ship.model);
            }
        };
    }
    
    removeAIShip(aiShipId) {
        const ship = this.aiShips.get(aiShipId);
        if (ship) {
            ship.destroy();
        }
    }
    
    update(deltaTime) {
        // Update all AI ships
        this.aiShips.forEach(aiShip => {
            aiShip.update(deltaTime, this.playerShip, Array.from(this.aiShips.values()));
        });
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update explosions
        this.updateExplosions(deltaTime);
        
        // Check combat range and cleanup distant AI
        this.checkCombatRange();
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Update position
            const movement = projectile.userData.velocity.clone().multiplyScalar(deltaTime);
            projectile.position.add(movement);
            
            // Update lifetime
            projectile.userData.lifetime -= deltaTime;
            
            // Check collisions
            let hit = false;
            
            if (projectile.userData.isPlayerProjectile) {
                // Check hits on AI ships
                this.aiShips.forEach(aiShip => {
                    if (!hit && this.checkProjectileHit(projectile, aiShip.model, 20)) {
                        hit = true;
                        const alive = aiShip.takeDamage(projectile.userData.damage);
                        if (!alive) {
                            aiShip.destroy();
                        }
                        this.createHitEffect(projectile.position);
                    }
                });
            } else {
                // Check hits on player ship
                if (this.playerShip && this.checkProjectileHit(projectile, this.playerShip, 30)) {
                    hit = true;
                    // Call the damage function if it exists
                    if (window.applyDamage) {
                        window.applyDamage(projectile.userData.damage);
                    }
                    this.createHitEffect(projectile.position);
                }
            }
            
            // Remove projectile if hit or expired
            if (hit || projectile.userData.lifetime <= 0) {
                this.returnProjectileToPool(projectile);
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    checkProjectileHit(projectile, target, hitRadius = 20) {
        if (!target || !target.position) return false;
        
        const distance = projectile.position.distanceTo(target.position);
        
        // Very precise hit detection for skill-based combat
        let effectiveHitRadius = 0.8; // Much smaller base radius
        
        if (target.userData && target.userData.isPlayer) {
            // Player ship: 20m desired length, so about 10m radius for hit
            effectiveHitRadius = 10.0;
        } else if (target.userData && target.userData.modelName) {
            // Enemy ships: Use their configuration
            const config = getShipConfig(target.userData.modelName);
            if (config.desiredLength) {
                effectiveHitRadius = config.desiredLength * 0.5; // Half the ship length
                // Sky_Predator: 8m length = 4m radius
            } else {
                effectiveHitRadius = 2.0; // Fallback for unknown ships
            }
        } else if (target.scale && target.scale.x) {
            // For objects without user data, use scale as fallback
            effectiveHitRadius = Math.max(1.0, target.scale.x * 3.0);
        }
        
        // Debug hit detection occasionally
        if (Math.random() < 0.1) { // 10% chance to log
            console.log(`[Hit Check] Distance: ${distance.toFixed(2)}, Hit Radius: ${effectiveHitRadius.toFixed(2)}, Hit: ${distance <= effectiveHitRadius}`);
        }
        
        return distance <= effectiveHitRadius;
    }
    
    updateExplosions(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.userData.lifetime -= deltaTime;
            
            // Animate explosion
            const progress = 1 - (explosion.userData.lifetime / this.settings.explosionDuration);
            explosion.scale.setScalar(1 + progress * 3);
            explosion.material.opacity = 1 - progress;
            
            // Remove finished explosions
            if (explosion.userData.lifetime <= 0) {
                this.scene.remove(explosion);
                this.explosions.splice(i, 1);
            }
        }
    }
    
    createProjectile(weaponData, isPlayerProjectile = true) {
        // Get projectile from pool
        const projectile = this.projectilePool.find(p => !p.visible);
        if (!projectile) return; // Pool exhausted
        
        // Configure projectile
        projectile.position.copy(weaponData.origin);
        projectile.visible = true;
        
        // Set material based on owner
        projectile.material = isPlayerProjectile ? this.laserMaterial : this.enemyLaserMaterial;
        
        // Update glow effect for projectile type
        const glow = projectile.children[0];
        if (glow) {
            glow.material.color.setHex(isPlayerProjectile ? 0xff4400 : 0x44ff00);
        }
        
        // Set direction
        const direction = weaponData.direction.normalize();
        projectile.lookAt(projectile.position.clone().add(direction));
        
        // Set projectile data
        projectile.userData = {
            velocity: direction.multiplyScalar(this.settings.projectileSpeed),
            damage: weaponData.damage,
            lifetime: this.settings.projectileLifetime,
            owner: weaponData.owner,
            isPlayerProjectile: isPlayerProjectile
        };
        
        this.projectiles.push(projectile);
        
        // Create muzzle flash
        this.createMuzzleFlash(weaponData.origin);
    }
    
    returnProjectileToPool(projectile) {
        projectile.visible = false;
        projectile.userData = {};
    }
    
    createMuzzleFlash(position) {
        const flashGeometry = new THREE.SphereGeometry(1, 8, 8); // Reduced from 3 to 1
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Quick fade out
        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed < 0.2) {
                flash.material.opacity = 1 - (elapsed / 0.2);
                flash.scale.setScalar(1 + elapsed * 2); // Reduced expansion from 5 to 2
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(flash);
            }
        };
        animate();
    }
    
    createHitEffect(position) {
        const hitGeometry = new THREE.SphereGeometry(5, 8, 8);
        const hitMaterial = new THREE.MeshBasicMaterial({
            color: 0xffa500,
            transparent: true,
            opacity: 1
        });
        
        const hit = new THREE.Mesh(hitGeometry, hitMaterial);
        hit.position.copy(position);
        this.scene.add(hit);
        
        // Particle burst effect
        const particles = [];
        for (let i = 0; i < 10; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(1, 4, 4),
                hitMaterial.clone()
            );
            particle.position.copy(position);
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50
            );
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Animate
        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed < 0.5) {
                const progress = elapsed / 0.5;
                
                // Main hit effect
                hit.material.opacity = 1 - progress;
                hit.scale.setScalar(1 + progress * 2);
                
                // Particles
                particles.forEach(particle => {
                    particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
                    particle.material.opacity = 1 - progress;
                });
                
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(hit);
                particles.forEach(p => this.scene.remove(p));
            }
        };
        animate();
    }
    
    createExplosion(position) {
        const explosionGeometry = new THREE.SphereGeometry(10, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 1
        });
        
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(position);
        explosion.userData.lifetime = this.settings.explosionDuration;
        
        this.scene.add(explosion);
        this.explosions.push(explosion);
        
        // Add light for explosion
        const explosionLight = new THREE.PointLight(0xff6600, 100, 200);
        explosionLight.position.copy(position);
        this.scene.add(explosionLight);
        
        // Fade out light
        const startIntensity = explosionLight.intensity;
        const animateLight = () => {
            if (explosion.userData.lifetime > 0) {
                const progress = explosion.userData.lifetime / this.settings.explosionDuration;
                explosionLight.intensity = startIntensity * progress;
                requestAnimationFrame(animateLight);
            } else {
                this.scene.remove(explosionLight);
            }
        };
        animateLight();
    }
    
    firePlayerWeapon(weaponIndex = 0) {
        if (!this.playerShip) return;
        
        // Get weapon hardpoints from ship configuration
        const config = getShipConfig(this.playerShip.userData?.modelName || 'default');
        const actualShip = this.playerShip.userData?.isPlayer && this.playerShip.children[0] ? this.playerShip.children[0] : this.playerShip;
        
        if (weaponIndex >= config.weaponHardpoints.length) return;
        
        // Use unscaled weapon position since model is already scaled
        const weaponHardpoint = config.weaponHardpoints[weaponIndex];
        const weaponLocalPos = new THREE.Vector3(
            weaponHardpoint.position.x, 
            weaponHardpoint.position.y, 
            weaponHardpoint.position.z
        );
        
        // Calculate world position using actual ship model
        const worldPosition = new THREE.Vector3();
        actualShip.localToWorld(worldPosition.copy(weaponLocalPos));
        
        // Get firing direction - just use the parent group's rotation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.playerShip.quaternion);
        
        this.createProjectile({
            origin: worldPosition,
            direction: direction,
            damage: 25,
            owner: this.playerShip,
            weaponIndex: weaponIndex,
            weaponType: weaponHardpoint.type
        }, true);
        
        // Create visual effects if enhancedWeaponEffects is available
        if (window.enhancedWeaponEffects) {
            window.enhancedWeaponEffects.createWeaponFireEffect(actualShip, {
                position: weaponLocalPos,
                type: weaponHardpoint.type
            }, true);
        }
    }
    
    checkCombatRange() {
        if (!this.playerShip) return;
        
        this.aiShips.forEach((aiShip, id) => {
            const distance = aiShip.model.position.distanceTo(this.playerShip.position);
            if (distance > this.settings.combatRange * 2) {
                // Remove AI ships that are too far away
                this.removeAIShip(id);
            }
        });
    }
    
    getClosestEnemy() {
        if (!this.playerShip) return null;
        
        let closestShip = null;
        let closestDistance = Infinity;
        
        this.aiShips.forEach(aiShip => {
            const distance = aiShip.model.position.distanceTo(this.playerShip.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestShip = aiShip;
            }
        });
        
        return closestShip;
    }
}