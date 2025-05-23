import * as THREE from 'three';

// Advanced AI behavior system with tactical awareness
export class AIBehaviorSystem {
    constructor() {
        this.behaviors = {
            // Aggressive fighter behavior
            fighter: {
                engage: this.fighterEngage.bind(this),
                evade: this.fighterEvade.bind(this),
                pursuit: this.fighterPursuit.bind(this),
                strafe: this.fighterStrafe.bind(this)
            },
            
            // Defensive cruiser behavior  
            cruiser: {
                engage: this.cruiserEngage.bind(this),
                evade: this.cruiserEvade.bind(this),
                broadside: this.cruiserBroadside.bind(this),
                retreat: this.cruiserRetreat.bind(this)
            },
            
            // Hit and run interceptor
            interceptor: {
                engage: this.interceptorSlashAttack.bind(this),
                evade: this.interceptorBarrelRoll.bind(this),
                ambush: this.interceptorAmbush.bind(this)
            }
        };
        
        // Tactical parameters
        this.tacticalParams = {
            optimalEngagementRange: 0.7, // Fraction of weapon range
            evasionThreshold: 0.3, // Hull percentage to start evading
            pursuitTimeout: 5.0, // Seconds before giving up pursuit
            strafeAngle: Math.PI / 6, // Angle for strafing runs
            formationSpacing: 50 // Units between ships in formation
        };
    }
    
    // Fighter behaviors - aggressive and maneuverable
    fighterEngage(ship, target, deltaTime) {
        const toTarget = new THREE.Vector3().subVectors(target.position, ship.model.position);
        const distance = toTarget.length();
        const optimalDistance = ship.properties.weaponRange * this.tacticalParams.optimalEngagementRange;
        
        // Spiral approach when far
        if (distance > optimalDistance * 1.5) {
            const spiralAngle = Date.now() * 0.001;
            const tangent = new THREE.Vector3(-toTarget.z, 0, toTarget.x).normalize();
            const spiralOffset = tangent.multiplyScalar(Math.sin(spiralAngle) * 30);
            toTarget.add(spiralOffset);
        }
        
        // Strafe when close
        if (distance < optimalDistance * 0.5) {
            return this.fighterStrafe(ship, target, deltaTime);
        }
        
        // Calculate intercept point based on target velocity
        const interceptPoint = this.calculateInterceptPoint(ship, target);
        const toIntercept = new THREE.Vector3().subVectors(interceptPoint, ship.model.position);
        
        return {
            desiredDirection: toIntercept.normalize(),
            desiredSpeed: ship.properties.maxSpeed,
            shouldFire: distance < ship.properties.weaponRange && this.hasLineOfSight(ship, target)
        };
    }
    
    fighterEvade(ship, threat, deltaTime) {
        const toThreat = new THREE.Vector3().subVectors(threat.position, ship.model.position);
        const distance = toThreat.length();
        
        // Corkscrew evasion pattern
        const time = Date.now() * 0.002;
        const radius = 50;
        const evasionVector = new THREE.Vector3(
            Math.cos(time) * radius,
            Math.sin(time * 2) * radius * 0.5,
            -distance * 0.5
        );
        
        // Apply rotation based on ship's current orientation
        evasionVector.applyQuaternion(ship.model.quaternion);
        
        return {
            desiredDirection: evasionVector.normalize(),
            desiredSpeed: ship.properties.maxSpeed,
            shouldFire: false,
            isEvading: true
        };
    }
    
    fighterPursuit(ship, target, deltaTime) {
        // Lead pursuit - aim ahead of target
        const leadTime = this.calculateLeadTime(ship, target);
        const futurePosition = this.predictFuturePosition(target, leadTime);
        const toPredicted = new THREE.Vector3().subVectors(futurePosition, ship.model.position);
        
        // Boost speed during pursuit
        return {
            desiredDirection: toPredicted.normalize(),
            desiredSpeed: ship.properties.maxSpeed * 1.2, // Afterburner
            shouldFire: false
        };
    }
    
    fighterStrafe(ship, target, deltaTime) {
        const toTarget = new THREE.Vector3().subVectors(target.position, ship.model.position);
        const distance = toTarget.length();
        
        // Calculate strafe direction perpendicular to target
        const right = new THREE.Vector3().crossVectors(toTarget, new THREE.Vector3(0, 1, 0)).normalize();
        const strafeDirection = right.multiplyScalar(Math.sin(Date.now() * 0.001) * 100);
        
        // Maintain some forward movement
        const forwardComponent = toTarget.normalize().multiplyScalar(0.3);
        const finalDirection = new THREE.Vector3().addVectors(strafeDirection, forwardComponent).normalize();
        
        return {
            desiredDirection: finalDirection,
            desiredSpeed: ship.properties.maxSpeed * 0.8,
            shouldFire: distance < ship.properties.weaponRange * 0.8
        };
    }
    
    // Cruiser behaviors - steady and tactical
    cruiserEngage(ship, target, deltaTime) {
        const toTarget = new THREE.Vector3().subVectors(target.position, ship.model.position);
        const distance = toTarget.length();
        const optimalDistance = ship.properties.weaponRange * 0.8;
        
        // Maintain optimal firing distance
        let desiredDirection;
        if (distance > optimalDistance) {
            desiredDirection = toTarget.normalize();
        } else if (distance < optimalDistance * 0.6) {
            desiredDirection = toTarget.normalize().multiplyScalar(-1); // Back away
        } else {
            // Circle at optimal range
            return this.cruiserBroadside(ship, target, deltaTime);
        }
        
        return {
            desiredDirection: desiredDirection,
            desiredSpeed: ship.properties.maxSpeed * 0.6,
            shouldFire: distance < ship.properties.weaponRange && this.hasGoodFiringAngle(ship, target)
        };
    }
    
