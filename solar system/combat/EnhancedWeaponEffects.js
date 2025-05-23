import * as THREE from 'three';
import { getShipConfig, calculateModelScale, scaleHardpointPosition } from '../ships/ShipConfigurations.js';

export class EnhancedWeaponEffects {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = new Map();
        this.particleSystems = new Map();
        
        // Create shared geometries for performance
        this.sharedGeometries = {
            particle: new THREE.SphereGeometry(0.1, 4, 4),
            flame: new THREE.ConeGeometry(0.5, 2, 8),
            flash: new THREE.SphereGeometry(0.5, 8, 8),
            beam: new THREE.CylinderGeometry(0.1, 0.1, 2, 6)
        };
        
        // Create material templates
        this.materials = {
            playerLaser: new THREE.MeshBasicMaterial({ color: 0xff4400 }),
            enemyLaser: new THREE.MeshBasicMaterial({ color: 0x00ff44 }),
            playerEngine: new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true }),
            enemyEngine: new THREE.MeshBasicMaterial({ color: 0xff00aa, transparent: true }),
            muzzleFlash: new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true }),
            explosion: new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true })
        };
    }
    
    // Create weapon firing effect with proper scaling
    createWeaponFireEffect(ship, weaponData, isPlayer = true) {
        const config = getShipConfig(ship.userData?.modelName || 'default');
        const actualShip = ship.userData?.isPlayer && ship.children[0] ? ship.children[0] : ship;
        const modelScale = actualShip.scale.x; // Use actual ship scale
        
        // Get weapon position in world space with proper scaling
        const weaponWorldPos = new THREE.Vector3();
        // Use unscaled position since ship model is already scaled
        let weaponLocalPos = weaponData.position ? 
            new THREE.Vector3(weaponData.position.x, weaponData.position.y, weaponData.position.z) :
            new THREE.Vector3(0, 0, -2);
        
        actualShip.localToWorld(weaponWorldPos.copy(weaponLocalPos));
        
        // Muzzle flash scaled to ship size - increased scale for visibility
        const flashScale = Math.max(1.5, modelScale * config.effects.muzzleFlashScale * 10);
        this.createMuzzleFlash(weaponWorldPos, flashScale, isPlayer);
        
        // Recoil effect on the ship
        this.createRecoilEffect(ship, weaponLocalPos);
        
        // Ejected shell casing for certain weapon types
        if (weaponData.type === 'cannon') {
            this.createShellCasing(weaponWorldPos, ship.quaternion, modelScale);
        }
        
        // Sound would go here
        // this.playWeaponSound(weaponData.type, weaponWorldPos);
    }
    
    createMuzzleFlash(position, scale, isPlayer = true) {
        const flashGroup = new THREE.Group();
        
        // Primary flash
        const flash = new THREE.Mesh(
            this.sharedGeometries.flash.clone(),
            this.materials.muzzleFlash.clone()
        );
        flash.scale.setScalar(scale);
        flashGroup.add(flash);
        
        // Secondary colored flash
        const colorFlash = new THREE.Mesh(
            this.sharedGeometries.flash.clone(),
            new THREE.MeshBasicMaterial({
                color: isPlayer ? 0xff4400 : 0x44ff00,
                transparent: true,
                opacity: 0.8
            })
        );
        colorFlash.scale.setScalar(scale * 1.5);
        flashGroup.add(colorFlash);
        
        // Smaller intense core
        const core = new THREE.Mesh(
            this.sharedGeometries.flash.clone(),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 1.0
            })
        );
        core.scale.setScalar(scale * 0.5);
        flashGroup.add(core);
        
        // Add directional light for flash
        const flashLight = new THREE.PointLight(
            isPlayer ? 0xff4400 : 0x44ff00,
            scale * 20,
            scale * 30
        );
        flashGroup.add(flashLight);
        
        flashGroup.position.copy(position);
        this.scene.add(flashGroup);
        
        // Animate flash
        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed < 0.1) {
                const progress = elapsed / 0.1;
                const fadeOut = 1 - progress;
                
                flash.material.opacity = fadeOut;
                colorFlash.material.opacity = 0.8 * fadeOut;
                core.material.opacity = fadeOut;
                flashLight.intensity = scale * 20 * fadeOut;
                
                // Quick expansion
                const expansion = 1 + progress * 1.5;
                flash.scale.setScalar(scale * expansion);
                colorFlash.scale.setScalar(scale * 1.5 * expansion);
                core.scale.setScalar(scale * 0.5 * expansion);
                
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(flashGroup);
            }
        };
        animate();
    }
    
    createRecoilEffect(ship, weaponPosition) {
        // Calculate recoil direction
        // IMPORTANT: 'ship' might be the model, not the group!
        // For player ships, we need to apply recoil to the parent group
        const shipToRecoil = (ship.parent && ship.parent.userData?.isPlayer) ? ship.parent : ship;
        
        // Since the projectile fires in direction (0, 0, -1) transformed by shipGroup.quaternion,
        // the recoil should be in the opposite direction: (0, 0, 1) transformed by shipGroup.quaternion
        const recoilDir = new THREE.Vector3(0, 0, 1);
        
        // Apply the ship group's rotation
        recoilDir.applyQuaternion(shipToRecoil.quaternion);
        
        const originalPos = shipToRecoil.position.clone();
        // Much reduced recoil for better gameplay
        const recoilDistance = 0.8; // Fixed small recoil distance
        
        // Animate recoil
        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed < 0.15) {
                const progress = elapsed / 0.15;
                const recoilCurve = Math.sin(progress * Math.PI) * (1 - progress * 0.7); // Decay curve
                
                shipToRecoil.position.copy(originalPos).add(
                    recoilDir.clone().multiplyScalar(recoilDistance * recoilCurve)
                );
                
                requestAnimationFrame(animate);
            } else {
                shipToRecoil.position.copy(originalPos);
            }
        };
        animate();
    }
    
    createShellCasing(position, orientation, modelScale) {
        const casingScale = Math.max(0.05, modelScale * 0.2);
        const casing = new THREE.Mesh(
            new THREE.CylinderGeometry(casingScale * 0.5, casingScale * 0.5, casingScale * 1.5, 6),
            new THREE.MeshBasicMaterial({ color: 0xccaa00 })
        );
        
        casing.position.copy(position);
        casing.quaternion.copy(orientation);
        
        // Random ejection velocity scaled to model
        const velocityScale = Math.max(3, modelScale * 50);
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * velocityScale,
            Math.random() * velocityScale * 0.5 + velocityScale * 0.5,
            (Math.random() - 0.5) * velocityScale
        );
        
        const angularVelocity = new THREE.Vector3(
            Math.random() * 10,
            Math.random() * 10,
            Math.random() * 10
        );
        
        this.scene.add(casing);
        
        // Animate casing physics
        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed < 2) {
                // Apply velocity
                casing.position.add(velocity.clone().multiplyScalar(0.016));
                
                // Apply gravity
                velocity.y -= 9.8 * 0.016;
                
                // Apply rotation
                casing.rotation.x += angularVelocity.x * 0.016;
                casing.rotation.y += angularVelocity.y * 0.016;
                casing.rotation.z += angularVelocity.z * 0.016;
                
                // Fade out
                casing.material.opacity = 1 - (elapsed / 2);
                
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(casing);
            }
        };
        animate();
    }
    
    // Enhanced thruster effects with proper scaling
    createThrusterEffect(ship, thrusterConfig, throttle = 1.0) {
        const shipId = ship.uuid;
        const config = getShipConfig(ship.userData?.modelName || 'default');
        const modelScale = ship.scale.x;
        
        // Initialize thruster system for this ship if needed
        if (!this.particleSystems.has(shipId)) {
            try {
                this.initializeThrusterSystem(ship, thrusterConfig, config);
            } catch (error) {
                console.error('Failed to initialize thruster system:', error);
                return;
            }
        }
        
        const thrusterSystem = this.particleSystems.get(shipId);
        if (!thrusterSystem) return;
        
        // Update each thruster
        thrusterSystem.thrusters.forEach((thruster, index) => {
            const engineConfig = config.enginePositions[index] || config.enginePositions[0];
            const intensity = throttle * (engineConfig.scale || 1.0);
            
            // Update flame effect
            if (thruster.flame) {
                thruster.flame.visible = intensity > 0.1;
                const baseScale = thruster.effectScale;
                thruster.flame.scale.set(
                    baseScale * (0.5 + intensity * 0.5),
                    baseScale * (0.5 + intensity * 0.5),
                    baseScale * (1 + intensity * 2)
                );
                thruster.flame.material.opacity = 0.3 + intensity * 0.7;
                
                // Add wobble effect
                const time = Date.now() * 0.001;
                const wobbleAmount = baseScale * 0.05;
                thruster.flame.position.copy(thruster.basePosition);
                thruster.flame.position.x += Math.sin(time * 10 + index) * wobbleAmount * intensity;
                thruster.flame.position.y += Math.cos(time * 12 + index) * wobbleAmount * intensity;
            }
            
            // Update glow light
            if (thruster.light) {
                thruster.light.intensity = thruster.baseLightIntensity * intensity;
                thruster.light.distance = thruster.baseLightDistance * (0.5 + intensity * 0.5);
            }
            
            // Update particles
            this.updateThrusterParticles(thruster, intensity, ship);
        });
    }
    
    // Advanced thruster effect system for individual thrust vectors
    createAdvancedThrusterEffect(ship, thrusterData, config) {
        const shipId = ship.uuid;
        const modelScale = ship.scale.x;
        
        // Initialize thruster system for this ship if needed
        if (!this.particleSystems.has(shipId)) {
            try {
                const thrusterPositions = config.enginePositions.map(engine => ({
                    position: new THREE.Vector3(engine.position.x, engine.position.y, engine.position.z),
                    scale: engine.scale,
                    type: engine.type
                }));
                this.initializeThrusterSystem(ship, thrusterPositions, config);
            } catch (error) {
                console.error('Failed to initialize thruster system:', error);
                return;
            }
        }
        
        const thrusterSystem = this.particleSystems.get(shipId);
        if (!thrusterSystem) return;
        
        // Update each thruster based on its type and thrust data
        thrusterSystem.thrusters.forEach((thruster, index) => {
            const engineConfig = config.enginePositions[index] || config.enginePositions[0];
            let intensity = 0;
            
            // Calculate intensity based on thruster type
            switch (engineConfig.type) {
                case 'main':
                    intensity = thrusterData.main * (engineConfig.scale || 1.0);
                    break;
                case 'secondary':
                    intensity = thrusterData.main * 0.8 * (engineConfig.scale || 1.0);
                    break;
                case 'maneuvering':
                    // Maneuvering thrusters respond to lateral and vertical thrust
                    const thrusterPos = engineConfig.position;
                    let maneuverIntensity = 0;
                    
                    // Left/right thrusters (X-axis movement)
                    if (Math.abs(thrusterPos.x) > 15) {
                        const xActivation = thrusterPos.x * thrusterData.direction.x < 0 ? 1 : 0;
                        maneuverIntensity = Math.max(maneuverIntensity, thrusterData.lateral * xActivation);
                    }
                    
                    // Up/down thrusters (Y-axis movement)
                    if (Math.abs(thrusterPos.y) > 8) {
                        const yActivation = thrusterPos.y * thrusterData.direction.y > 0 ? 1 : 0;
                        maneuverIntensity = Math.max(maneuverIntensity, thrusterData.vertical * yActivation);
                    }
                    
                    // Forward/reverse thrusters (Z-axis movement)
                    if (thrusterPos.z < 0) { // Forward thrusters
                        maneuverIntensity = Math.max(maneuverIntensity, 
                            thrusterData.direction.z > 0 ? thrusterData.main * 0.3 : 0);
                    }
                    
                    intensity = maneuverIntensity * (engineConfig.scale || 1.0);
                    break;
                default:
                    intensity = thrusterData.main * (engineConfig.scale || 1.0);
            }
            
            // Update flame effect
            if (thruster.flame) {
                thruster.flame.visible = intensity > 0.05;
                const baseScale = thruster.effectScale;
                thruster.flame.scale.set(
                    baseScale * (0.5 + intensity * 0.5),
                    baseScale * (0.5 + intensity * 0.5),
                    baseScale * (0.8 + intensity * 1.5)
                );
                thruster.flame.material.opacity = 0.3 + intensity * 0.7;
                
                // Add dynamic wobble effect scaled to thruster size
                const time = Date.now() * 0.001;
                const wobbleAmount = baseScale * 0.02;
                thruster.flame.position.copy(thruster.basePosition);
                thruster.flame.position.x += Math.sin(time * 12 + index) * wobbleAmount * intensity;
                thruster.flame.position.y += Math.cos(time * 15 + index) * wobbleAmount * intensity;
            }
            
            // Update glow light
            if (thruster.light) {
                thruster.light.intensity = thruster.baseLightIntensity * intensity;
                thruster.light.distance = thruster.baseLightDistance * (0.5 + intensity * 0.5);
            }
            
            // Update particles
            this.updateThrusterParticles(thruster, intensity, ship);
        });
    }
    
    initializeThrusterSystem(ship, thrusterConfig, shipConfig) {
        const thrusters = [];
        const isPlayer = ship.userData?.isPlayer || false;
        const modelScale = ship.scale.x;
        
        thrusterConfig.forEach((config, index) => {
            const engineConfig = shipConfig.enginePositions[index] || shipConfig.enginePositions[0];
            
            // Use unscaled positions since ship model is already scaled
            const position = new THREE.Vector3(
                engineConfig.position.x, 
                engineConfig.position.y, 
                engineConfig.position.z
            );
            
            // Create flame cone with appropriate size based on model scale and engine scale
            const effectScale = Math.max(0.2, modelScale * (engineConfig.scale || 1.0) * 0.5);
            const flameGeometry = this.sharedGeometries.flame.clone();
            
            const flameMaterial = (isPlayer ? this.materials.playerEngine : this.materials.enemyEngine).clone();
            flameMaterial.opacity = 0.8;
            
            const flame = new THREE.Mesh(flameGeometry, flameMaterial);
            flame.position.copy(position);
            flame.rotation.x = Math.PI / 2; // Point flame backwards
            flame.scale.setScalar(effectScale);
            
            // Add to the actual model, not the parent group
            const actualShip = ship.userData?.isPlayer && ship.children[0] ? ship.children[0] : ship;
            actualShip.add(flame);
            
            // Create glow light with proper intensity based on scale
            const baseLightIntensity = Math.max(1, modelScale * 5 * (engineConfig.scale || 1.0));
            const baseLightDistance = Math.max(4, modelScale * 15 * (engineConfig.scale || 1.0));
            const glowLight = new THREE.PointLight(
                isPlayer ? 0x00aaff : 0xff00aa,
                baseLightIntensity,
                baseLightDistance
            );
            glowLight.position.copy(position);
            actualShip.add(glowLight);
            
            // Create particle system with scaled particles
            const particles = this.createThrusterParticleSystem(position, isPlayer, effectScale);
            actualShip.add(particles.group);
            
            thrusters.push({
                flame: flame,
                light: glowLight,
                particles: particles,
                basePosition: position.clone(),
                config: engineConfig,
                effectScale: effectScale,
                baseLightIntensity: baseLightIntensity,
                baseLightDistance: baseLightDistance
            });
        });
        
        this.particleSystems.set(ship.uuid, {
            thrusters: thrusters,
            ship: ship
        });
    }
    
    createThrusterParticleSystem(position, isPlayer, effectScale = 1.0) {
        const particleCount = Math.min(20, Math.max(5, Math.floor(effectScale * 10)));
        const particles = [];
        const group = new THREE.Group();
        
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: isPlayer ? 0x00aaff : 0xff00aa,
            transparent: true,
            opacity: 0.6
        });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                this.sharedGeometries.particle.clone(),
                particleMaterial.clone()
            );
            
            particle.userData = {
                velocity: new THREE.Vector3(),
                lifetime: 0,
                maxLifetime: 0.8 + Math.random() * 0.4,
                baseScale: Math.max(0.1, effectScale * 0.3)
            };
            
            particle.scale.setScalar(particle.userData.baseScale);
            particles.push(particle);
            group.add(particle);
        }
        
        group.position.copy(position);
        
        return {
            group: group,
            particles: particles,
            emissionRate: 15,
            lastEmission: 0,
            effectScale: effectScale
        };
    }
    
    updateThrusterParticles(thruster, intensity, ship) {
        if (!thruster.particles || intensity < 0.1) {
            // Hide all particles when thruster is off
            thruster.particles.particles.forEach(particle => {
                particle.visible = false;
            });
            return;
        }
        
        const currentTime = Date.now() / 1000;
        const deltaTime = 0.016; // Assume 60fps
        const effectScale = thruster.effectScale;
        
        thruster.particles.particles.forEach(particle => {
            particle.userData.lifetime += deltaTime;
            
            // Reset particle if lifetime exceeded
            if (particle.userData.lifetime >= particle.userData.maxLifetime) {
                if (intensity > 0.1 && Math.random() < intensity) {
                    // Reset particle at thruster position
                    particle.position.set(0, 0, 0);
                    particle.userData.lifetime = 0;
                    
                    // Scale velocity based on effect scale and intensity
                    const velocityScale = effectScale * 3;
                    particle.userData.velocity.set(
                        (Math.random() - 0.5) * velocityScale * 0.3,
                        (Math.random() - 0.5) * velocityScale * 0.3,
                        (2 + Math.random() * 3) * velocityScale * intensity
                    );
                    particle.visible = true;
                } else {
                    particle.visible = false;
                }
            }
            
            if (particle.visible) {
                // Update position
                particle.position.add(
                    particle.userData.velocity.clone().multiplyScalar(deltaTime)
                );
                
                // Fade out and scale based on lifetime
                const lifeRatio = particle.userData.lifetime / particle.userData.maxLifetime;
                particle.material.opacity = 0.6 * (1 - lifeRatio) * intensity;
                
                // Scale particle based on lifetime and effect scale
                const scale = particle.userData.baseScale * (0.5 + lifeRatio * 0.5);
                particle.scale.setScalar(scale);
            }
        });
    }
    
    // Clean up effects when ship is destroyed
    cleanupShipEffects(ship) {
        const shipId = ship.uuid;
        
        // Remove thruster system
        if (this.particleSystems.has(shipId)) {
            const system = this.particleSystems.get(shipId);
            system.thrusters.forEach(thruster => {
                if (thruster.flame) ship.remove(thruster.flame);
                if (thruster.light) ship.remove(thruster.light);
                if (thruster.particles) ship.remove(thruster.particles.group);
            });
            this.particleSystems.delete(shipId);
        }
        
        // Remove any active effects
        this.activeEffects.delete(shipId);
    }
}