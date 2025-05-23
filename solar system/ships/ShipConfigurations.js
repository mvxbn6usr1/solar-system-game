import * as THREE from 'three';

// Helper function to measure actual model dimensions
export function measureModelDimensions(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    console.log('[Model Debug] Measured dimensions:', {
        width: size.x,
        height: size.y, 
        length: size.z,
        center: box.getCenter(new THREE.Vector3())
    });
    return size;
}

// Ship-specific configurations - ACCOUNTING FOR MODEL ROTATION
// Note: Starship model is rotated -90° around Y axis in main.js
// This means: native X → scene Z, native Z → scene -X
export const ShipConfigurations = {
    // Player Starship Calypso - positions in NATIVE model space
    'Starship_Calypso': {
        modelPath: './textures/Starship_Calypso_0521230350_texture.glb',
        nativeLength: 236.18, // Native X-axis is the length
        desiredLength: 20, // 20 meters in final scene scale
        centroidOffset: [32.98, -13.83, -0.22], // Actual centroid from geometry
        
        // Weapon hardpoints - under AFT (rear) wing protrusions, moved forward
        // In native space: rear = +X, wings spread on Z axis
        weaponHardpoints: [
            { position: { x: 50.0, y: -30.0, z: -50.0 }, type: 'cannon' },  // Left wing (moved forward from 70 to 50)
            { position: { x: 50.0, y: -30.0, z: 50.0 }, type: 'cannon' },   // Right wing (moved forward from 70 to 50)
        ],
        
        // Engine positions - extended further out the rear (max X in native space)
        enginePositions: [
            // Main central engine cluster (extended further back)
            { position: { x: 118.0, y: -15.0, z: 0.0 }, scale: 2.5, type: 'main' },
            
            // Secondary engines on sides
            { position: { x: 118.0, y: -20.0, z: -35.0 }, scale: 2.0, type: 'secondary' },
            { position: { x: 118.0, y: -20.0, z: 35.0 }, scale: 2.0, type: 'secondary' },
            
            // Additional lower engines
            { position: { x: 115.0, y: -30.0, z: -25.0 }, scale: 1.5, type: 'secondary' },
            { position: { x: 115.0, y: -30.0, z: 25.0 }, scale: 1.5, type: 'secondary' },
            
            // Maneuvering thrusters - larger scale for visibility
            { position: { x: 50.0, y: 20.0, z: -30.0 }, scale: 0.5, type: 'maneuvering' },
            { position: { x: 50.0, y: 20.0, z: 30.0 }, scale: 0.5, type: 'maneuvering' },
            { position: { x: 50.0, y: -40.0, z: -30.0 }, scale: 0.5, type: 'maneuvering' },
            { position: { x: 50.0, y: -40.0, z: 30.0 }, scale: 0.5, type: 'maneuvering' },
            
            // Forward thrusters for braking
            { position: { x: -90.0, y: 0.0, z: -20.0 }, scale: 0.3, type: 'maneuvering' },
            { position: { x: -90.0, y: 0.0, z: 20.0 }, scale: 0.3, type: 'maneuvering' }
        ],
        
        // Visual effect scales - increased for visibility
        effects: {
            muzzleFlashScale: 1.5, // Increased from 0.5
            engineGlowScale: 1.0,
            shieldBubbleScale: 1.2,
            explosionScale: 1.0
        },
        
        // Camera configuration (adjusted for 20m ship)
        camera: {
            offsetMultiplierY: 1.5,
            offsetMultiplierZ: 2.2,
            lookAheadDistance: 200
        }
    },
    
    // Enemy Sky Predator - simple fighter (no rotation applied)
    'Sky_Predator': {
        modelPath: './textures/Sky_Predator_0522121524_texture.glb',
        nativeLength: 1.99, // Z-axis length for this model
        desiredLength: 8, // 8 meters in final scene scale
        centroidOffset: [0.28, 0.00, -0.01], // Actual centroid from geometry
        
        // Outer System Alliance - Junky frontier fighter
        faction: 'outer',
        description: 'Cobbled together from salvage. Held together by void-welded patches and prayer.',
        
        // Simple nose cannon - jury-rigged weapon
        weaponHardpoints: [
            { position: { x: 0.0, y: 0.0, z: -0.9 }, type: 'cannon' },
            { position: { x: 0.15, y: -0.1, z: -0.6 }, type: 'scrap_launcher' } // Improvised weapon
        ],
        
        // Mismatched engines - salvaged parts
        enginePositions: [
            { position: { x: 0.0, y: 0.0, z: 0.9 }, scale: 0.4, type: 'main' },
            { position: { x: -0.15, y: 0.05, z: 0.85 }, scale: 0.2, type: 'salvaged' }, // Mismatched thruster
            
            // Small maneuvering thrusters - some don't work properly
            { position: { x: 0.2, y: 0.1, z: 0.5 }, scale: 0.05, type: 'maneuvering' },
            { position: { x: -0.2, y: 0.1, z: 0.5 }, scale: 0.05, type: 'maneuvering' },
            { position: { x: 0.2, y: -0.1, z: 0.5 }, scale: 0.03, type: 'damaged' }, // Reduced output
            { position: { x: -0.2, y: -0.1, z: 0.5 }, scale: 0.05, type: 'maneuvering' }
        ],
        
        effects: {
            muzzleFlashScale: 0.6,
            engineGlowScale: 0.5,
            engineGlowColor: 0x2ED4D4, // Outer system cyan
            shieldBubbleScale: 0.8,
            explosionScale: 0.4
        },
        
        stats: {
            hull: 80, // Fragile
            shields: 120, // Weak shields
            speed: 220, // Fast but unstable
            agility: 1.2, // Surprisingly nimble
            firepower: 15, // Weak weapons
            cost: 5000 // Cheap junk
        }
    },
    
    // Heavy Fighter - Warhawk of Chaos
    'Warhawk_of_Chaos': {
        modelPath: './textures/Warhawk_of_Chaos_0522121857_texture.glb',
        nativeLength: 3.0, // Estimated, will need measurement
        desiredLength: 12, // 12 meters - heavier fighter
        centroidOffset: [0, 0, 0], // To be measured
        
        // Corporate Syndicate Elite Fighter - Grimdark aesthetic
        faction: 'corps',
        description: 'Corporate enforcement vessel. Over-engineered, intimidating, expensive.',
        
        // Twin heavy cannons and missile pods
        weaponHardpoints: [
            { position: { x: -0.4, y: 0.0, z: -1.2 }, type: 'heavy_cannon' },
            { position: { x: 0.4, y: 0.0, z: -1.2 }, type: 'heavy_cannon' },
            { position: { x: -0.8, y: -0.2, z: -0.5 }, type: 'missile' },
            { position: { x: 0.8, y: -0.2, z: -0.5 }, type: 'missile' }
        ],
        
        enginePositions: [
            { position: { x: 0, y: 0, z: 1.5 }, scale: 0.8, type: 'main' },
            { position: { x: -0.3, y: 0, z: 1.3 }, scale: 0.5, type: 'auxiliary' },
            { position: { x: 0.3, y: 0, z: 1.3 }, scale: 0.5, type: 'auxiliary' }
        ],
        
        effects: {
            muzzleFlashScale: 1.5,
            engineGlowScale: 1.3,
            engineGlowColor: 0xFFD700, // Gold corporate colors
            shieldBubbleScale: 1.2,
            explosionScale: 1.5
        },
        
        camera: {
            offsetMultiplierY: 3.0,
            offsetMultiplierZ: 4.0
        },
        
        stats: {
            maxSpeed: 20000,
            acceleration: 12000,
            turnRate: 1.2,
            hull: 800,
            shields: 600,
            fireRate: 0.8,
            damage: 150,
            cost: 250000 // Very expensive
        }
    },
    
    // Cruiser - Phalanx Skies
    'Phalanx_Skies': {
        modelPath: './textures/Phalanx_Skies_0522121429_texture.glb',
        nativeLength: 5.0, // Estimated
        desiredLength: 25, // 25 meters - cruiser size
        centroidOffset: [0, 0, 0], // To be measured
        
        // Martian Republic Heavy Cruiser
        faction: 'mars',
        description: 'Pride of the Red Fleet. Advanced terraforming tech repurposed for war.',
        
        // Multiple weapon hardpoints - Martian rail weapons
        weaponHardpoints: [
            { position: { x: -0.8, y: 0.0, z: -2.0 }, type: 'railgun' },
            { position: { x: 0.8, y: 0.0, z: -2.0 }, type: 'railgun' },
            { position: { x: -0.5, y: 0.3, z: -1.5 }, type: 'point_defense' },
            { position: { x: 0.5, y: 0.3, z: -1.5 }, type: 'point_defense' },
            { position: { x: 0.0, y: -0.3, z: -1.0 }, type: 'torpedo' }
        ],
        
        enginePositions: [
            // Main engines - Martian fusion drives
            { position: { x: -0.6, y: 0.0, z: 2.3 }, scale: 1.0, type: 'main' },
            { position: { x: 0.6, y: 0.0, z: 2.3 }, scale: 1.0, type: 'main' },
            { position: { x: 0.0, y: 0.0, z: 2.2 }, scale: 0.8, type: 'main' },
            
            // Maneuvering
            { position: { x: -1.2, y: 0.2, z: 1.5 }, scale: 0.3, type: 'maneuvering' },
            { position: { x: 1.2, y: 0.2, z: 1.5 }, scale: 0.3, type: 'maneuvering' },
            { position: { x: -1.2, y: -0.2, z: 1.5 }, scale: 0.3, type: 'maneuvering' },
            { position: { x: 1.2, y: -0.2, z: 1.5 }, scale: 0.3, type: 'maneuvering' }
        ],
        
        effects: {
            muzzleFlashScale: 1.8,
            engineGlowScale: 1.5,
            engineGlowColor: 0xD4542E, // Mars red
            shieldBubbleScale: 1.5,
            explosionScale: 2.0
        },
        
        camera: {
            offsetMultiplierY: 4.0,
            offsetMultiplierZ: 5.0
        },
        
        stats: {
            maxSpeed: 15000,
            acceleration: 8000,
            turnRate: 0.8,
            hull: 1500,
            shields: 1200,
            fireRate: 0.6,
            damage: 200,
            cost: 180000
        }
    },
    
    // Capital Ship - Solar Abyssal Leviathan
    'Solar_Abyssal_Leviath': {
        modelPath: './textures/Solar_Abyssal_Leviath_0522122241_texture.glb',
        nativeLength: 10.0, // Estimated
        desiredLength: 50, // 50 meters - battlecruiser
        centroidOffset: [0, 0, 0],
        
        // Heavy weapon batteries
        weaponHardpoints: [
            // Main batteries
            { position: { x: -0.5, y: 0.5, z: -3.0 }, type: 'heavy_turret' },
            { position: { x: 0.5, y: 0.5, z: -3.0 }, type: 'heavy_turret' },
            // Secondary batteries
            { position: { x: -1.5, y: 0.0, z: -2.0 }, type: 'turret' },
            { position: { x: 1.5, y: 0.0, z: -2.0 }, type: 'turret' },
            { position: { x: -1.5, y: 0.0, z: 0.0 }, type: 'turret' },
            { position: { x: 1.5, y: 0.0, z: 0.0 }, type: 'turret' },
            // Point defense grid
            { position: { x: -1.0, y: 0.3, z: 1.0 }, type: 'point_defense' },
            { position: { x: 1.0, y: 0.3, z: 1.0 }, type: 'point_defense' },
            { position: { x: 0.0, y: -0.3, z: 1.5 }, type: 'point_defense' }
        ],
        
        enginePositions: [
            // Quad main engines
            { position: { x: -1.0, y: 0.3, z: 4.5 }, scale: 1.0, type: 'main' },
            { position: { x: 1.0, y: 0.3, z: 4.5 }, scale: 1.0, type: 'main' },
            { position: { x: -1.0, y: -0.3, z: 4.5 }, scale: 1.0, type: 'main' },
            { position: { x: 1.0, y: -0.3, z: 4.5 }, scale: 1.0, type: 'main' },
            // Maneuvering thrusters
            { position: { x: -2.0, y: 0.0, z: 0.0 }, scale: 0.3, type: 'maneuvering' },
            { position: { x: 2.0, y: 0.0, z: 0.0 }, scale: 0.3, type: 'maneuvering' },
            { position: { x: 0.0, y: 1.0, z: -2.0 }, scale: 0.3, type: 'maneuvering' },
            { position: { x: 0.0, y: -1.0, z: -2.0 }, scale: 0.3, type: 'maneuvering' }
        ],
        
        effects: {
            muzzleFlashScale: 1.0,
            engineGlowScale: 1.2,
            shieldBubbleScale: 1.5,
            explosionScale: 1.5
        },
        
        stats: {
            hull: 1200,
            shields: 2000,
            speed: 80,
            agility: 0.3,
            firepower: 100
        }
    },
    
    // Space Station - Orbital Construction
    'Orbital_Construction': {
        modelPath: './textures/Orbital_Construction__0522122617_texture.glb',
        nativeLength: 20.0, // Estimated - stations are larger
        desiredLength: 100, // 100 meters - orbital facility
        centroidOffset: [0, 0, 0],
        
        // Defense turrets around the station
        weaponHardpoints: [
            // Upper defense ring
            { position: { x: 0.0, y: 5.0, z: -5.0 }, type: 'heavy_turret' },
            { position: { x: -5.0, y: 5.0, z: 0.0 }, type: 'heavy_turret' },
            { position: { x: 0.0, y: 5.0, z: 5.0 }, type: 'heavy_turret' },
            { position: { x: 5.0, y: 5.0, z: 0.0 }, type: 'heavy_turret' },
            // Lower defense ring
            { position: { x: 0.0, y: -5.0, z: -5.0 }, type: 'heavy_turret' },
            { position: { x: -5.0, y: -5.0, z: 0.0 }, type: 'heavy_turret' },
            { position: { x: 0.0, y: -5.0, z: 5.0 }, type: 'heavy_turret' },
            { position: { x: 5.0, y: -5.0, z: 0.0 }, type: 'heavy_turret' },
            // Point defense network
            { position: { x: -3.0, y: 0.0, z: -3.0 }, type: 'point_defense' },
            { position: { x: 3.0, y: 0.0, z: -3.0 }, type: 'point_defense' },
            { position: { x: -3.0, y: 0.0, z: 3.0 }, type: 'point_defense' },
            { position: { x: 3.0, y: 0.0, z: 3.0 }, type: 'point_defense' }
        ],
        
        // Stations have minimal engines - just for orientation
        enginePositions: [
            { position: { x: -5.0, y: 0.0, z: 5.0 }, scale: 0.4, type: 'maneuvering' },
            { position: { x: 5.0, y: 0.0, z: 5.0 }, scale: 0.4, type: 'maneuvering' },
            { position: { x: 0.0, y: 5.0, z: 5.0 }, scale: 0.4, type: 'maneuvering' },
            { position: { x: 0.0, y: -5.0, z: 5.0 }, scale: 0.4, type: 'maneuvering' }
        ],
        
        effects: {
            muzzleFlashScale: 1.2,
            engineGlowScale: 0.6,
            shieldBubbleScale: 2.0,
            explosionScale: 2.0
        },
        
        stats: {
            hull: 5000,
            shields: 3000,
            speed: 0, // Stations don't move
            agility: 0.1, // Very slow rotation only
            firepower: 150,
            isStation: true
        }
    },
    
    // Generic fallback configuration
    'default': {
        nativeLength: 20,
        desiredLength: 8,
        centroidOffset: [0, 0, 0],
        
        weaponHardpoints: [
            { position: { x: 2, y: 0, z: -8 }, type: 'cannon' },
            { position: { x: -2, y: 0, z: -8 }, type: 'cannon' }
        ],
        
        enginePositions: [
            { position: { x: 0, y: 0, z: 8 }, scale: 0.8, type: 'main' },
            { position: { x: 1, y: 1, z: 6 }, scale: 0.2, type: 'maneuvering' },
            { position: { x: -1, y: 1, z: 6 }, scale: 0.2, type: 'maneuvering' },
            { position: { x: 1, y: -1, z: 6 }, scale: 0.2, type: 'maneuvering' },
            { position: { x: -1, y: -1, z: 6 }, scale: 0.2, type: 'maneuvering' }
        ],
        
        effects: {
            muzzleFlashScale: 0.4,
            engineGlowScale: 0.6,
            shieldBubbleScale: 0.8,
            explosionScale: 0.4
        }
    },
    
    // Bio-Horror - Solar Abyssal Leviathan
    'Solar_Abyssal_Leviathan': {
        modelPath: './textures/Solar_Abyssal_Leviath_0522122241_texture.glb',
        nativeLength: 8.0, // Estimated - large creature
        desiredLength: 40, // 40 meters - massive bio-ship
        centroidOffset: [0, 0, 0], // To be measured
        
        // Unknown Origin - Void-spawned abomination
        faction: 'unknown',
        description: 'They came from the dark between stars. Organic. Hungry. Wrong.',
        isBiological: true,
        
        // Biological weapon systems
        weaponHardpoints: [
            { position: { x: 0.0, y: 0.0, z: -3.0 }, type: 'plasma_spitter' },
            { position: { x: -1.5, y: 0.5, z: -2.0 }, type: 'acid_launcher' },
            { position: { x: 1.5, y: 0.5, z: -2.0 }, type: 'acid_launcher' },
            { position: { x: -1.0, y: -0.5, z: -1.0 }, type: 'tentacle' },
            { position: { x: 1.0, y: -0.5, z: -1.0 }, type: 'tentacle' }
        ],
        
        enginePositions: [
            // Bio-propulsion vents
            { position: { x: 0.0, y: 0.0, z: 3.5 }, scale: 1.5, type: 'bio_vent' },
            { position: { x: -0.8, y: 0.3, z: 3.2 }, scale: 0.8, type: 'bio_vent' },
            { position: { x: 0.8, y: 0.3, z: 3.2 }, scale: 0.8, type: 'bio_vent' },
            { position: { x: -0.5, y: -0.5, z: 3.0 }, scale: 0.6, type: 'bio_vent' },
            { position: { x: 0.5, y: -0.5, z: 3.0 }, scale: 0.6, type: 'bio_vent' }
        ],
        
        effects: {
            muzzleFlashScale: 2.0,
            muzzleFlashColor: 0x9933FF, // Purple bio-plasma
            engineGlowScale: 2.0,
            engineGlowColor: 0x6600CC, // Deep purple bio-luminescence
            shieldBubbleScale: 2.0,
            shieldBubbleColor: 0x9933FF, // Organic shielding
            explosionScale: 3.0,
            deathEffect: 'bio_explosion' // Special death animation
        },
        
        camera: {
            offsetMultiplierY: 5.0,
            offsetMultiplierZ: 6.0
        },
        
        stats: {
            maxSpeed: 12000,
            acceleration: 6000,
            turnRate: 0.6,
            hull: 2500,
            shields: 500, // Organic armor, weak to energy shields
            regeneration: 10, // Self-healing per second
            fireRate: 1.2,
            damage: 300,
            aggression: 'extreme' // AI behavior
        }
    }
};

// Helper function to get configuration for a ship
export function getShipConfig(modelName) {
    // Extract model name from path if needed
    const name = modelName.includes('/') ? 
        modelName.split('/').pop().replace('.glb', '').replace('_texture', '') : 
        modelName;
    
    return ShipConfigurations[name] || ShipConfigurations.default;
}

// Helper function to calculate model scale factor
export function calculateModelScale(config, actualNativeLength = null) {
    const nativeLength = actualNativeLength || config.nativeLength;
    const scale = config.desiredLength / nativeLength;
    return scale;
}

// Helper function to scale positions based on model scale
export function scaleHardpointPosition(position, modelScale) {
    // Convert native model coordinates to scene coordinates
    return {
        x: position.x * modelScale,
        y: position.y * modelScale,
        z: position.z * modelScale
    };
}