    cruiserBroadside(ship, target, deltaTime) {
        // Circle target while keeping broadside facing them
        const toTarget = new THREE.Vector3().subVectors(target.position, ship.model.position);
        const tangent = new THREE.Vector3(-toTarget.z, 0, toTarget.x).normalize();
        
        // Slowly orbit
        const orbitSpeed = 0.5;
        const desiredDirection = tangent.multiplyScalar(orbitSpeed);
        
        return {
            desiredDirection: desiredDirection,
            desiredSpeed: ship.properties.maxSpeed * 0.5,
            shouldFire: true,
            maintainBroadside: true
        };
    }
    
    cruiserEvade(ship, threat, deltaTime) {
        // Defensive retreat while firing
        const awayFromThreat = new THREE.Vector3().subVectors(ship.model.position, threat.position).normalize();
        
        // Zigzag pattern
        const zigzagOffset = Math.sin(Date.now() * 0.0005) * 50;
        const perpendicular = new THREE.Vector3(-awayFromThreat.z, 0, awayFromThreat.x);
        awayFromThreat.add(perpendicular.multiplyScalar(zigzagOffset));
        
        return {
            desiredDirection: awayFromThreat.normalize(),
            desiredSpeed: ship.properties.maxSpeed * 0.7,
            shouldFire: true // Suppressing fire
        };
    }
    
    cruiserRetreat(ship, threat, deltaTime) {
        // Full retreat to regroup
        const awayFromThreat = new THREE.Vector3().subVectors(ship.model.position, threat.position).normalize();
        
        return {
            desiredDirection: awayFromThreat,
            desiredSpeed: ship.properties.maxSpeed,
            shouldFire: false,
            isRetreating: true
        };
    }
    
    // Interceptor behaviors - fast hit and run
    interceptorSlashAttack(ship, target, deltaTime) {
        const toTarget = new THREE.Vector3().subVectors(target.position, ship.model.position);
        const distance = toTarget.length();
        
        // High speed attack run
        if (distance > ship.properties.weaponRange * 0.5) {
            return {
                desiredDirection: toTarget.normalize(),
                desiredSpeed: ship.properties.maxSpeed * 1.5, // Boost
                shouldFire: false
            };
        } else {
            // Fire and break away
            const breakAway = new THREE.Vector3(
                toTarget.x + (Math.random() - 0.5) * 100,
                toTarget.y + 50,
                toTarget.z
            ).normalize();
            
            return {
                desiredDirection: breakAway,
                desiredSpeed: ship.properties.maxSpeed * 1.5,
                shouldFire: true
            };
        }
    }
    
    interceptorBarrelRoll(ship, threat, deltaTime) {
        // Dramatic barrel roll evasion
        const time = Date.now() * 0.003;
        const rollRadius = 30;
        
        const evasionVector = new THREE.Vector3(
            Math.cos(time * 4) * rollRadius,
            Math.sin(time * 4) * rollRadius,
            -100
        );
        
        evasionVector.applyQuaternion(ship.model.quaternion);
        
        return {
            desiredDirection: evasionVector.normalize(),
            desiredSpeed: ship.properties.maxSpeed * 1.3,
            shouldFire: false,
            isBarrelRolling: true
        };
    }
    
    interceptorAmbush(ship, target, deltaTime) {
        // Position behind and above target
        const targetForward = new THREE.Vector3(0, 0, -1).applyQuaternion(target.quaternion);
        const ambushPosition = target.position.clone()
            .add(targetForward.multiplyScalar(-100))
            .add(new THREE.Vector3(0, 50, 0));
            
        const toAmbushPoint = new THREE.Vector3().subVectors(ambushPosition, ship.model.position);
        
        return {
            desiredDirection: toAmbushPoint.normalize(),
            desiredSpeed: ship.properties.maxSpeed * 0.7, // Stealth approach
            shouldFire: false,
            isAmbushing: true
        };
    }
    
    // Utility functions
    calculateInterceptPoint(shooter, target) {
        // Simple linear intercept calculation
        if (!target.userData || !target.userData.velocity) {
            return target.position.clone();
        }
        
        const projectileSpeed = 500; // Match your projectile speed
        const toTarget = new THREE.Vector3().subVectors(target.position, shooter.model.position);
        const distance = toTarget.length();
        const timeToIntercept = distance / projectileSpeed;
        
        const targetVelocity = target.userData.velocity || new THREE.Vector3();
        const interceptPoint = target.position.clone().add(
            targetVelocity.clone().multiplyScalar(timeToIntercept)
        );
        
        return interceptPoint;
    }
    
    calculateLeadTime(shooter, target) {
        const distance = shooter.model.position.distanceTo(target.position);
        const projectileSpeed = 500;
        return distance / projectileSpeed;
    }
    
    predictFuturePosition(target, time) {
        if (!target.userData || !target.userData.velocity) {
            return target.position.clone();
        }
        
        return target.position.clone().add(
            target.userData.velocity.clone().multiplyScalar(time)
        );
    }
    
    hasLineOfSight(shooter, target) {
        // Simple LOS check - can be enhanced with raycasting
        const toTarget = new THREE.Vector3().subVectors(target.position, shooter.model.position);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shooter.model.quaternion);
        const angle = forward.angleTo(toTarget.normalize());
        
        return angle < Math.PI / 4; // 45 degree cone
    }
    
    hasGoodFiringAngle(shooter, target) {
        const toTarget = new THREE.Vector3().subVectors(target.position, shooter.model.position);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shooter.model.quaternion);
        const angle = forward.angleTo(toTarget.normalize());
        
        return angle < Math.PI / 6; // 30 degree cone for cruisers
    }
}

// Export singleton instance
export const aiBehaviorSystem = new AIBehaviorSystem();