// Solar System Factions - Year 2356
// A unique universe inspired by realistic space colonization challenges

export const Factions = {
    // Terran Alliance (Earth & Luna)
    TERRA: {
        id: 'terra',
        name: 'Terran Alliance',
        shortName: 'Terra',
        capital: 'Geneva Arcology, Earth',
        color: '#2E7DD4',
        description: 'The birthworld government, struggling with overpopulation and environmental recovery. Controls Earth\'s orbital infrastructure and Luna\'s Helium-3 mines.',
        territories: ['Earth', 'Luna', 'L1 Station', 'L4 Colony', 'L5 Haven'],
        population: '11.2 billion',
        economy: 'Service-based, cultural exports, financial centers',
        relations: {
            mars: -0.4,  // Economic rivalry
            jovian: 0.2,  // Trade partners
            belt: -0.5,   // Resource disputes
            outer: 0.0,   // Neutral but wary
            corps: 0.6    // Corporate headquarters
        },
        militaryDoctrine: 'Fortress Terra - defensive orbital platforms',
        specialUnits: ['Orbital Guard', 'Luna Marines'],
        culturalTraits: ['Traditionalist', 'Bureaucratic', 'Preservationist']
    },
    
    // Martian Republic
    MARS: {
        id: 'mars',
        name: 'Republic of Mars',
        shortName: 'Mars',
        capital: 'Olympus City',
        color: '#D4542E',
        description: 'The first true interplanetary nation. Fiercely independent terraformers pushing the boundaries of human adaptation.',
        territories: ['Mars', 'Phobos Station', 'Deimos Shipyards', 'Asteroid 433 Eros'],
        population: '2.4 billion',
        economy: 'Heavy industry, terraforming tech, advanced manufacturing',
        relations: {
            terra: -0.4,   // Independence tensions
            jovian: 0.4,   // Tech exchange
            belt: 0.6,     // Resource partners
            outer: 0.3,    // Expansion allies
            corps: -0.2    // Regulatory conflicts
        },
        militaryDoctrine: 'Red Fleet - fast attack corvettes and stealth tech',
        specialUnits: ['Dust Devils', 'Olympus Rangers'],
        culturalTraits: ['Pioneer Spirit', 'Scientific', 'Libertarian']
    },
    
    // Jovian Confederation
    JOVIAN: {
        id: 'jovian',
        name: 'Jovian Confederation',
        shortName: 'Jove',
        capital: 'Europa Deep',
        color: '#8B4DD4',
        description: 'Wealthy moon colonies around Jupiter. Controls fusion fuel supplies and cutting-edge biotech research.',
        territories: ['Io Mining', 'Europa', 'Ganymede', 'Callisto', 'Minor Jovian Moons'],
        population: '890 million',
        economy: 'Fusion fuel monopoly, biotech, quantum computing',
        relations: {
            terra: 0.2,    // Fuel supplier
            mars: 0.4,     // Tech partners
            belt: -0.3,    // Competition for resources
            outer: 0.5,    // Outer system allies
            corps: 0.8     // Heavy corporate presence
        },
        militaryDoctrine: 'Magnetic shields and plasma weaponry',
        specialUnits: ['Europa Submarines', 'Io Thermal Corps'],
        culturalTraits: ['Technocratic', 'Isolationist', 'Innovative']
    },
    
    // Belt Coalition
    BELT: {
        id: 'belt',
        name: 'Belt Mining Coalition',
        shortName: 'Belt',
        capital: 'Ceres Station',
        color: '#D4A12E',
        description: 'Loose confederation of mining habitats and processing stations. The industrial backbone of the solar system.',
        territories: ['Ceres', 'Vesta', 'Pallas', 'Hundreds of mining claims'],
        population: '340 million',
        economy: 'Raw materials extraction, water ice, rare minerals',
        relations: {
            terra: -0.5,   // Exploitation history
            mars: 0.6,     // Primary customers
            jovian: -0.3,  // Resource competition
            outer: 0.4,    // Frontier solidarity
            corps: -0.7    // Labor disputes
        },
        militaryDoctrine: 'Guerrilla tactics, mass driver weaponry',
        specialUnits: ['Rock Hoppers', 'Vacuum Welders Union'],
        culturalTraits: ['Independent', 'Resourceful', 'Clan-based']
    },
    
    // Outer System Alliance
    OUTER: {
        id: 'outer',
        name: 'Outer System Alliance',
        shortName: 'OSA',
        capital: 'Titan Dome Alpha',
        color: '#2ED4D4',
        description: 'The frontier colonies beyond Jupiter. Pushing human limits with radical augmentation and social experiments.',
        territories: ['Titan', 'Enceladus', 'Triton', 'Kuiper Stations'],
        population: '125 million',
        economy: 'Exotic research, antimatter production, deep space infrastructure',
        relations: {
            terra: 0.0,    // Too distant to care
            mars: 0.3,     // Ideological alignment
            jovian: 0.5,   // Regional cooperation
            belt: 0.4,     // Resource trade
            corps: -0.4    // Suspicious of control
        },
        militaryDoctrine: 'Extreme range warfare, AI drone swarms',
        specialUnits: ['Void Walkers', 'Titan Atmospheric Corps'],
        culturalTraits: ['Transhumanist', 'Experimental', 'Frontier Ethics']
    },
    
    // MegaCorp Syndicate
    CORPS: {
        id: 'corps',
        name: 'Corporate Syndicate',
        shortName: 'CorpSyn',
        capital: 'Orbital Hub Prime (L1)',
        color: '#FFD700',
        description: 'The mega-corporations that truly run the solar system. Profit above politics.',
        territories: ['Corporate Stations', 'Private Habitats', 'Industrial Complexes'],
        population: '50 million employees',
        economy: 'Everything - they own shares in all sectors',
        relations: {
            terra: 0.6,    // Government contracts
            mars: -0.2,    // Regulatory friction
            jovian: 0.8,   // Business paradise
            belt: -0.7,    // Labor exploitation
            outer: -0.4    // Hard to control
        },
        militaryDoctrine: 'Private military contractors, economic warfare',
        specialUnits: ['Corporate Security', 'Asset Recovery Teams'],
        culturalTraits: ['Profit-Driven', 'Efficient', 'Amoral']
    }
};

// Dynamic events that shape the political landscape
export const FactionEvents = {
    WATER_WARS: {
        name: 'The Water Wars',
        description: 'Conflict over ice mining rights in the asteroid belt',
        affectedFactions: ['terra', 'mars', 'belt'],
        impact: { terraToMars: -0.2, marsToBelt: 0.3, beltToTerra: -0.4 }
    },
    TITAN_INCIDENT: {
        name: 'Titan Bio-Breach',
        description: 'Experimental organisms escape containment on Titan',
        affectedFactions: ['outer', 'jovian', 'terra'],
        impact: { outerReputation: -0.3, fearOfOuter: 0.5 }
    },
    FUSION_BREAKTHROUGH: {
        name: 'Compact Fusion Revolution',
        description: 'Mars develops ultra-efficient fusion drives',
        affectedFactions: ['mars', 'jovian', 'corps'],
        impact: { marsToJovian: -0.3, marsPower: 0.4 }
    }
};

// Player reputation system
export class FactionReputation {
    constructor() {
        this.standings = {
            terra: 0,
            mars: 0,
            jovian: 0,
            belt: 0,
            outer: 0,
            corps: 0
        };
        
        this.ranks = [
            { min: -100, name: 'Enemy of the State', perks: [] },
            { min: -50, name: 'Hostile', perks: [] },
            { min: -20, name: 'Unfriendly', perks: [] },
            { min: 0, name: 'Neutral', perks: ['docking'] },
            { min: 20, name: 'Friendly', perks: ['docking', 'trading'] },
            { min: 50, name: 'Allied', perks: ['docking', 'trading', 'missions'] },
            { min: 80, name: 'Honored', perks: ['docking', 'trading', 'missions', 'shipyard'] },
            { min: 100, name: 'Hero', perks: ['docking', 'trading', 'missions', 'shipyard', 'classified'] }
        ];
    }
    
    modifyReputation(factionId, amount) {
        // Direct reputation change
        this.standings[factionId] = Math.max(-100, Math.min(100, this.standings[factionId] + amount));
        
        // Ripple effects based on faction relations
        const faction = Factions[factionId.toUpperCase()];
        if (faction && faction.relations) {
            Object.keys(faction.relations).forEach(otherId => {
                const relationModifier = faction.relations[otherId];
                const rippleEffect = amount * relationModifier * 0.25; // 25% of main change
                if (rippleEffect !== 0) {
                    this.standings[otherId] = Math.max(-100, Math.min(100, this.standings[otherId] + rippleEffect));
                }
            });
        }
    }
    
    getRank(factionId) {
        const standing = this.standings[factionId];
        for (let i = this.ranks.length - 1; i >= 0; i--) {
            if (standing >= this.ranks[i].min) {
                return this.ranks[i];
            }
        }
        return this.ranks[0];
    }
    
    canDockAt(stationFactionId) {
        const rank = this.getRank(stationFactionId);
        return rank.perks.includes('docking');
    }
} 