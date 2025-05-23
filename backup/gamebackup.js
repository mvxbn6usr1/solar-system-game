import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from './js/GLTFLoader.js';

// Legacy panel placeholders removed from UI but referenced in some legacy handlers
let starshipNavPanel = null;
let starshipSystemsPanel = null;
// Remove legacy telemetry div creation (if exists later in code)

// Scene setup
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000000);
camera.position.set(0, 800, 2000);

// Renderer setup with optimized settings for better lighting
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true; 
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3; // Higher exposure for better visibility of distant objects
renderer.outputEncoding = THREE.sRGBEncoding; // Ensures colors appear correct
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Increased for better base illumination
scene.add(ambientLight);

// Main sun directional light
const sunLight = new THREE.DirectionalLight(0xffffff, 8);
sunLight.position.set(0, 0, 0);
sunLight.distance = 0;
scene.add(sunLight);

// Strong point light at the Sun's position to better illuminate all planets
const sunPointLight = new THREE.PointLight(0xffffff, 5, 0, 0.5); // No distance attenuation
sunPointLight.position.set(0, 0, 0);
scene.add(sunPointLight);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.1; // Allow much closer zoom for small bodies
controls.maxDistance = 1000000;

// Track relative camera position to focused planet
let cameraRelativePosition = new THREE.Vector3();
let lastPlanetPosition = new THREE.Vector3();

// UI visibility settings
const uiSettings = {
    showOrbitLines: true,
    showLabels: true,
    showTelemetry: false,
    realisticRotation: true // Enable astronomically accurate axial rotation
};

// --- Simulation settings ---
const simSettings = {
    // Define preset time scales as an array of {label, daysPerSecond} objects
    timePresets: [
        { label: "Realtime: 1 day = 24h", daysPerSecond: 1/86400 },
        { label: "1 day = 1 hour", daysPerSecond: 1/3600 },
        { label: "1 day = 10 min", daysPerSecond: 1/600 },
        { label: "1 day = 1 min", daysPerSecond: 1/60 },
        { label: "1 day = 10 sec", daysPerSecond: 1/10 },
        { label: "1 day = 1 sec", daysPerSecond: 1 },
        { label: "1 week = 1 sec", daysPerSecond: 7 },
        { label: "1 month = 1 sec", daysPerSecond: 30 },
        { label: "1 year = 10 sec", daysPerSecond: 365.25/10 }
    ],
    currentPresetIndex: 0,
    get timeScale() {
        return this.timePresets[this.currentPresetIndex].daysPerSecond / REALTIME_DAYS_PER_SECOND;
    }
};

// For realtime, 1 day = 24*60*60 = 86400 seconds. So, 1/86400 days per second.
const REALTIME_DAYS_PER_SECOND = 1/86400;
const simulationSpeedFactor = REALTIME_DAYS_PER_SECOND; // Realtime by default

let simulationDaysElapsed = 0;
let simulationStartTimestamp = Date.now();
let lastFocusChangeTimestamp = Date.now();

// --- Real-world orbital drift constants ---
const MOON_RECESSION_KM_PER_YEAR = 0.000038; // 3.8 cm/year in km
const MOON_ORBITAL_PERIOD_INCREASE_PER_YEAR = 0.0000000002; // ~2.3 ms/year (fractional)
const MERCURY_PRECESSION_DEG_PER_CENTURY = 0.01194; // 43 arcsec/century

// Label container for all celestial body labels
const labelsContainer = new THREE.Object3D();
labelsContainer.name = "labelsContainer";
scene.add(labelsContainer);

// Texture loader
const textureLoader = new THREE.TextureLoader();
// Add a clock for more stable animation timing
const clock = new THREE.Clock();

// Astronomical Unit in kilometers
const AU = 149.6e6; // km

// Scale factors for visualization
const DISTANCE_SCALE = 1 / 2e5; // Scales AU down: 1 AU = 1 / 2e5 scene units (approx 750 scene units)
const RADIUS_SCALE = 1 / 1000;  // Scales km down: 1000 km = 1 scene unit
const MOON_DISTANCE_SCALE = 1 / 5e3; // Special scale for moons to ensure they orbit outside their planets
const DAY = 24 * 60 * 60; // Number of seconds in a day

// Saturn rings rotation rate - one Keplerian day at middle of rings
const SATURN_RINGS_ROTATION_PERIOD = 0.45; // In Earth days, based on Keplerian rotation at ~100,000 km

// Texture map for available textures (highest quality preferred)
const TEXTURES = {
    Sun: ["../textures/8k_sun.jpg", "../textures/2k_sun.jpg"],
    Mercury: ["../textures/2k_mercury.jpg"],
    Venus: ["../textures/8k_venus_surface.jpg", "../textures/2k_venus_surface.jpg"],
    VenusAtmosphere: ["../textures/4k_venus_atmosphere.jpg", "../textures/2k_venus_atmosphere.jpg"],
    EarthDay: ["../textures/8k_earth_daymap.jpg", "../textures/2k_earth_daymap.jpg"],
    EarthNight: ["../textures/8k_earth_nightmap.jpg", "../textures/2k_earth_nightmap.jpg"],
    EarthClouds: ["../textures/8k_earth_clouds.jpg", "../textures/2k_earth_clouds.jpg"],
    Moon: ["../textures/2k_moon.jpg"],
    Mars: ["../textures/8k_mars.jpg", "../textures/2k_mars.jpg"],
    Jupiter: ["../textures/8k_jupiter.jpg", "../textures/2k_jupiter.jpg"],
    Saturn: ["../textures/8k_saturn.jpg", "../textures/2k_saturn.jpg"],
    SaturnRings: ["../textures/8k_saturn_ring_alpha.png", "../textures/2k_saturn_ring_alpha.png"],
    // Ensure Uranus texture uses a standard texture format
    Uranus: ["../textures/2k_uranus.jpg", "../textures/uranus.jpg"], 
    Neptune: ["../textures/2k_neptune.jpg"],
    // Mars moon textures - more accurate than generic
    Phobos: ["../textures/Phobos.png"], // Use provided Phobos.png
    Deimos: ["../textures/Deimos.jpg"], // Use provided Deimos.jpg
    PhobosTopography: ["../textures/PhobosTopography.png"],
    DeimosTopography: ["../textures/DeimosTopography.jpg"],
    // Jupiter moon textures - higher quality
    Io: ["../textures/Io.png"],
    Europa: ["../textures/Europa.png"],
    Ganymede: ["../textures/ganymede.jpg"],
    Callisto: ["../textures/Callisto.png"],
    // Dwarf planets (fictional)
    Pluto: ["../textures/pluto.jpg"],
    Eris: ["../textures/4k_eris_fictional.jpg", "../textures/2k_eris_fictional.jpg"],
    Makemake: ["../textures/4k_makemake_fictional.jpg", "../textures/2k_makemake_fictional.jpg"],
    Haumea: ["../textures/4k_haumea_fictional.jpg", "../textures/2k_haumea_fictional.jpg"],
    Ceres: ["../textures/4k_ceres_fictional.jpg", "../textures/2k_ceres_fictional.jpg"],
    // Generic moon texture fallback
    GenericMoon: ["../textures/2k_moon.jpg"]
};

// Helper to get the first available texture from a list
function getTexture(paths) {
    // Check if paths exists and has length
    if (paths && paths.length > 0) {
        return paths[0]; // Return the first path
    }
    console.warn("No texture paths provided!");
    return "../textures/2k_moon.jpg"; // Fallback texture
}

// Only include objects with available textures
let solarSystemPlanetsAndSunData = [
    {
        name: "Sun",
        radius: 695700,
        textureUrl: getTexture(TEXTURES.Sun),
        rotationPeriod: 25.05,
        axialTilt: 7.25,
        isStar: true
    },
    {
        name: "Mercury",
        radius: 2439.7,
        textureUrl: getTexture(TEXTURES.Mercury),
        orbitalProperties: {
            semiMajorAxis: 0.387098 * AU,
            eccentricity: 0.205630,
            inclination: 7.005,
            longitudeOfAscendingNode: 48.331,
            argumentOfPerihelion: 29.124,
            period: 87.969,
        },
        rotationPeriod: 58.646,
        axialTilt: 0.01,
        isStar: false
    },
    {
        name: "Venus",
        radius: 6051.8,
        textureUrl: getTexture(TEXTURES.Venus),
        orbitalProperties: {
            semiMajorAxis: 0.723332 * AU,
            eccentricity: 0.006772,
            inclination: 3.394,
            longitudeOfAscendingNode: 76.680,
            argumentOfPerihelion: 54.884,
            period: 224.698,
        },
        rotationPeriod: -243.025, // Retrograde rotation
        axialTilt: 177.36, // Almost retrograde
        isStar: false
    },
    {
        name: "Earth",
        radius: 6371,
        textureUrl: getTexture(TEXTURES.EarthDay),
        orbitalProperties: {
            semiMajorAxis: 1.0 * AU, // 1 AU
            eccentricity: 0.0167086,
            inclination: 0.00005, // Reference plane
            longitudeOfAscendingNode: -11.26064,
            argumentOfPerihelion: 114.20783,
            period: 365.256, // Earth days
        },
        rotationPeriod: 0.99726968, // Approximately 24 hours
        axialTilt: 23.44, // ~23.5°
        isStar: false
    },
    {
        name: "Mars",
        radius: 3389.5,
        textureUrl: getTexture(TEXTURES.Mars),
        orbitalProperties: {
            semiMajorAxis: 1.523679 * AU,
            eccentricity: 0.0934,
            inclination: 1.850,
            longitudeOfAscendingNode: 49.558,
            argumentOfPerihelion: 286.502,
            period: 686.98,
        },
        rotationPeriod: 1.025957, // Just over an Earth day
        axialTilt: 25.19,
        isStar: false
    },
    {
        name: "Jupiter",
        radius: 69911,
        textureUrl: getTexture(TEXTURES.Jupiter),
        orbitalProperties: {
            semiMajorAxis: 5.2044 * AU,
            eccentricity: 0.0489,
            inclination: 1.303,
            longitudeOfAscendingNode: 100.464,
            argumentOfPerihelion: 273.867,
            period: 4332.59,
        },
        rotationPeriod: 0.41354, // About 9.9 hours
        axialTilt: 3.13,
        isStar: false
    },
    {
        name: "Saturn",
        radius: 58232,
        textureUrl: getTexture(TEXTURES.Saturn),
        orbitalProperties: {
            semiMajorAxis: 9.5826 * AU,
            eccentricity: 0.0565,
            inclination: 2.485,
            longitudeOfAscendingNode: 113.665,
            argumentOfPerihelion: 339.392,
            period: 10759.22,
        },
        rotationPeriod: 0.444, // About 10.7 hours
        axialTilt: 26.73,
        isStar: false
    },
    {
        name: "Uranus",
        radius: 25362,
        textureUrl: getTexture(TEXTURES.Uranus),
        orbitalProperties: {
            semiMajorAxis: 19.19126 * AU,
            eccentricity: 0.046381,
            inclination: 0.770,
            longitudeOfAscendingNode: 74.006,
            argumentOfPerihelion: 96.998857,
            period: 30688.5,
        },
        rotationPeriod: -0.71833,
        axialTilt: 97.77,
        isStar: false
    },
    {
        name: "Neptune",
        radius: 24622,
        textureUrl: getTexture(TEXTURES.Neptune),
        orbitalProperties: {
            semiMajorAxis: 30.11 * AU,
            eccentricity: 0.008997,
            inclination: 1.770,
            longitudeOfAscendingNode: 131.783,
            argumentOfPerihelion: 276.336,
            period: 60182,
        },
        rotationPeriod: 0.6713,
        axialTilt: 28.32,
        isStar: false
    },
    {
        name: "Pluto",
        radius: 1188.3, // Radius in km
        textureUrl: getTexture(TEXTURES.Pluto),
        orbitalProperties: {
            semiMajorAxis: 39.482 * AU, // Semi-major axis in km (39.482 AU)
            eccentricity: 0.2488, // Highly eccentric orbit
            inclination: 17.16, // Orbital inclination in degrees
            longitudeOfAscendingNode: 110.299, // In degrees
            argumentOfPerihelion: 113.834, // In degrees 
            period: 90560, // Orbital period in Earth days (248 years)
        },
        rotationPeriod: 6.387, // Rotation period in Earth days (retrograde)
        axialTilt: 122.53, // Severe axial tilt
        isStar: false
    }
    // Dwarf planets can be added here if desired
];

const allMoonsData = [ // Renamed to avoid conflict
    {
        name: "Moon",
        orbitsAround: "Earth",
        radius: 1737.4, // km
        textureUrl: getTexture(TEXTURES.Moon),
        orbitalProperties: {
            semiMajorAxis: 384399, // km (relative to Earth)
            eccentricity: 0.0549,
            inclination: 5.145, // degrees (to Earth's orbit around Sun)
            longitudeOfAscendingNode: 125.08, // degrees (approx, rapidly precessing) - relative to ecliptic
            argumentOfPerihelion: 318.15, // degrees (approx, rapidly precessing) - relative to ecliptic
            period: 27.321661, // Earth days (sidereal orbit period)
        },
        rotationPeriod: 27.321661, // Earth days (synchronous rotation)
        axialTilt: 6.68, // degrees (to its own orbital plane around Earth)
        isStar: false,
        isMoon: true // Flag to identify moons for special distance scaling
    },
    {
        name: "Phobos",
        orbitsAround: "Mars",
        radius: 11.2667, // km (mean radius)
        textureUrl: getTexture(TEXTURES.Phobos), // Using dedicated Phobos texture
        orbitalProperties: {
            semiMajorAxis: 9376, // km (from Mars center)
            eccentricity: 0.0151,
            inclination: 1.075, // degrees (to Mars' equator)
            longitudeOfAscendingNode: 47, // degrees (approx relative to Mars orbit)
            argumentOfPerihelion: 240, // degrees (approx relative to Mars orbit)
            period: 0.31891023, // Earth days
        },
        rotationPeriod: 0.31891023, // Synchronous
        axialTilt: 0, 
        isStar: false,
        isMoon: true,
        description: "Phobos is the larger and inner of Mars' two moons and is gradually spiraling inward due to tidal forces. It's heavily cratered with its most prominent feature being the Stickney crater."
    },
    {
        name: "Deimos",
        orbitsAround: "Mars",
        radius: 6.2, // km (mean radius)
        textureUrl: getTexture(TEXTURES.Deimos), // Using dedicated Deimos texture
        orbitalProperties: {
            semiMajorAxis: 23463.2, // km (from Mars center)
            eccentricity: 0.00033,
            inclination: 0.93, // degrees (to Mars' equator)
            longitudeOfAscendingNode: 70, // approx
            argumentOfPerihelion: 280, // approx
            period: 1.26244, // Earth days
        },
        rotationPeriod: 1.26244, // Synchronous
        axialTilt: 0,
        isStar: false,
        isMoon: true,
        description: "Deimos is the smaller and outer of Mars' two moons with a smooth surface covered by fine-grained regolith. Its surface has fewer craters compared to Phobos, but shows evidence of impact reshaping."
    },
    {
        name: "Io",
        orbitsAround: "Jupiter",
        radius: 1821.6, // km
        textureUrl: getTexture(TEXTURES.Io), // Using dedicated Io texture
        orbitalProperties: {
            semiMajorAxis: 421700, // km
            eccentricity: 0.0041,
            inclination: 0.050, // degrees (to Jupiter's equator)
            longitudeOfAscendingNode: 43.977, 
            argumentOfPerihelion: 84.129,  
            period: 1.769137786, // Earth days
        },
        rotationPeriod: 1.769137786, // Synchronous
        axialTilt: 0, 
        isStar: false,
        isMoon: true,
        description: "Io is the most volcanically active body in the solar system, with hundreds of continuously erupting volcanoes. Its surface is covered with sulfur compounds giving it its distinctive yellow-orange-red appearance."
    },
    {
        name: "Europa",
        orbitsAround: "Jupiter",
        radius: 1560.8, // km
        textureUrl: getTexture(TEXTURES.Europa), // Using dedicated Europa texture
        orbitalProperties: {
            semiMajorAxis: 671034, // km
            eccentricity: 0.0094,
            inclination: 0.471, // degrees (to Jupiter's equator)
            longitudeOfAscendingNode: 219.106, 
            argumentOfPerihelion: 88.970,   
            period: 3.551181, // Earth days
        },
        rotationPeriod: 3.551181, // Synchronous
        axialTilt: 0.1, // degrees
        isStar: false,
        isMoon: true,
        description: "Europa has a smooth icy surface crisscrossed with cracks and ridges. It has a subsurface ocean beneath its icy crust, making it one of the solar system's best candidates for potentially harboring life."
    },
    {
        name: "Ganymede",
        orbitsAround: "Jupiter",
        radius: 2634.1, // km
        textureUrl: getTexture(TEXTURES.Ganymede), // Using dedicated Ganymede texture
        orbitalProperties: {
            semiMajorAxis: 1070412, // km
            eccentricity: 0.0013,
            inclination: 0.204, // degrees (to Jupiter's equator)
            longitudeOfAscendingNode: 63.552, 
            argumentOfPerihelion: 192.417,   
            period: 7.15455296, // Earth days
        },
        rotationPeriod: 7.15455296, // Synchronous
        axialTilt: 0.33, // degrees
        isStar: false,
        isMoon: true,
        description: "Ganymede is the largest moon in the solar system, even larger than Mercury. It's the only moon with its own magnetic field and features a complex surface with dark, heavily cratered regions and lighter grooved terrain."
    },
    {
        name: "Callisto",
        orbitsAround: "Jupiter",
        radius: 2410.3, // km
        textureUrl: getTexture(TEXTURES.Callisto), // Using dedicated Callisto texture
        orbitalProperties: {
            semiMajorAxis: 1882709, // km
            eccentricity: 0.0074,
            inclination: 0.192, // degrees (to Jupiter's equator)
            longitudeOfAscendingNode: 298.848, 
            argumentOfPerihelion: 52.643,   
            period: 16.6890184, // Earth days
        },
        rotationPeriod: 16.6890184, // Synchronous
        axialTilt: 0, 
        isStar: false,
        isMoon: true,
        description: "Callisto has the most heavily cratered surface in the solar system, showing no signs of recent geological activity. Despite its appearance, it may have a subsurface ocean and is relatively non-threatening radiation environment compared to other Jovian moons."
    }
];

// This will hold the final, ordered list of all celestial bodies
const solarSystemData = []; 

// Combine planets and moons into solarSystemData, inserting moons after their parent
// Start with planets and the Sun
solarSystemPlanetsAndSunData.forEach(planetOrSun => {
    solarSystemData.push(planetOrSun);
    // Find and insert moons for this planet/sun
    allMoonsData.forEach(moon => {
        if (moon.orbitsAround === planetOrSun.name) {
            solarSystemData.push(moon);
        }
    });
});


const celestialObjects = []; // To store created Three.js objects and their data

/**
 * Solves Kepler's equation M = E - e * sin(E) for E (Eccentric Anomaly).
 * Uses Newton's method.
 * @param {number} M - Mean Anomaly (radians).
 * @param {number} e - Eccentricity.
 * @param {number} [maxIter=100] - Maximum iterations.
 * @param {number} [tolerance=1e-7] - Desired precision for E.
 * @returns {number} Eccentric Anomaly E (radians).
 */
function solveKeplerEquation(M, e, maxIter = 100, tolerance = 1e-7) {
    let E = M; 
    if (e > 0.8) { 
        E = M + e * Math.sin(M) / (1 - Math.sin(M+e) + Math.sin(M)); 
        if (isNaN(E) || !isFinite(E)) E = M + (e > 0 ? e : -e); // Robust fallback
    } else {
       E = M + e * Math.sin(M); 
    }

    for (let i = 0; i < maxIter; i++) {
        const f_E = E - e * Math.sin(E) - M; 
        const f_prime_E = 1 - e * Math.cos(E); 
        if (Math.abs(f_prime_E) < 1e-10) { // Avoid division by zero or very small number
            // console.warn(`Kepler solver: f_prime_E is too small for M=${M}, e=${e}. Returning current E=${E}`);
            return E; // Or handle error appropriately
        }
        const deltaE = f_E / f_prime_E;
        E -= deltaE;
        if (Math.abs(deltaE) < tolerance) {
            return E;
        }
    }
    // console.warn(`Kepler's equation did not converge for M=${M}, e=${e} after ${maxIter} iterations. Last E=${E}`);
    return E;
}

/**
 * Calculates a series of points for an elliptical orbit.
 * @param {object} orbitalProperties - The orbital parameters of the body.
 * @param {string} objectName - Name of the object for logging.
 * @param {number} numPoints - Number of points to calculate for the ellipse.
 * @param {boolean} isMoon - Whether this is a moon orbit (uses different scale)
 * @returns {THREE.Line | null} A Line object representing the orbit, or null.
 */
function calculateOrbitPoints(orbitalProperties, objectName, numPoints = 200, isMoon = false) { // Reduced points for performance
    if (!orbitalProperties) return null;

    const { semiMajorAxis: a_km, eccentricity: e, argumentOfPerihelion: omega_deg } = orbitalProperties;
    // Use moon-specific scale for moons to ensure they orbit outside their planets
    const a = a_km * (isMoon ? MOON_DISTANCE_SCALE : DISTANCE_SCALE);
    if (a === 0) {
        return null;
    }

    const points = [];
    const omega_rad = THREE.MathUtils.degToRad(omega_deg || 0);

    for (let i = 0; i <= numPoints; i++) {
        const M_loop = (i / numPoints) * 2 * Math.PI; 
        const E_loop = solveKeplerEquation(M_loop, e);     
        const nu_loop = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E_loop / 2), Math.sqrt(1 - e) * Math.cos(E_loop / 2)); 
        const r_loop = a * (1 - e * Math.cos(E_loop)); 

        const x_op = r_loop * Math.cos(nu_loop + omega_rad);
        const y_op = r_loop * Math.sin(nu_loop + omega_rad);
        
        points.push(new THREE.Vector3(x_op, 0, -y_op)); 
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.5 }); // Darker, more transparent
    const line = new THREE.Line(geometry, material);
    line.name = objectName + "_orbitLine";
    return line;
}

// Helper to load high-quality textures with best filtering
function loadTextureHQ(path) {
    const tex = textureLoader.load(path);
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
}

/**
 * Creates a celestial body (star, planet, or moon) with texture and adds it to the scene.
 * @param {object} data - The properties of the celestial body.
 */
function createCelestialBody(data) {
    const scaledRadius = Math.max(0.1, data.radius * RADIUS_SCALE);
    // Higher segment counts for smoothness
    let widthSegments = 64, heightSegments = 32;
    if (data.isStar) {
        widthSegments = 128;
        heightSegments = 64;
    }
    const geometry = new THREE.SphereGeometry(scaledRadius, widthSegments, heightSegments);
    
    let material;
    if (data.isStar) {
        // Sun uses emissive material to glow and light up the scene
        const sunTexture = loadTextureHQ(getTexture(["../textures/8k_sun.jpg", "../textures/2k_sun.jpg"]));
        material = new THREE.MeshBasicMaterial({
            map: sunTexture,
            emissive: 0xffaa33,
            emissiveIntensity: 0.5
        });
        
        // Position lights at the Sun's location 
        sunLight.position.set(0, 0, 0);
        sunPointLight.position.set(0, 0, 0);
    } else {
        // Planets use StandardMaterial with optimized settings for better lighting reception
        const planetTexture = loadTextureHQ(data.textureUrl);
        
        // Special case for Uranus - use StandardMaterial which renders better than Basic
        if (data.name === "Uranus") {
            console.log(`Creating Uranus with texture: ${data.textureUrl}`);
        material = new THREE.MeshStandardMaterial({
                map: planetTexture,
                metalness: 0.1,
                roughness: 0.8,
                color: 0x8CFFFF // Light cyan color to enhance visibility
            });
    } else {
            // Standard material for other planets
            // Distance-based material adjustments
            const isOuterPlanet = data.orbitalProperties && data.orbitalProperties.semiMajorAxis > 5 * AU;
            
        material = new THREE.MeshStandardMaterial({
                map: planetTexture,
                metalness: 0.0,
                roughness: isOuterPlanet ? 0.7 : 0.8, // Lower roughness for outer planets to increase reflectivity
                envMapIntensity: isOuterPlanet ? 0.5 : 0.3 // Increase environment reflectivity for outer planets
            });
        }
    }

    const bodyObject = new THREE.Mesh(geometry, material);
    bodyObject.name = data.name + "_mesh";
    // bodyObject.castShadow = !data.isStar;
    // bodyObject.receiveShadow = !data.isStar;
    
    bodyObject.rotation.x = THREE.MathUtils.degToRad(data.axialTilt || 0); 
     if (data.name === "Uranus") { 
        bodyObject.rotation.z = THREE.MathUtils.degToRad(data.axialTilt || 0); 
        bodyObject.rotation.x = 0; 
    }

    const orbitPivot = new THREE.Object3D(); 
    orbitPivot.name = data.name + "_orbitPivot";
    orbitPivot.add(bodyObject); 

    let parentThreeJSObject = scene; 
    let lineParentThreeJSObject = scene;

    if (data.orbitsAround) {
        const parentEntityArr = celestialObjects.filter(obj => obj.name === data.orbitsAround);
        if (parentEntityArr.length > 0) {
            const parentEntity = parentEntityArr[0]; // get the first match
            parentThreeJSObject = parentEntity.bodyObject; 
            lineParentThreeJSObject = parentEntity.bodyObject; 
        } else {
            console.warn(`Parent object ${data.orbitsAround} not found for ${data.name}. Defaulting to main scene.`);
        }
    }
    
    parentThreeJSObject.add(orbitPivot);
    let createdOrbitLine = null; // Declare here to be accessible for the celestialObjects push

    if (data.orbitalProperties) {
        const { 
            semiMajorAxis: a_km, 
            eccentricity: e, 
            inclination: i_deg, 
            longitudeOfAscendingNode: Omega_deg, 
            argumentOfPerihelion: omega_deg,
            period: orbitalPeriodDays 
        } = data.orbitalProperties;

        // ---- Accurate moon-orbit separation adjustment ----
        // Base scene-scaled semi-major axis
        const baseScaledA = a_km * (data.isMoon ? MOON_DISTANCE_SCALE : DISTANCE_SCALE);

        // Determine a visual scaling factor so the *periapsis* (closest approach)
        // never intersects the parent body while still preserving true orbital
        // shape.  We guarantee at least 30 % of the parent-radius clearance.
        let visualOrbitFactor = 1;
        if (data.isMoon && data.orbitsAround) {
            const parentEntity = celestialObjects.find(o => o.name === data.orbitsAround && o.bodyObject);
            if (parentEntity) {
                const parentScaledRadius = parentEntity.bodyObject.geometry.parameters.radius * parentEntity.bodyObject.scale.x;
                const minSeparation = parentScaledRadius * 0.3; // 30 % clearance
                const requiredPericenter = parentScaledRadius + minSeparation;
                const currentPericenter = baseScaledA * (1 - e);
                if (currentPericenter < requiredPericenter) {
                    visualOrbitFactor = requiredPericenter / currentPericenter;
                }
            }
        }

        // Final semi-major axis used for initial placement (animate() will apply
        // the same factor each frame).
        const a = baseScaledA * visualOrbitFactor;

        const M0 = Math.random() * 2 * Math.PI; 
        const E0 = solveKeplerEquation(M0, e);
        const nu0 = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E0 / 2), Math.sqrt(1 - e) * Math.cos(E0 / 2));
        const r0 = a * (1 - e * Math.cos(E0));

        const x_orb_plane = r0 * Math.cos(nu0 + THREE.MathUtils.degToRad(omega_deg || 0));
        const z_orb_plane = r0 * Math.sin(nu0 + THREE.MathUtils.degToRad(omega_deg || 0));
        
        bodyObject.position.set(x_orb_plane, 0, -z_orb_plane); 

        orbitPivot.rotation.y = THREE.MathUtils.degToRad(Omega_deg || 0); 
        orbitPivot.rotateOnWorldAxis(new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), orbitPivot.rotation.y), THREE.MathUtils.degToRad(i_deg || 0));

        data.currentMeanAnomaly = M0;
        data.orbitalPeriodDays = orbitalPeriodDays;

        createdOrbitLine = calculateOrbitPoints(data.orbitalProperties, data.name, 200, data.isMoon); // Pass isMoon flag
        let linePivot = null;
        if (createdOrbitLine) {
            linePivot = new THREE.Object3D();
            linePivot.name = data.name + "_linePivot";
            linePivot.add(createdOrbitLine);
            linePivot.rotation.copy(orbitPivot.rotation);
            // Ensure orbit visual matches any separation scaling applied to moons
            if (data.isMoon && visualOrbitFactor !== 1) {
                linePivot.scale.set(visualOrbitFactor, 1, visualOrbitFactor);
            }
            lineParentThreeJSObject.add(linePivot); 
            
            // Set initial visibility based on UI settings
            createdOrbitLine.visible = uiSettings.showOrbitLines;
        }
        
        // Saturn rings handled by the texture option system now

        celestialObjects.push({
            name: data.name,
            bodyObject: bodyObject, 
            orbitPivot: orbitPivot,   
            linePivot: linePivot,     // Store the linePivot which contains createdOrbitLine
            orbitalProperties: data.orbitalProperties,
            rotationPeriod: data.rotationPeriod,
            currentMeanAnomaly: data.currentMeanAnomaly,
            orbitalPeriodDays: data.orbitalPeriodDays,
            isStar: !!data.isStar,
            isMoon: !!data.isMoon,
            orbitsAround: data.orbitsAround || null,
            planetLight: null,  // Stars don't need their own hemisphere light
            visualOrbitFactor // Persist for animate() frame updates
        });

    } else if (data.isStar) { 
        parentThreeJSObject.remove(orbitPivot); 
        parentThreeJSObject.add(bodyObject);    
        
        celestialObjects.push({
            name: data.name,
            bodyObject: bodyObject,
            orbitPivot: null, 
            linePivot: null,  
            orbitalProperties: null,
            rotationPeriod: data.rotationPeriod,
            currentMeanAnomaly: 0,
            orbitalPeriodDays: null,
            isStar: true,
            isMoon: false,
            orbitsAround: null,
            planetLight: null  // Stars don't need their own hemisphere light
        });
    }

    // Create a planetLight for large planets and moons
    let planetLight = null;
    if (!data.isStar && data.orbitalProperties) {
        const distance = data.orbitalProperties.semiMajorAxis;
        
        // Scale intensity based on distance from Sun
        if (distance > 2 * AU) {
            const intensity = 0.75 * (1 - Math.min(0.95, (distance / (35 * AU))));
            planetLight = new THREE.HemisphereLight(0xffffbb, 0x080820, intensity);
            bodyObject.add(planetLight); // Add light directly to the body object
        }
    }
    
    // Create an information label for the celestial body
    createCelestialBodyLabel(data, bodyObject);
    
    // For planets with special features, apply their initial texture options
    if (data.name === "Earth" || data.name === "Venus" || data.name === "Saturn") {
        // The initial state will be applied when the planet is selected in the UI
        // But we can trigger it here too for objects that might be visible at startup
        if (window._textureOptions && window._textureOptions[data.name]) {
            setTimeout(() => {
                updatePlanetTextures(data.name);
            }, 100); // Short delay to ensure everything is initialized
        }
    }

    // Previous post-creation moon-separation logic removed – handled earlier in this function.
}

/**
 * Creates a label with key statistics for a celestial body
 * @param {object} data - The data for the celestial body
 * @param {THREE.Object3D} bodyObject - The Three.js object representing the body
 */
function createCelestialBodyLabel(data, bodyObject) {
    // Create a canvas for the label with higher resolution
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Create a sprite using the canvas as a texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        sizeAttenuation: true // Enable size attenuation for more natural appearance
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.name = `${data.name}_label`;
    
    // Set a reasonable scale based on object size
    const objectRadius = bodyObject.geometry.parameters.radius;
    const labelScale = objectRadius * 2.5; // Slightly smaller than before
    sprite.scale.set(labelScale * 2, labelScale, 1);
    
    // Position the label above the object with greater offset to avoid intersection
    const offsetFactor = data.isStar ? 5.0 : 4.0; // Increased height for all labels
    sprite.position.set(0, objectRadius * offsetFactor, 0);
    
    // Add the sprite to the body object
    bodyObject.add(sprite);
    
    // Store distance to camera for adaptive display
    sprite.lastCameraDistance = 0;
    
    // Store function to update the label content
    sprite.updateLabelContent = function(cameraDistance) {
        if (!uiSettings.showLabels) {
            sprite.visible = false;
            return;
        }
        
        // Store camera distance for smart label decisions
        sprite.lastCameraDistance = cameraDistance || sprite.lastCameraDistance;
        
        // Determine label mode based on distance
        // Close: detailed view, Far: minimal view
        const closeThreshold = objectRadius * 20;
        const isCloseView = sprite.lastCameraDistance < closeThreshold;
        
        sprite.visible = true;
        
        // Adjust opacity based on distance (more transparent when farther)
        const baseOpacity = 0.85;
        const distanceFactor = Math.min(1, 4 * closeThreshold / sprite.lastCameraDistance);
        spriteMaterial.opacity = baseOpacity * distanceFactor;
        
        // Clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw minimal or detailed label based on distance
        if (isCloseView) {
            drawDetailedLabel(context, data);
        } else {
            drawMinimalLabel(context, data);
        }
        
        // Update the texture
        texture.needsUpdate = true;
    };
    
    // Function to draw a minimal label (just name and type icon)
    function drawMinimalLabel(ctx, data) {
        // Draw a simple pill shape with subtle gradient
        const width = canvas.width;
        const height = 60; // Much shorter for minimal view
        const radius = height / 2;
        
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(30, 30, 40, 0.8)');
        gradient.addColorStop(1, 'rgba(20, 20, 30, 0.8)');
        
        // Draw rounded pill
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(width - radius, 0);
        ctx.arcTo(width, 0, width, radius, radius);
        ctx.arcTo(width, height, width - radius, height, radius);
        ctx.lineTo(radius, height);
        ctx.arcTo(0, height, 0, height - radius, radius);
        ctx.arcTo(0, 0, radius, 0, radius);
        ctx.closePath();
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Subtle border
        ctx.strokeStyle = 'rgba(120, 220, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Object type indicator (icon/color)
        let typeColor = '#FFFFFF';
        if (data.isStar) typeColor = '#FFCC33'; // Sun: yellow
        else if (data.isMoon) typeColor = '#AAAAAA'; // Moons: grey
        else typeColor = '#66CCFF'; // Planets: blue
        
        // Draw colored circle indicator
        ctx.beginPath();
        ctx.arc(radius, height/2, radius*0.5, 0, Math.PI*2);
        ctx.fillStyle = typeColor;
        ctx.fill();
        
        // Draw name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.name, width/2, height/2);
    }
    
    // Function to draw a detailed label with more info
    function drawDetailedLabel(ctx, data) {
        // Draw a rounded rectangle background
        const width = canvas.width;
        const height = canvas.height;
        const cornerRadius = 15;
        
        // Background with gentle gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(30, 30, 45, 0.75)');
        gradient.addColorStop(1, 'rgba(20, 20, 35, 0.75)');
        
        // Draw rounded rectangle
        ctx.beginPath();
        ctx.moveTo(cornerRadius, 0);
        ctx.lineTo(width - cornerRadius, 0);
        ctx.quadraticCurveTo(width, 0, width, cornerRadius);
        ctx.lineTo(width, height - cornerRadius);
        ctx.quadraticCurveTo(width, height, width - cornerRadius, height);
        ctx.lineTo(cornerRadius, height);
        ctx.quadraticCurveTo(0, height, 0, height - cornerRadius);
        ctx.lineTo(0, cornerRadius);
        ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
        ctx.closePath();
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Subtle glow border
        let borderGradient;
        if (data.isStar) {
            borderGradient = ctx.createLinearGradient(0, 0, width, height);
            borderGradient.addColorStop(0, 'rgba(255, 204, 51, 0.6)');
            borderGradient.addColorStop(1, 'rgba(255, 153, 51, 0.6)');
        } else if (data.isMoon) {
            borderGradient = ctx.createLinearGradient(0, 0, width, height);
            borderGradient.addColorStop(0, 'rgba(200, 200, 200, 0.4)');
            borderGradient.addColorStop(1, 'rgba(150, 150, 150, 0.4)');
        } else {
            borderGradient = ctx.createLinearGradient(0, 0, width, height);
            borderGradient.addColorStop(0, 'rgba(102, 204, 255, 0.5)');
            borderGradient.addColorStop(1, 'rgba(51, 153, 255, 0.5)');
        }
        
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Header with name and icon
        const headerHeight = 45;
        
        // Object type icon color
        let typeColor = '#FFFFFF';
        if (data.isStar) typeColor = '#FFCC33'; // Sun: yellow
        else if (data.isMoon) typeColor = '#CCCCCC'; // Moons: lighter grey
        else typeColor = '#66CCFF'; // Planets: blue
        
        // Draw small indicator circle
        ctx.beginPath();
        ctx.arc(30, headerHeight/2, 8, 0, Math.PI*2);
        ctx.fillStyle = typeColor;
        ctx.fill();
        
        // Draw name with subtle text shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(data.name, width/2, headerHeight/2 + 5);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Separator line
        ctx.beginPath();
        ctx.moveTo(20, headerHeight + 5);
        ctx.lineTo(width - 20, headerHeight + 5);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Stats section
        ctx.font = '18px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        let yPos = headerHeight + 35;
        const lineHeight = 26;
        
        // Function to add a stat with colored value
        function addStat(label, value, valueColor = '#FFFFFF') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(label + ':', 25, yPos);
            
            ctx.fillStyle = valueColor;
            ctx.fillText(value, 170, yPos);
            
            yPos += lineHeight;
        }
        
        // Basic info for all bodies
        addStat("Radius", `${formatNumber(data.radius)} km`, '#66CCFF');
        
        // Add type-specific stats
        if (data.isStar) {
            addStat("Type", "Star", '#FFCC33');
            addStat("Planets", `${formatNumber(solarSystemPlanetsAndSunData.length - 1)}`, '#66CCFF');
        } else if (data.isMoon) {
            addStat("Type", "Moon", '#CCCCCC');
            addStat("Orbits", data.orbitsAround, '#FFCC33');
        } else {
            addStat("Type", "Planet", '#66CCFF');
        }
        
        // Rotation info
        const rotationDays = Math.abs(data.rotationPeriod);
        const rotationDir = data.rotationPeriod < 0 ? 'Retrograde' : 'Prograde';
        const rotationColor = data.rotationPeriod < 0 ? '#FF9966' : '#66FFCC';
        addStat("Rotation", `${rotationDir}, ${formatNumber(rotationDays)} days`, rotationColor);
        
        // Orbital info if available
        if (data.orbitalProperties) {
            if (data.trueAnomaly !== undefined) {
                const orbitPercent = ((data.trueAnomaly < 0 ? data.trueAnomaly + 2 * Math.PI : data.trueAnomaly) / (2 * Math.PI) * 100).toFixed(0);
                addStat("Orbit", `${orbitPercent}% complete`, '#FFCC66');
            }
            
            if (data.orbitalSpeed !== undefined) {
                addStat("Speed", `${formatNumber(data.orbitalSpeed)} km/s`, '#FF9966');
            }
        }
    }
    
    // Initial update with no camera distance (will use default)
    sprite.updateLabelContent();
    
    return sprite;
}

/**
 * Formats a number for display, adding commas for thousands and limiting decimal places
 */
function formatNumber(num) {
    if (num === 0) return '0';
    
    // For small numbers (<0.1), show more decimal places
    if (Math.abs(num) < 0.1 && Math.abs(num) > 0) {
        return num.toFixed(4);
    }
    
    // For medium numbers, show fewer decimal places
    if (Math.abs(num) < 100) {
        return num.toFixed(2);
    }
    
    // For large numbers, show commas for thousands
    return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });
}

// Update label visibility function
function updateLabelsVisibility() {
    celestialObjects.forEach(obj => {
        const label = obj.bodyObject.getObjectByName(`${obj.name}_label`);
        if (label && label.updateLabelContent) {
            label.updateLabelContent();
        }
    });
}

// Update orbit lines visibility function
function updateOrbitLinesVisibility() {
    celestialObjects.forEach(obj => {
        if (obj.linePivot) {
            const orbitLine = obj.linePivot.children[0];
            if (orbitLine) {
                orbitLine.visible = uiSettings.showOrbitLines;
            }
        }
    });
}

function clearScene() {
    for (let i = celestialObjects.length - 1; i >= 0; i--) {
        const obj = celestialObjects[i];
        
        if (obj.orbitPivot && obj.orbitPivot.parent) {
            obj.orbitPivot.parent.remove(obj.orbitPivot);
        } else if (!obj.orbitPivot && obj.bodyObject.parent) { 
            obj.bodyObject.parent.remove(obj.bodyObject);
        }

        if (obj.linePivot && obj.linePivot.parent) {
            obj.linePivot.parent.remove(obj.linePivot);
        }
        
        if (obj.bodyObject.geometry) obj.bodyObject.geometry.dispose();
        if (obj.bodyObject.material) {
            if (Array.isArray(obj.bodyObject.material)) {
                obj.bodyObject.material.forEach(mat => mat.dispose());
            } else {
                obj.bodyObject.material.dispose();
            }
        }
        
        const rings = obj.bodyObject.getObjectByName("Saturn_rings"); // Simplified check
        if (rings) {
            if (rings.geometry) rings.geometry.dispose();
            if (rings.material) rings.material.dispose();
        }

        if (obj.linePivot) {
            const lineMesh = obj.linePivot.children[0]; 
            if (lineMesh && lineMesh.geometry) lineMesh.geometry.dispose();
            if (lineMesh && lineMesh.material) lineMesh.material.dispose();
        }
    }
    celestialObjects.length = 0; 

    // Ensure lights are not removed if they are direct children of the scene and not re-added
    // For this setup, ambient and point lights are added once and should remain.
}

// --- Scene Initialization ---
clearScene(); 
scene.add(ambientLight);
// pointLight is already added to the scene, its position will be set by the Sun's creation.

// Add a skybox using the best available starfield texture
const starTexturePath = getTexture(["../textures/8k_stars_milky_way.jpg", "../textures/8k_stars.jpg", "../textures/2k_stars_milky_way.jpg", "../textures/2k_stars.jpg"]);
if (starTexturePath) {
    const loader = new THREE.TextureLoader();
    loader.load(starTexturePath, function(texture) {
        const geometry = new THREE.SphereGeometry(2000000, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide
        });
        const skybox = new THREE.Mesh(geometry, material);
        scene.add(skybox);
    });
}

solarSystemData.forEach(createCelestialBody);
console.log("Celestial objects created. Count:", celestialObjects.length);
celestialObjects.forEach(o => {
    let parentName = 'Scene';
    if (o.orbitsAround) {
        parentName = o.orbitsAround;
    } else if (o.isStar) {
        parentName = 'Scene (is Sun)';
    }
    // console.log(`${o.name} (orbits ${parentName}), body parent: ${o.bodyObject.parent ? o.bodyObject.parent.name : 'N/A'}, orbit pivot parent: ${o.orbitPivot ? (o.orbitPivot.parent ? o.orbitPivot.parent.name : 'N/A') : 'N/A'}`);
});


// --- UI Panel Logic ---
window.addEventListener('DOMContentLoaded', () => {
    const planetSelect = document.getElementById('planet-select');
    const sizeScaleInput = document.getElementById('size-scale');
    const sunSizeScaleInput = document.getElementById('sun-size-scale');
    
    // Create time scale section
    const timeScaleSection = document.createElement('div');
    timeScaleSection.className = 'panel-section';
    
    const timeScaleLabel = document.createElement('label');
    timeScaleLabel.textContent = 'Time Scale:';
    timeScaleSection.appendChild(timeScaleLabel);
    
    // Current setting display
    const currentTimeScaleDisplay = document.createElement('div');
    currentTimeScaleDisplay.className = 'current-time-scale';
    currentTimeScaleDisplay.textContent = simSettings.timePresets[simSettings.currentPresetIndex].label;
    timeScaleSection.appendChild(currentTimeScaleDisplay);
    
    // Create notched time slider
    const timeScaleSlider = document.createElement('div');
    timeScaleSlider.className = 'time-scale-slider';
    
    // Previous/Next buttons for time scale
    const prevTimeScaleBtn = document.createElement('button');
    prevTimeScaleBtn.className = 'time-scale-btn';
    prevTimeScaleBtn.textContent = '◀';
    prevTimeScaleBtn.addEventListener('click', () => {
        if (simSettings.currentPresetIndex > 0) {
            simSettings.currentPresetIndex--;
            updateTimeScaleDisplay();
        }
    });
    
    const nextTimeScaleBtn = document.createElement('button');
    nextTimeScaleBtn.className = 'time-scale-btn';
    nextTimeScaleBtn.textContent = '▶';
    nextTimeScaleBtn.addEventListener('click', () => {
        if (simSettings.currentPresetIndex < simSettings.timePresets.length - 1) {
            simSettings.currentPresetIndex++;
            updateTimeScaleDisplay();
        }
    });
    
    // Create notch markers
    const timeScaleNotches = document.createElement('div');
    timeScaleNotches.className = 'time-scale-notches';
    simSettings.timePresets.forEach((preset, index) => {
        const notch = document.createElement('div');
        notch.className = 'time-scale-notch';
        if (index === simSettings.currentPresetIndex) {
            notch.classList.add('active');
        }
        notch.addEventListener('click', () => {
            simSettings.currentPresetIndex = index;
            updateTimeScaleDisplay();
        });
        timeScaleNotches.appendChild(notch);
    });
    
    timeScaleSlider.appendChild(prevTimeScaleBtn);
    timeScaleSlider.appendChild(timeScaleNotches);
    timeScaleSlider.appendChild(nextTimeScaleBtn);
    timeScaleSection.appendChild(timeScaleSlider);
    
    // Function to update the time scale display
    function updateTimeScaleDisplay() {
        // Update the display text
        currentTimeScaleDisplay.textContent = simSettings.timePresets[simSettings.currentPresetIndex].label;
        
        // Update notch active states
        const notches = timeScaleNotches.querySelectorAll('.time-scale-notch');
        notches.forEach((notch, index) => {
            if (index === simSettings.currentPresetIndex) {
                notch.classList.add('active');
            } else {
                notch.classList.remove('active');
            }
        });
        
        // Enable/disable prev/next buttons
        prevTimeScaleBtn.disabled = simSettings.currentPresetIndex === 0;
        nextTimeScaleBtn.disabled = simSettings.currentPresetIndex === simSettings.timePresets.length - 1;
        
        // Update live simulation speed readout
        updateLiveSimulationDisplay();
    }
    
    // Add a separate simulation speed display
    const simulationSpeedDisplay = document.createElement('div');
    simulationSpeedDisplay.className = 'simulation-speed-display';
    timeScaleSection.appendChild(simulationSpeedDisplay);
    
    function updateLiveSimulationDisplay() {
        const currentPreset = simSettings.timePresets[simSettings.currentPresetIndex];
        const daysPerSec = currentPreset.daysPerSecond;
        
        let displayText;
        if (daysPerSec < 1) {
            // Show as seconds per day
            displayText = `${formatNumber(1/daysPerSec)} seconds = 1 day`;
        } else {
            // Show as days per second
            displayText = `${formatNumber(daysPerSec)} days = 1 second`;
        }
        
        simulationSpeedDisplay.textContent = displayText;
    }
    
    // Initialize the display
    updateTimeScaleDisplay();
    
    // Add time scale section to panel
    document.getElementById('solar-ui-panel').appendChild(timeScaleSection);
    
    // Remove old time exponent elements if they exist
    const oldTimeElements = document.querySelectorAll('.time-exponent-container, .micro-time-container, .live-time-readout');
    oldTimeElements.forEach(el => el.remove());
    
    // Create visibility toggles section
    const togglesPanel = document.createElement('div');
    togglesPanel.className = 'panel-section visibility-toggles';
    
    // Create visibility toggle heading
    const togglesHeading = document.createElement('div');
    togglesHeading.className = 'option-heading';
    togglesHeading.textContent = 'Visibility Toggles';
    togglesPanel.appendChild(togglesHeading);
    
    // Orbit Lines Toggle
    const orbitLinesToggle = document.createElement('div');
    orbitLinesToggle.className = 'option-toggle';
    
    const orbitLinesLabel = document.createElement('label');
    orbitLinesLabel.textContent = 'Orbit Lines:';
    orbitLinesToggle.appendChild(orbitLinesLabel);
    
    const orbitLinesCheckbox = document.createElement('input');
    orbitLinesCheckbox.type = 'checkbox';
    orbitLinesCheckbox.checked = uiSettings.showOrbitLines;
    orbitLinesCheckbox.addEventListener('change', (e) => {
        uiSettings.showOrbitLines = e.target.checked;
        updateOrbitLinesVisibility();
    });
    orbitLinesToggle.appendChild(orbitLinesCheckbox);
    togglesPanel.appendChild(orbitLinesToggle);
    
    // Labels Toggle
    const labelsToggle = document.createElement('div');
    labelsToggle.className = 'option-toggle';
    
    const labelsLabel = document.createElement('label');
    labelsLabel.textContent = 'Information Labels:';
    labelsToggle.appendChild(labelsLabel);
    
    const labelsCheckbox = document.createElement('input');
    labelsCheckbox.type = 'checkbox';
    labelsCheckbox.checked = uiSettings.showLabels;
    labelsCheckbox.addEventListener('change', (e) => {
        uiSettings.showLabels = e.target.checked;
        updateLabelsVisibility();
    });
    labelsToggle.appendChild(labelsCheckbox);
    togglesPanel.appendChild(labelsToggle);
    
    // Telemetry Panel Toggle
    const telemetryToggle = document.createElement('div');
    telemetryToggle.className = 'option-toggle';
    
    const telemetryLabel = document.createElement('label');
    telemetryLabel.textContent = 'Orbital Telemetry:';
    telemetryToggle.appendChild(telemetryLabel);
    
    const telemetryCheckbox = document.createElement('input');
    telemetryCheckbox.type = 'checkbox';
    telemetryCheckbox.checked = uiSettings.showTelemetry;
    telemetryCheckbox.addEventListener('change', (e) => {
        uiSettings.showTelemetry = e.target.checked;
        
        // Update telemetry panel for current focused object
        if (window._focusedPlanetName) {
            const focusedObj = celestialObjects.find(o => o.name === window._focusedPlanetName);
            window.updateTelemetry(focusedObj);
        } else {
            window.updateTelemetry(null);
        }
    });
    telemetryToggle.appendChild(telemetryCheckbox);
    togglesPanel.appendChild(telemetryToggle);
    
    // Realistic Rotation Toggle
    const rotationToggle = document.createElement('div');
    rotationToggle.className = 'option-toggle';
    
    const rotationLabel = document.createElement('label');
    rotationLabel.textContent = 'Realistic Axial Rotation:';
    rotationToggle.appendChild(rotationLabel);
    
    const rotationCheckbox = document.createElement('input');
    rotationCheckbox.type = 'checkbox';
    rotationCheckbox.checked = uiSettings.realisticRotation;
    rotationCheckbox.addEventListener('change', (e) => {
        uiSettings.realisticRotation = e.target.checked;
    });
    rotationToggle.appendChild(rotationCheckbox);
    togglesPanel.appendChild(rotationToggle);
    
    // Add toggles panel to the main UI panel
    document.getElementById('solar-ui-panel').insertBefore(
        togglesPanel, 
        document.querySelector('.planet-options') || document.querySelector('.panel-tip')
    );
    
    // Create dynamic planet options panel
    const planetOptionsPanel = document.createElement('div');
    planetOptionsPanel.className = 'panel-section planet-options';
    planetOptionsPanel.style.display = 'none'; // Hide initially
    document.getElementById('solar-ui-panel').appendChild(planetOptionsPanel);
    
    // Add keyboard shortcut tip to the UI
    const tipElement = document.createElement('div');
    tipElement.className = 'panel-tip';
    tipElement.textContent = 'Press R to reset camera position';
    document.getElementById('solar-ui-panel').appendChild(tipElement);
    
    // Store the currently focused planet name
    window._focusedPlanetName = null;
    
    // Store texture enhancement options
    window._textureOptions = {
        Earth: {
            showClouds: true,
            useNightTexture: false,
            cloudOpacity: 0.3 // Changed from previous value to 30%
        },
        Venus: {
            showAtmosphere: true,
            atmosphereOpacity: 0.7
        },
        Saturn: {
            showRings: true,
            ringOpacity: 0.7
        },
        Phobos: {
            showTopography: false,
            topographyOpacity: 0.5
        },
        Deimos: {
            showTopography: false,
            topographyOpacity: 0.5
        }
    };

    // Populate planet dropdown
    planetSelect.innerHTML = '';

    // Create optgroup for planets and Sun
    const planetsGroup = document.createElement('optgroup');
    planetsGroup.label = 'Planets & Sun';
    solarSystemPlanetsAndSunData.forEach((obj) => {
        const option = document.createElement('option');
        option.value = obj.name;
        option.textContent = obj.name;
        planetsGroup.appendChild(option);
    });
    planetSelect.appendChild(planetsGroup);

    // Create optgroup for moons
    const moonsGroup = document.createElement('optgroup');
    moonsGroup.label = 'Moons';
    allMoonsData.forEach((moon) => {
        const option = document.createElement('option');
        option.value = moon.name;
        option.textContent = moon.name;
        moonsGroup.appendChild(option);
    });
    planetSelect.appendChild(moonsGroup);
    
    // Reset camera position function
    function resetCameraPosition() {
        if (window._focusedPlanetName) {
            focusOnPlanet(window._focusedPlanetName);
        }
    }
    
    // Add keyboard shortcut for resetting camera position
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            resetCameraPosition();
        }
    });
    
    // Update planet texture option UI
    function updatePlanetOptionsUI(planetName) {
        planetOptionsPanel.innerHTML = ''; // Clear previous options
        planetOptionsPanel.style.display = 'none';
        
        if (planetName === 'Earth' || planetName === 'Venus' || planetName === 'Saturn') {
            planetOptionsPanel.style.display = 'block';
            
            // Add heading
            const heading = document.createElement('div');
            heading.className = 'option-heading';
            heading.textContent = `${planetName} Visual Options`;
            planetOptionsPanel.appendChild(heading);
        }
        
        if (planetName === 'Earth') {        
            // Cloud layer toggle
            const cloudToggle = document.createElement('div');
            cloudToggle.className = 'option-toggle';
            
            const cloudLabel = document.createElement('label');
            cloudLabel.textContent = 'Cloud Layer:';
            cloudToggle.appendChild(cloudLabel);
            
            const cloudCheckbox = document.createElement('input');
            cloudCheckbox.type = 'checkbox';
            cloudCheckbox.checked = window._textureOptions.Earth.showClouds;
            cloudCheckbox.addEventListener('change', (e) => {
                window._textureOptions.Earth.showClouds = e.target.checked;
                updatePlanetTextures('Earth');
                
                // Update opacity slider state
                cloudOpacityContainer.style.display = e.target.checked ? 'block' : 'none';
            });
            cloudToggle.appendChild(cloudCheckbox);
            
            planetOptionsPanel.appendChild(cloudToggle);
            
            // Cloud opacity slider
            const cloudOpacityContainer = document.createElement('div');
            cloudOpacityContainer.className = 'option-slider';
            cloudOpacityContainer.style.display = window._textureOptions.Earth.showClouds ? 'block' : 'none';
            
            const cloudOpacityLabel = document.createElement('label');
            cloudOpacityLabel.textContent = 'Cloud Opacity:';
            cloudOpacityContainer.appendChild(cloudOpacityLabel);
            
            const cloudOpacitySlider = document.createElement('input');
            cloudOpacitySlider.type = 'range';
            cloudOpacitySlider.min = '0.1';
            cloudOpacitySlider.max = '1.0';
            cloudOpacitySlider.step = '0.1';
            cloudOpacitySlider.value = window._textureOptions.Earth.cloudOpacity;
            cloudOpacitySlider.addEventListener('input', (e) => {
                window._textureOptions.Earth.cloudOpacity = parseFloat(e.target.value);
                updatePlanetTextures('Earth');
            });
            cloudOpacityContainer.appendChild(cloudOpacitySlider);
            
            planetOptionsPanel.appendChild(cloudOpacityContainer);
            
            // Day/Night toggle
            const dayNightToggle = document.createElement('div');
            dayNightToggle.className = 'option-toggle';
            
            const dayNightLabel = document.createElement('label');
            dayNightLabel.textContent = 'Night View:';
            dayNightToggle.appendChild(dayNightLabel);
            
            const dayNightCheckbox = document.createElement('input');
            dayNightCheckbox.type = 'checkbox';
            dayNightCheckbox.checked = window._textureOptions.Earth.useNightTexture;
            dayNightCheckbox.addEventListener('change', (e) => {
                window._textureOptions.Earth.useNightTexture = e.target.checked;
                updatePlanetTextures('Earth');
            });
            dayNightToggle.appendChild(dayNightCheckbox);
            
            planetOptionsPanel.appendChild(dayNightToggle);
            
            // Apply initial texture state
            updatePlanetTextures('Earth');
        } 
        else if (planetName === 'Venus') {
            // Atmosphere toggle
            const atmosphereToggle = document.createElement('div');
            atmosphereToggle.className = 'option-toggle';
            
            const atmosphereLabel = document.createElement('label');
            atmosphereLabel.textContent = 'Atmosphere:';
            atmosphereToggle.appendChild(atmosphereLabel);
            
            const atmosphereCheckbox = document.createElement('input');
            atmosphereCheckbox.type = 'checkbox';
            atmosphereCheckbox.checked = window._textureOptions.Venus.showAtmosphere;
            atmosphereCheckbox.addEventListener('change', (e) => {
                window._textureOptions.Venus.showAtmosphere = e.target.checked;
                updatePlanetTextures('Venus');
                
                // Update opacity slider state
                atmosphereOpacityContainer.style.display = e.target.checked ? 'block' : 'none';
            });
            atmosphereToggle.appendChild(atmosphereCheckbox);
            
            planetOptionsPanel.appendChild(atmosphereToggle);
            
            // Atmosphere opacity slider
            const atmosphereOpacityContainer = document.createElement('div');
            atmosphereOpacityContainer.className = 'option-slider';
            atmosphereOpacityContainer.style.display = window._textureOptions.Venus.showAtmosphere ? 'block' : 'none';
            
            const atmosphereOpacityLabel = document.createElement('label');
            atmosphereOpacityLabel.textContent = 'Atmosphere Opacity:';
            atmosphereOpacityContainer.appendChild(atmosphereOpacityLabel);
            
            const atmosphereOpacitySlider = document.createElement('input');
            atmosphereOpacitySlider.type = 'range';
            atmosphereOpacitySlider.min = '0.1';
            atmosphereOpacitySlider.max = '1.0';
            atmosphereOpacitySlider.step = '0.1';
            atmosphereOpacitySlider.value = window._textureOptions.Venus.atmosphereOpacity;
            atmosphereOpacitySlider.addEventListener('input', (e) => {
                window._textureOptions.Venus.atmosphereOpacity = parseFloat(e.target.value);
                updatePlanetTextures('Venus');
            });
            atmosphereOpacityContainer.appendChild(atmosphereOpacitySlider);
            
            planetOptionsPanel.appendChild(atmosphereOpacityContainer);
            
            // Apply initial texture state
            updatePlanetTextures('Venus');
        }
        else if (planetName === 'Saturn') {
            // Rings toggle
            const ringsToggle = document.createElement('div');
            ringsToggle.className = 'option-toggle';
            
            const ringsLabel = document.createElement('label');
            ringsLabel.textContent = 'Rings:';
            ringsToggle.appendChild(ringsLabel);
            
            const ringsCheckbox = document.createElement('input');
            ringsCheckbox.type = 'checkbox';
            ringsCheckbox.checked = window._textureOptions.Saturn.showRings;
            ringsCheckbox.addEventListener('change', (e) => {
                window._textureOptions.Saturn.showRings = e.target.checked;
                updatePlanetTextures('Saturn');
                
                // Update opacity slider state
                ringOpacityContainer.style.display = e.target.checked ? 'block' : 'none';
            });
            ringsToggle.appendChild(ringsCheckbox);
            
            planetOptionsPanel.appendChild(ringsToggle);
            
            // Ring opacity slider
            const ringOpacityContainer = document.createElement('div');
            ringOpacityContainer.className = 'option-slider';
            ringOpacityContainer.style.display = window._textureOptions.Saturn.showRings ? 'block' : 'none';
            
            const ringOpacityLabel = document.createElement('label');
            ringOpacityLabel.textContent = 'Ring Opacity:';
            ringOpacityContainer.appendChild(ringOpacityLabel);
            
            const ringOpacitySlider = document.createElement('input');
            ringOpacitySlider.type = 'range';
            ringOpacitySlider.min = '0.1';
            ringOpacitySlider.max = '1.0';
            ringOpacitySlider.step = '0.1';
            ringOpacitySlider.value = window._textureOptions.Saturn.ringOpacity;
            ringOpacitySlider.addEventListener('input', (e) => {
                window._textureOptions.Saturn.ringOpacity = parseFloat(e.target.value);
                updatePlanetTextures('Saturn');
            });
            ringOpacityContainer.appendChild(ringOpacitySlider);
            
            planetOptionsPanel.appendChild(ringOpacityContainer);
            
            // Apply initial texture state
            updatePlanetTextures('Saturn');
        }
        else if (planetName === 'Phobos' || planetName === 'Deimos') {
            planetOptionsPanel.style.display = 'block';
            const options = window._textureOptions[planetName];

            // Heading
            const heading = document.createElement('div');
            heading.className = 'option-heading';
            heading.textContent = `${planetName} Visual Options`;
            planetOptionsPanel.appendChild(heading);

            // Topography toggle
            const topoToggleDiv = document.createElement('div');
            topoToggleDiv.className = 'option-toggle';
            const topoLabel = document.createElement('label');
            topoLabel.textContent = 'Topography Map:';
            topoToggleDiv.appendChild(topoLabel);
            const topoCheckbox = document.createElement('input');
            topoCheckbox.type = 'checkbox';
            topoCheckbox.checked = options.showTopography;
            topoCheckbox.addEventListener('change', (e) => {
                options.showTopography = e.target.checked;
                updatePlanetTextures(planetName);
                topoOpacityContainer.style.display = e.target.checked ? 'block' : 'none';
            });
            topoToggleDiv.appendChild(topoCheckbox);
            planetOptionsPanel.appendChild(topoToggleDiv);

            // Topography opacity slider
            const topoOpacityContainer = document.createElement('div');
            topoOpacityContainer.className = 'option-slider';
            topoOpacityContainer.style.display = options.showTopography ? 'block' : 'none';
            const topoOpacityLabel = document.createElement('label');
            topoOpacityLabel.textContent = 'Topo Opacity:';
            topoOpacityContainer.appendChild(topoOpacityLabel);
            const topoOpacitySlider = document.createElement('input');
            topoOpacitySlider.type = 'range';
            topoOpacitySlider.min = '0.1'; topoOpacitySlider.max = '1.0'; topoOpacitySlider.step = '0.1';
            topoOpacitySlider.value = options.topographyOpacity;
            topoOpacitySlider.addEventListener('input', (e) => {
                options.topographyOpacity = parseFloat(e.target.value);
                updatePlanetTextures(planetName);
            });
            topoOpacityContainer.appendChild(topoOpacitySlider);
            planetOptionsPanel.appendChild(topoOpacityContainer);

            // Apply initial state
            updatePlanetTextures(planetName);
        }
    }
    
    // Update planet textures based on current options
    function updatePlanetTextures(planetName) {
        const planet = celestialObjects.find(obj => obj.name === planetName);
        if (!planet) return;
        
        if (planetName === 'Earth') {
            // Find Earth in the celestial objects
            const earth = planet.bodyObject;
            const options = window._textureOptions.Earth;
            
            // Update Earth texture based on day/night option
            const textureUrl = options.useNightTexture ? 
                getTexture(TEXTURES.EarthNight) : 
                getTexture(TEXTURES.EarthDay);
            
            earth.material.map = loadTextureHQ(textureUrl); // Use loadTextureHQ
            earth.material.needsUpdate = true;
            
            // Handle cloud layer
            let cloudLayer = earth.getObjectByName('earth_clouds');
            
            if (options.showClouds) {
                if (!cloudLayer) {
                    // Create cloud layer if it doesn't exist
                    const cloudGeometry = new THREE.SphereGeometry(
                        earth.geometry.parameters.radius * 1.01, 
                        64, 
                        32
                    );
                    const cloudMaterial = new THREE.MeshStandardMaterial({
                        map: loadTextureHQ(getTexture(TEXTURES.EarthClouds)), // Use loadTextureHQ
                        transparent: true,
                        opacity: options.cloudOpacity,
                        depthWrite: false
                    });
                    cloudLayer = new THREE.Mesh(cloudGeometry, cloudMaterial);
                    cloudLayer.name = 'earth_clouds';
                    earth.add(cloudLayer);
                } else {
                    // Update opacity dynamically
                    cloudLayer.material.opacity = options.cloudOpacity;
                    cloudLayer.material.map = loadTextureHQ(getTexture(TEXTURES.EarthClouds)); // Ensure map is loaded with HQ
                    cloudLayer.material.needsUpdate = true;
                }
            } else if (cloudLayer) {
                // Remove cloud layer if it exists and shouldn't be shown
                earth.remove(cloudLayer);
                if (cloudLayer.material) cloudLayer.material.dispose();
                if (cloudLayer.geometry) cloudLayer.geometry.dispose();
            }
        }
        else if (planetName === 'Venus') {
            // Find Venus in the celestial objects
            const venus = planet.bodyObject;
            const options = window._textureOptions.Venus;
            
            // Handle atmosphere layer
            let atmosphereLayer = venus.getObjectByName('venus_atmosphere');
            
            if (options.showAtmosphere) {
                if (!atmosphereLayer) {
                    // Create atmosphere layer if it doesn't exist
                    const atmosphereGeometry = new THREE.SphereGeometry(
                        venus.geometry.parameters.radius * 1.03, 
                        64, 
                        32
                    );
                    const atmosphereMaterial = new THREE.MeshStandardMaterial({
                        map: loadTextureHQ(getTexture(TEXTURES.VenusAtmosphere)), // Use loadTextureHQ
                        transparent: true,
                        opacity: options.atmosphereOpacity,
                        depthWrite: false
                    });
                    atmosphereLayer = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
                    atmosphereLayer.name = 'venus_atmosphere';
                    venus.add(atmosphereLayer);
                } else {
                    // Update opacity dynamically
                    atmosphereLayer.material.opacity = options.atmosphereOpacity;
                    atmosphereLayer.material.map = loadTextureHQ(getTexture(TEXTURES.VenusAtmosphere)); // Ensure map is loaded with HQ
                    atmosphereLayer.material.needsUpdate = true;
                }
            } else if (atmosphereLayer) {
                // Remove atmosphere layer if it exists and shouldn't be shown
                venus.remove(atmosphereLayer);
                if (atmosphereLayer.material) atmosphereLayer.material.dispose();
                if (atmosphereLayer.geometry) atmosphereLayer.geometry.dispose();
            }
        }
        else if (planetName === 'Saturn') {
            // Find Saturn in the celestial objects
            const saturn = planet.bodyObject;
            const options = window._textureOptions.Saturn;
            
            // Handle rings
            let rings = saturn.getObjectByName('Saturn_rings');
            
            if (options.showRings) {
                if (!rings) {
                    // Real Saturn ring radii (A+B): inner ~67,000 km, outer ~140,000 km
                    const ringInnerRadius = 67000 * RADIUS_SCALE;
                    const ringOuterRadius = 140000 * RADIUS_SCALE;
                    // Custom UV mapping for annular texture
                    const segments = 128;
                    const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, segments);
                    // Fix UVs: map annularly
                    const uv = ringGeometry.attributes.uv;
                    for (let i = 0; i < uv.count; i++) {
                        const x = ringGeometry.attributes.position.getX(i);
                        const y = ringGeometry.attributes.position.getY(i);
                        const r = Math.sqrt(x * x + y * y);
                        // 0 at inner, 1 at outer
                        uv.setXY(i, (r - ringInnerRadius) / (ringOuterRadius - ringInnerRadius), 1);
                    }
                    ringGeometry.attributes.uv.needsUpdate = true;
                    const ringMaterial = new THREE.MeshBasicMaterial({ 
                        map: textureLoader.load(getTexture(TEXTURES.SaturnRings)),
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: options.ringOpacity,
                        depthWrite: false 
                    });
                    rings = new THREE.Mesh(ringGeometry, ringMaterial);
                    rings.name = 'Saturn_rings';
                    rings.rotation.x = Math.PI / 2;
                    saturn.add(rings);
                } else {
                    rings.material.opacity = options.ringOpacity;
                    rings.material.needsUpdate = true;
                }
            } else if (rings) {
                saturn.remove(rings);
                if (rings.material) rings.material.dispose();
                if (rings.geometry) rings.geometry.dispose();
            }
        }
        else if (planetName === 'Phobos' || planetName === 'Deimos') {
            const body = planet.bodyObject;
            const options = window._textureOptions[planetName];
            const topoTextureName = planetName === 'Phobos' ? 'PhobosTopography' : 'DeimosTopography';
            
            // Base texture (already set in createCelestialBody, but ensure it's using loadTextureHQ if not already)
            // body.material.map = loadTextureHQ(getTexture(TEXTURES[planetName]));
            // body.material.needsUpdate = true; // If base texture can change, otherwise not needed here.

            let topographyLayer = body.getObjectByName(`${planetName}_topography`);
            if (options.showTopography) {
                const topoTextureUrl = getTexture(TEXTURES[topoTextureName]);
                if (topoTextureUrl) {
                    if (!topographyLayer) {
                        const topoGeometry = new THREE.SphereGeometry(
                            body.geometry.parameters.radius * 1.005, // Slightly larger for overlay
                            body.geometry.parameters.widthSegments, 
                            body.geometry.parameters.heightSegments
                        );
                        const topoMaterial = new THREE.MeshStandardMaterial({
                            map: loadTextureHQ(topoTextureUrl),
                            transparent: true,
                            opacity: options.topographyOpacity,
                            depthWrite: false
                        });
                        topographyLayer = new THREE.Mesh(topoGeometry, topoMaterial);
                        topographyLayer.name = `${planetName}_topography`;
                        body.add(topographyLayer);
                    } else {
                        topographyLayer.material.opacity = options.topographyOpacity;
                        topographyLayer.material.map = loadTextureHQ(topoTextureUrl); // Re-assign map in case it needs update
                        topographyLayer.material.needsUpdate = true;
                    }
                } else {
                    console.warn(`Topography texture for ${planetName} not found.`);
                    if (topographyLayer) { // Remove if texture is missing but layer exists
                        body.remove(topographyLayer);
                        if (topographyLayer.material) topographyLayer.material.dispose();
                        if (topographyLayer.geometry) topographyLayer.geometry.dispose();
                    }
                }
            } else if (topographyLayer) {
                body.remove(topographyLayer);
                if (topographyLayer.material) topographyLayer.material.dispose();
                if (topographyLayer.geometry) topographyLayer.geometry.dispose();
            }
        }
    }

    // Create telemetry panel
    createTelemetryPanel();
    
    // Camera focus logic
    function focusOnPlanet(planetName) {
        const obj = celestialObjects.find(o => o.name === planetName);
        if (!obj) return;
        
        window._focusedPlanetName = planetName;
        
        // Show appropriate texture options for this planet
        updatePlanetOptionsUI(planetName);
        
        // Update telemetry with current focused object
        window.updateTelemetry(obj);
        
        // Get world position of the planet
        const worldPos = new THREE.Vector3();
        obj.bodyObject.getWorldPosition(worldPos);
        
        // Set the orbit controls target to the planet
        controls.target.copy(worldPos);
        
        // Position the camera at a good initial viewing distance
        const scaledRadius = obj.bodyObject.geometry.parameters.radius * obj.bodyObject.scale.x;
        const distanceFactor = 5 + (obj.name === "Sun" ? 2 : 0); // Slightly further for the Sun
        const cameraDistance = scaledRadius * distanceFactor;
        
        // Adjust minimum zoom distance based on object size
        // For small moons like Phobos, allow much closer approach
        const minZoomDistance = Math.max(0.1, scaledRadius * 1.2);
        controls.minDistance = minZoomDistance;
        
        // Calculate initial camera position - slightly above and to the side of the planet
        const cameraOffset = new THREE.Vector3(cameraDistance, cameraDistance * 0.5, cameraDistance);
        const newCameraPosition = worldPos.clone().add(cameraOffset);
        
        // Set the camera position and look at the planet
        camera.position.copy(newCameraPosition);
        camera.lookAt(worldPos);
        
        // Store the relative position between camera and planet for orbit following
        lastPlanetPosition.copy(worldPos);
        cameraRelativePosition.copy(camera.position).sub(worldPos);
        
        // Update the focused object's label
        const label = obj.bodyObject.getObjectByName(`${obj.name}_label`);
        if (label && label.updateLabelContent) {
            label.updateLabelContent();
        }
        // Update last focus change timestamp
        lastFocusChangeTimestamp = Date.now();
    }

    planetSelect.addEventListener('change', e => {
        focusOnPlanet(e.target.value);
    });

    // Size scale logic (for all planets except Sun)
    let currentSizeScale = 1;
    sizeScaleInput.addEventListener('input', e => {
        currentSizeScale = parseFloat(e.target.value);
        celestialObjects.forEach(obj => {
            if (!obj.isStar) {
                obj.bodyObject.scale.set(currentSizeScale, currentSizeScale, currentSizeScale);
            }
        });
    });

    // Sun size scale logic
    let currentSunScale = 0.1;
    function setSunScale(scale) {
        celestialObjects.forEach(obj => {
            if (obj.isStar) {
                obj.bodyObject.scale.set(scale, scale, scale);
            }
        });
    }
    setSunScale(currentSunScale); // Default Sun scale
    sunSizeScaleInput.addEventListener('input', e => {
        currentSunScale = parseFloat(e.target.value);
        setSunScale(currentSunScale);
    });

    // Create the orbital telemetry panel
    function createTelemetryPanel() {
        // Create a floating panel for real-time orbital data
        const panel = document.createElement('div');
        panel.id = 'orbital-telemetry';
        panel.className = 'glass-panel telemetry-panel';
        panel.style.display = 'none'; // Initially hidden
        
        // Create header
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.textContent = 'Orbital Telemetry';
        panel.appendChild(header);
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'telemetry-content';
        panel.appendChild(content);
        
        // Add panel to document
        document.body.appendChild(panel);
        
        // Function to update telemetry data
        window.updateTelemetry = function(object) {
            const panel = document.getElementById('orbital-telemetry');
            if (!uiSettings.showTelemetry || !panel) {
                if (panel) panel.style.display = 'none';
                return;
            }
            panel.style.display = 'block';
            const content = panel.querySelector('.telemetry-content');
            content.innerHTML = '';
            // Simulation time
            const simTimeDiv = document.createElement('div');
            simTimeDiv.className = 'telemetry-row';
            simTimeDiv.innerHTML = `<div class='telemetry-label'>Sim Time</div><div class='telemetry-value'>${formatNumber(simulationDaysElapsed)} days (${(simulationDaysElapsed/365.25).toFixed(2)} yr)</div>`;
            content.appendChild(simTimeDiv);
            // Elapsed wall time
            const wallElapsed = ((Date.now() - simulationStartTimestamp) / 1000).toFixed(1);
            const wallDiv = document.createElement('div');
            wallDiv.className = 'telemetry-row';
            wallDiv.innerHTML = `<div class='telemetry-label'>Wall Time</div><div class='telemetry-value'>${wallElapsed} sec</div>`;
            content.appendChild(wallDiv);
            // Elapsed since focus change
            const focusElapsed = ((Date.now() - lastFocusChangeTimestamp) / 1000).toFixed(1);
            const focusDiv = document.createElement('div');
            focusDiv.className = 'telemetry-row';
            focusDiv.innerHTML = `<div class='telemetry-label'>Since Focus</div><div class='telemetry-value'>${focusElapsed} sec</div>`;
            content.appendChild(focusDiv);
            // Object-specific telemetry
            if (!object) {
                content.innerHTML += '<div class="telemetry-message">Select a planet or moon to view orbital data</div>';
                return;
            }
            // Object name header
            const nameHeader = document.createElement('div');
            nameHeader.className = 'telemetry-name';
            nameHeader.textContent = object.name;
            content.appendChild(nameHeader);
            // Orbital parameters section
            if (object.orbitalProperties) {
                // Safely access potentially undefined properties with fallbacks or checks.
                const currentMeanAnomalyDeg = object.currentMeanAnomaly !== undefined ? (object.currentMeanAnomaly * 180 / Math.PI).toFixed(2) : 'N/A';
                addTelemetryRow(content, 'Mean Anomaly', `${currentMeanAnomalyDeg}°`);
                
                const trueAnomalyDeg = object.trueAnomaly !== undefined ? (object.trueAnomaly * 180 / Math.PI).toFixed(2) : 'N/A';
                addTelemetryRow(content, 'True Anomaly', `${trueAnomalyDeg}°`);
                
                let orbitPercentage = 'N/A';
                if (object.trueAnomaly !== undefined) {
                    const normalizedTrueAnomaly = object.trueAnomaly < 0 ? object.trueAnomaly + 2 * Math.PI : object.trueAnomaly;
                    orbitPercentage = (normalizedTrueAnomaly / (2 * Math.PI) * 100).toFixed(1);
                }
                addTelemetryRow(content, 'Orbit % (periapsis)', `${orbitPercentage}%`);
                
                addTelemetryRow(content, 'Total Orbits', `${object.orbitCount || 0}`);
                addTelemetryRow(content, 'Orbital Speed', object.orbitalSpeed !== undefined ? `${formatNumber(object.orbitalSpeed)} km/s` : 'N/A');

                // Distance from Parent / Sun logic (already fairly robust, but ensure properties exist)
                let distanceFromParentText = 'N/A';
                if (object.isMoon && object.orbitsAround) {
                    const parentObj = celestialObjects.find(p => p.name === object.orbitsAround);
                    if (parentObj && parentObj.bodyObject && object.bodyObject) { // Check bodyObjects
                        // ... (distance calculation as before)
                        const distVec = new THREE.Vector3();
                        object.bodyObject.getWorldPosition(distVec);
                        const parentPos = new THREE.Vector3();
                        parentObj.bodyObject.getWorldPosition(parentPos);
                        const unscaledDistanceToParent = distVec.distanceTo(parentPos);
                        const distToParentKm = unscaledDistanceToParent / (object.isMoon ? MOON_DISTANCE_SCALE : DISTANCE_SCALE);
                        distanceFromParentText = `${formatNumber(distToParentKm)} km from ${object.orbitsAround}`;
                    }
                } else if (!object.isStar && object.bodyObject) { // Check bodyObject for planet
                    const sunObj = celestialObjects.find(p => p.isStar && p.bodyObject); // Check bodyObject for sun
                    if (sunObj) {
                        // ... (distance calculation as before)
                        const distVec = new THREE.Vector3();
                        object.bodyObject.getWorldPosition(distVec);
                        const sunPos = new THREE.Vector3();
                        sunObj.bodyObject.getWorldPosition(sunPos);
                        const unscaledDistanceToSun = distVec.distanceTo(sunPos);
                        const distToSunKm = unscaledDistanceToSun / DISTANCE_SCALE;
                        distanceFromParentText = `${formatNumber(distToSunKm / AU)} AU from Sun`;
                    }
                }
                addTelemetryRow(content, 'Current Distance', distanceFromParentText);

                // Orbital Elements (props should be safe if object.orbitalProperties exists)
                const props = object.orbitalProperties;
                addTelemetryRow(content, 'Orbital Period', `${formatNumber(props.period)} days`); // Moved from top for grouping
                // ... (rest of orbital elements: semi-major axis, eccentricity, etc.)
                // ... (rotational info and simulation time scale) ...
            } else {
                content.innerHTML += '<div class="telemetry-message">No orbital data available for this object</div>';
            }
        };
        
        return panel;
    }

    function addTelemetryRow(container, label, value) {
        const row = document.createElement('div');
        row.className = 'telemetry-row';
        
        const labelElem = document.createElement('div');
        labelElem.className = 'telemetry-label';
        labelElem.textContent = label;
        
        const valueElem = document.createElement('div');
        valueElem.className = 'telemetry-value';
        valueElem.textContent = value;
        
        row.appendChild(labelElem);
        row.appendChild(valueElem);
        container.appendChild(row);
    }

    // ... (rest of the function content remains unchanged)
});

// --- END UI Panel Logic ---

// --- Starship and RPG Mode Foundation ---
let isStarshipMode = false;
let starship; // This will be a THREE.Group
let starshipCameraRig = null; // Camera rig for starship mode
let cameraOriginalParent = null; // To restore camera parent on exit

// Starship Physics & Control Properties
const starshipProperties = {
    velocity: new THREE.Vector3(),
    acceleration: new THREE.Vector3(),
    angularVelocity: new THREE.Vector3(),
    // Inputs - these will typically be -1, 0, or 1
    inputUp: 0,        // W
    inputDown: 0,      // S
    inputLeft: 0,      // A
    inputRight: 0,     // D
    inputRollLeft: 0,  // Q
    inputRollRight: 0, // E
    throttle: 0,       // Up/Down arrows, range -1 (full reverse) to 1 (full forward)
    inputPitch: 0,     // Mouse Y
    inputYaw: 0,       // Mouse X
    maxSpeed: 25000,
    maxRotationSpeed: Math.PI,
    mass: 1000, // kg-equivalent for scaling forces
    rampRate: 3, // seconds to full thrust for smoother response
    // Thrust accumulators for gradual response
    tgtThrustY: 0,
    tgtThrustX: 0,
    tgtThrustZ: 0,
    currThrustY: 0,
    currThrustX: 0,
    currThrustZ: 0,
    // New Ship Systems Properties
    maxShields: 1000,
    shields: 1000,
    maxHull: 500,
    hull: 500,
    powerLevel: 100, // Percentage or numeric value
    autopilotEngaged: false,
    currentTargetIndex: -1, // -1 means no target
    camOffsetY: 60, // Default, will be updated by model load
    camOffsetZ: 120 // Default, will be updated by model load
};

// Starship Physics Constants
const LIN_MAIN_THRUST = 20000.0;        // Stronger main thrust
const LIN_MANEUV_THRUST = 10000.0;      // Stronger maneuvering thrust
const TORQUE_PITCH = 10.0; // Reduced sensitivity
const TORQUE_YAW = 10.0;   // Reduced sensitivity
const TORQUE_ROLL = 7.5;   // Reduced sensitivity
const TRANSLATIONAL_TO_PITCH_TORQUE = 1.0; // Reduced effect
const TRANSLATIONAL_TO_YAW_TORQUE = 1.0;   // Reduced effect
const LINEAR_DAMPING = 0.995;          // Reduced damping for more drift
const ANGULAR_DAMPING = 0.97; // Reduced for more rotational inertia/drift
const MOUSE_SENSITIVITY = 0.0025; // Reduced sensitivity
const THRUST_RAMP_RATE = 0.08;        // Slower thrust buildup

// Autopilot Constants
const AUTOPILOT_STEERING_AGGRESSION = 0.6; 
const AUTOPILOT_THROTTLE_ENGAGED = 0.7;    // Throttle when aligned and moving to target
const AUTOPILOT_THROTTLE_ALIGNING = 0.05;   // Throttle when needing to turn significantly (Reduced from 0.2)

// Camera: Define the local offset from the starship
const STARSHIP_CAMERA_LOCAL_OFFSET = new THREE.Vector3(0, 45, 120); // Increased Y a bit for console clearance
const STARSHIP_CAMERA_LOOKAHEAD_LOCAL = new THREE.Vector3(0, 5, -200); // Point to look at, in front of ship
const CAMERA_LAG_FACTOR_BASE = 0.15; // Slightly increased lag for smoothness
const CAMERA_LAG_FACTOR_SPEED_SCALE = 0.0001; // How much additional lag reduction per unit of ship speed
const CAMERA_SNAP_THRESHOLD_BASE = 80; // Base distance for camera snap, reduced from 150
const CAMERA_SNAP_THRESHOLD_SPEED_SCALE = 0.2; // How much the snap threshold increases with speed

let isMouseDown = false; // For mouse-look control
let logThrottleCounter = 0;
const LOG_THROTTLE_INTERVAL = 60; // Log every 60 frames

// Legacy starshipUiPanel removed

// Create starship group and mesh (remains mostly the same)
starship = new THREE.Group();
starship.name = "StarshipGroup";
// const starshipMeshGeometry = new THREE.CapsuleGeometry(10, 40, 4, 16); // More ship-like
// const starshipMeshMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: false });
// const starshipMesh = new THREE.Mesh(starshipMeshGeometry, starshipMeshMaterial);
// starshipMesh.rotation.x = Math.PI / 2; // Point capsule nose forward (along Group's +Z)
// starship.add(starshipMesh);

// const axesHelper = new THREE.AxesHelper(50); // Helper to see starship orientation
// starship.add(axesHelper);

starship.position.set(0, 100, 3000); // Initial position, can be anywhere
scene.add(starship);

// Event listeners for starship controls and mode toggle
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        isStarshipMode = !isStarshipMode;
        const solarUiPanel = document.getElementById('solar-ui-panel');

        if (isStarshipMode) {
            console.log("Starship mode activated: Controls: W/S/A/D, Space/Ctrl, Q/E, Mouse for Pitch/Yaw");
            controls.enabled = false;
            if (solarUiPanel) solarUiPanel.style.display = 'none';
            setHUDVisible(true);
            window._focusedPlanetName = null; // Clear planet focus

            // --- Camera Rig Setup ---
            if (!starshipCameraRig) {
                starshipCameraRig = new THREE.Object3D();
                scene.add(starshipCameraRig);
            }
            // Store original parent to restore later
            if (!cameraOriginalParent) cameraOriginalParent = camera.parent;
            // Parent camera to rig
            starshipCameraRig.add(camera);
            // Camera is always at stored offset in rig local space
            const offsetY = starshipProperties.camOffsetY || STARSHIP_CAMERA_LOCAL_OFFSET.y;
            const offsetZ = starshipProperties.camOffsetZ || STARSHIP_CAMERA_LOCAL_OFFSET.z;
            camera.position.set(0, offsetY, offsetZ);
            camera.lookAt(new THREE.Vector3(0, 0, -100)); // Look forward in local rig space
            camera.up.set(0, 1, 0);

        } else {
            console.log("Starship mode deactivated");
            controls.enabled = true;
            starshipProperties.inputPitch = 0;
            starshipProperties.inputYaw = 0;
            if (solarUiPanel) solarUiPanel.style.display = 'block';
            setHUDVisible(false);
            const lastFocused = window._focusedPlanetName || "Sun";
            const planetSelect = document.getElementById('planet-select');
            if (planetSelect) {
                planetSelect.value = lastFocused;
                const event = new Event('change', { bubbles: true });
                planetSelect.dispatchEvent(event);
            }
            // --- Restore camera parent ---
            if (starshipCameraRig && camera.parent === starshipCameraRig && cameraOriginalParent) {
                cameraOriginalParent.add(camera);
                camera.position.set(0, 0, 0); // Reset position (will be set by simulation mode)
            }
        }
    }

    if (isStarshipMode) {
        switch(e.key.toLowerCase()) {
            case 'w': starshipProperties.inputUp = 1; break;
            case 's': starshipProperties.inputDown = 1; break;
            case 'a': starshipProperties.inputLeft = 1; break;
            case 'd': starshipProperties.inputRight = 1; break;
            case 'q': starshipProperties.inputRollLeft = 1; break;
            case 'e': starshipProperties.inputRollRight = 1; break;
            case 't': 
                if (e.shiftKey) selectPreviousTarget();
                else selectNextTarget();
                break;
            case 'p': 
                // starshipProperties.autopilotEngaged = !starshipProperties.autopilotEngaged;
                // console.log("Autopilot: " + (starshipProperties.autopilotEngaged ? "ENGAGED" : "DISENGAGED"));
                if (starshipProperties.currentTargetIndex === -1 && !starshipProperties.autopilotEngaged) {
                    showFloatingFeedback("No target selected for autopilot!", "#ffcc00");
                } else {
                    starshipProperties.autopilotEngaged = !starshipProperties.autopilotEngaged;
                    if (starshipProperties.autopilotEngaged) {
                        const targetName = (starshipProperties.currentTargetIndex !== -1 && celestialObjects[starshipProperties.currentTargetIndex]) ? celestialObjects[starshipProperties.currentTargetIndex].name : "Unknown Target";
                        showFloatingFeedback("Autopilot Engaged: " + targetName, "#33ff66");
                        console.log("Autopilot Engaged, Target: " + targetName);
                    } else {
                        showFloatingFeedback("Autopilot Disengaged", "#ffaa33");
                        // Reset autopilot-driven inputs if disengaging manually
                        starshipProperties.inputPitch = 0;
                        starshipProperties.inputYaw = 0;
                        // starshipProperties.throttle = 0; // Optional: reset throttle on manual disengage
                        console.log("Autopilot Disengaged manually");
                    }
                }
                break;
            // Integrate K and L for damage/repair here
            case 'k':
                applyDamage(100);
                break;
            case 'l':
                repair(100);
                break;
        }
        // Throttle (arrow keys)
        if (e.key === 'ArrowUp') {
            starshipProperties.throttle = Math.min(1, starshipProperties.throttle + 0.05);
        }
        if (e.key === 'ArrowDown') {
            starshipProperties.throttle = Math.max(-1, starshipProperties.throttle - 0.05);
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (isStarshipMode) {
        switch(e.key.toLowerCase()) {
            case 'w': starshipProperties.inputUp = 0; break;
            case 's': starshipProperties.inputDown = 0; break;
            case 'a': starshipProperties.inputLeft = 0; break;
            case 'd': starshipProperties.inputRight = 0; break;
            case 'q': starshipProperties.inputRollLeft = 0; break;
            case 'e': starshipProperties.inputRollRight = 0; break;
        }
    }
});

renderer.domElement.addEventListener('mousedown', (e) => {
    if (isStarshipMode && e.button === 0) { 
        isMouseDown = true;
        // renderer.domElement.requestPointerLock(); // Optional: for more immersive mouse control
    }
});

document.addEventListener('mouseup', (e) => { 
    if (e.button === 0) { // Always release on left mouse button up, regardless of mode
        isMouseDown = false;
        if (isStarshipMode) {
             starshipProperties.inputPitch = 0; // Stop pitching/yawing when mouse is released
             starshipProperties.inputYaw = 0;
        }
        // document.exitPointerLock(); // Optional
    }
});

renderer.domElement.addEventListener('mousemove', (e) => {
    if (isStarshipMode && isMouseDown) {
        const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
        starshipProperties.inputYaw = -movementX * MOUSE_SENSITIVITY;
        starshipProperties.inputPitch = -movementY * MOUSE_SENSITIVITY;
    } else if (isStarshipMode) { // If not mouse down, ensure pitch/yaw inputs are zero
        starshipProperties.inputPitch = 0;
        starshipProperties.inputYaw = 0;
    }
});


// The following line starts the animation loop
animate();

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); 
    const simulationTimeDeltaDays = delta * simulationSpeedFactor * simSettings.timeScale;
    simulationDaysElapsed += simulationTimeDeltaDays;

    if (isStarshipMode) {
        const { velocity, acceleration, 
                inputUp, inputDown, inputLeft, inputRight, inputRollLeft, inputRollRight, throttle, inputPitch, inputYaw, 
                maxSpeed, maxRotationSpeed } = starshipProperties;

        // --- Autopilot Logic ---
        if (starshipProperties.autopilotEngaged && starshipProperties.currentTargetIndex !== -1) {
            const targetObject = celestialObjects[starshipProperties.currentTargetIndex];

            if (targetObject && targetObject.bodyObject) {
                // Get current positions and vectors
                const targetPosition = new THREE.Vector3();
                targetObject.bodyObject.getWorldPosition(targetPosition);
                const starshipPosition = starship.position.clone();
                const distanceToTarget = starshipPosition.distanceTo(targetPosition);
                
                // Target sizing for approach calculations
                let targetScaledRadius = 10; // Default
                if (targetObject.bodyObject.geometry && targetObject.bodyObject.geometry.parameters) {
                    targetScaledRadius = targetObject.bodyObject.geometry.parameters.radius * 
                                        (targetObject.bodyObject.scale.x || 1.0);
                }
                
                // Calculate vectors and orientation data
                const directionToTargetWorld = targetPosition.clone().sub(starshipPosition).normalize();
                const shipForwardWorld = new THREE.Vector3(0,0,-1).applyQuaternion(starship.quaternion);
                const dotTargetDirection = shipForwardWorld.dot(directionToTargetWorld);
                const angleToTarget = Math.acos(Math.min(1, Math.max(-1, dotTargetDirection))) * (180/Math.PI);
                
                // Calculate ship speed
                const currentSpeed = starshipProperties.velocity.length();
                const closingSpeed = -starshipProperties.velocity.dot(directionToTargetWorld);
                
                // State Machine Variables
                if (!starshipProperties.flightPhase) {
                    starshipProperties.flightPhase = 'ALIGN';
                    starshipProperties.flightPhaseTimer = 0;
                    starshipProperties.lastFrameTime = Date.now();
                }
                
                // Calculate fixed time step for physics (avoid frame rate dependency)
                const now = Date.now();
                const msElapsed = now - starshipProperties.lastFrameTime;
                const fixedDelta = Math.min(0.016, msElapsed / 1000); // Cap at 16ms for stability
                starshipProperties.lastFrameTime = now;
                
                // State machine for flight phases
                const arrivalDistance = Math.max(targetScaledRadius * 2.5 + 75, 120);
                switch(starshipProperties.flightPhase) {
                    case 'ALIGN':
                        // Only align attitude, no main thrust
                        alignToTarget();
                        
                        // If we're reasonably aligned, switch to acceleration
                        if (angleToTarget < 15 && starshipProperties.angularVelocity.lengthSq() < 0.01) {
                            starshipProperties.flightPhase = 'ACCELERATE';
                            console.log("Autopilot: Aligned, beginning acceleration");
                        }
                        break;
                        
                    case 'ACCELERATE':
                        // Keep alignment during acceleration
                        alignToTarget();
                        
                        // Calculate stopping distance based on current speed (v²/2a)
                        const decelDistanceNeeded = (currentSpeed * currentSpeed) / (2 * (LIN_MAIN_THRUST / starshipProperties.mass));
                        const timeToTarget = distanceToTarget / Math.max(currentSpeed, 10);
                        
                        // If we need to start stopping, or going too fast, switch to deceleration
                        if (distanceToTarget < decelDistanceNeeded * 1.2 || 
                            currentSpeed > 45 ||
                            (angleToTarget > 20 && currentSpeed > 25)) {
                            starshipProperties.flightPhase = 'DECELERATE';
                            console.log("Autopilot: Starting deceleration, distance: " + distanceToTarget.toFixed(0));
                        } else {
                            // Apply smooth throttle ramp-up
                            starshipProperties.throttle = Math.min(0.7, starshipProperties.throttle + THRUST_RAMP_RATE);
                        }
                        break;
                        
                    case 'DECELERATE':
                        // Continue alignment
                        alignToTarget();
                        
                        // If we're close, switch to final approach
                        if (distanceToTarget < arrivalDistance * 1.2) {
                            starshipProperties.flightPhase = 'APPROACH';
                            console.log("Autopilot: Final approach, distance: " + distanceToTarget.toFixed(0));
                        } else {
                            // Apply smooth throttle management based on distance and closing speed
                            const idealClosingSpeed = Math.min(35, distanceToTarget * 0.1);
                            const speedError = closingSpeed - idealClosingSpeed;
                            
                            if (speedError > 5) {
                                // Too fast - brake more
                                starshipProperties.throttle = Math.max(-0.4, starshipProperties.throttle - THRUST_RAMP_RATE * 0.5);
                            } else if (speedError < -5) {
                                // Too slow - accelerate more
                                starshipProperties.throttle = Math.min(0.6, starshipProperties.throttle + THRUST_RAMP_RATE * 0.5);
                            } else {
                                // Maintain speed
                                starshipProperties.throttle *= 0.95; // Gentle decay if near ideal
                            }
                        }
                        break;
                        
                    case 'APPROACH':
                        // Keep alignment for approach
                        alignToTarget();
                        
                        // Arrival check
                        if (currentSpeed < 5 && distanceToTarget < arrivalDistance * 0.8) {
                            // Successful arrival
                            starshipProperties.throttle = 0;
                            starshipProperties.autopilotEngaged = false;
                            starshipProperties.inputYaw = 0;
                            starshipProperties.inputPitch = 0;
                            showFloatingFeedback('Autopilot: Arrived at ' + targetObject.name, '#33ccff');
                            console.log("Autopilot: Arrived at " + targetObject.name);
                            break;
                        }
                        
                        // Final approach - slow down proportionally to distance
                        const desiredApproachSpeed = Math.min(15, distanceToTarget * 0.3);
                        const approachSpeedError = currentSpeed - desiredApproachSpeed;
                        
                        if (approachSpeedError > 3) {
                            // Too fast - brake more
                            starshipProperties.throttle = Math.max(-0.2, starshipProperties.throttle - THRUST_RAMP_RATE * 0.4);
                        } else if (approachSpeedError < -3 && angleToTarget < 20) {
                            // Too slow - gentle acceleration, only if well aligned
                            starshipProperties.throttle = Math.min(0.3, starshipProperties.throttle + THRUST_RAMP_RATE * 0.2);
                        } else {
                            // Near ideal speed
                            starshipProperties.throttle *= 0.9;
                        }
                        break;
                        
                    default:
                        // Reset to ALIGN if we somehow get an invalid state
                        starshipProperties.flightPhase = 'ALIGN';
                }
                
                // Helper function for alignment with damping
                function alignToTarget() {
                    const targetDirectionInShipLocal = starship.worldToLocal(targetPosition.clone()).normalize();
                    let yawError = targetDirectionInShipLocal.x;
                    let pitchError = targetDirectionInShipLocal.y;
                    
                    // Smooth out very small errors
                    const errorThreshold = 0.1;
                    if (Math.abs(yawError) < errorThreshold) {
                        yawError *= (Math.abs(yawError) / errorThreshold);
                    }
                    if (Math.abs(pitchError) < errorThreshold) {
                        pitchError *= (Math.abs(pitchError) / errorThreshold);
                    }
                    
                    // Dynamic steering aggression based on alignment
                    let dynamicSteeringAggression = AUTOPILOT_STEERING_AGGRESSION;
                    const alignmentThresholdForReducedAggression = 0.7;
                    const minAggressionFactorWhenAligned = 0.2;
                    
                    if (dotTargetDirection > alignmentThresholdForReducedAggression) {
                        const alignmentProgress = Math.max(0, Math.min(1, 
                            (dotTargetDirection - alignmentThresholdForReducedAggression) / 
                            (1.0 - alignmentThresholdForReducedAggression)
                        ));
                        const aggressionScale = 1.0 - alignmentProgress * (1.0 - minAggressionFactorWhenAligned);
                        dynamicSteeringAggression = AUTOPILOT_STEERING_AGGRESSION * 
                            Math.max(minAggressionFactorWhenAligned, aggressionScale);
                    }
                    
                    // Apply anti-oscillation damping based on current angular velocity
                    const yawDamping = starshipProperties.angularVelocity.y * 0.7;
                    const pitchDamping = starshipProperties.angularVelocity.x * 0.7;
                    
                    // Final steering inputs with damping
                    const yawCorrection = THREE.MathUtils.clamp(yawError - yawDamping, -1.0, 1.0);
                    const pitchCorrection = THREE.MathUtils.clamp(pitchError - pitchDamping, -1.0, 1.0);
                    
                    starshipProperties.inputYaw = yawCorrection * dynamicSteeringAggression;
                    starshipProperties.inputPitch = pitchCorrection * dynamicSteeringAggression;
                }
            } else {
                // Invalid target - disengage autopilot
                starshipProperties.autopilotEngaged = false;
                starshipProperties.throttle = 0;
                showFloatingFeedback('Autopilot: Target invalid, disengaging.', '#ff3333');
            }
        } else if (!starshipProperties.autopilotEngaged) {
            // Reset flight phase when autopilot is off
            starshipProperties.flightPhase = null;
        }

        // --- Thrust Accumulator System ---
        // Set target thrust values based on inputs
        starshipProperties.tgtThrustY = (inputUp - inputDown);
        starshipProperties.tgtThrustX = (inputRight - inputLeft);
        starshipProperties.tgtThrustZ = throttle;

        // Gradually approach target thrust (smooths response)
        starshipProperties.currThrustY += (starshipProperties.tgtThrustY - starshipProperties.currThrustY) * THRUST_RAMP_RATE;
        starshipProperties.currThrustX += (starshipProperties.tgtThrustX - starshipProperties.currThrustX) * THRUST_RAMP_RATE;
        starshipProperties.currThrustZ += (starshipProperties.tgtThrustZ - starshipProperties.currThrustZ) * THRUST_RAMP_RATE;

        // Apply thrusts with proper scaling
        acceleration.set(0, 0, 0);
        // Up/Down (local Y)
        acceleration.y += starshipProperties.currThrustY * LIN_MANEUV_THRUST;
        // Left/Right (local X)
        acceleration.x += starshipProperties.currThrustX * LIN_MANEUV_THRUST;
        // Forward/Reverse (local -Z/+Z)
        acceleration.z += -starshipProperties.currThrustZ * LIN_MAIN_THRUST;

        // Transform local forces to world space
        const worldForce = acceleration.clone().applyQuaternion(starship.quaternion);
        velocity.add(worldForce.divideScalar(starshipProperties.mass).multiplyScalar(delta));
        
        // Apply damping
        velocity.multiplyScalar(Math.pow(LINEAR_DAMPING, delta * 60));
        
        // Limit maximum speed
        if (velocity.lengthSq() > maxSpeed * maxSpeed) {
            velocity.normalize().multiplyScalar(maxSpeed);
        }
        
        // Apply velocity to position
        starship.position.add(velocity.clone().multiplyScalar(delta));

        // --- Rotational Physics ---
        const localAngularAcceleration = new THREE.Vector3();
        
        // Apply input forces for direct pitch/yaw/roll (mouse and Q/E)
        localAngularAcceleration.x = inputPitch * TORQUE_PITCH; 
        localAngularAcceleration.y = inputYaw * TORQUE_YAW;
        localAngularAcceleration.z = (inputRollRight - inputRollLeft) * TORQUE_ROLL;

        // Add torque from translational thrusters (W/S/A/D affecting orientation)
        localAngularAcceleration.x += starshipProperties.currThrustY * TRANSLATIONAL_TO_PITCH_TORQUE; // Up/Down thrust pitches nose
        localAngularAcceleration.y -= starshipProperties.currThrustX * TRANSLATIONAL_TO_YAW_TORQUE;   // Left/Right thrust yaws nose (reversed)
        
        // Initialize angular velocity if not present
        if (!starshipProperties.angularVelocity) starshipProperties.angularVelocity = new THREE.Vector3();
        
        // Add angular acceleration to velocity
        starshipProperties.angularVelocity.add(localAngularAcceleration.multiplyScalar(delta));
        
        // Apply damping to angular velocity
        starshipProperties.angularVelocity.multiplyScalar(Math.pow(ANGULAR_DAMPING, delta * 60));
        
        // Clamp maximum rotation rates
        starshipProperties.angularVelocity.x = THREE.MathUtils.clamp(
            starshipProperties.angularVelocity.x, 
            -maxRotationSpeed, 
            maxRotationSpeed
        );
        starshipProperties.angularVelocity.y = THREE.MathUtils.clamp(
            starshipProperties.angularVelocity.y, 
            -maxRotationSpeed, 
            maxRotationSpeed
        );
        starshipProperties.angularVelocity.z = THREE.MathUtils.clamp(
            starshipProperties.angularVelocity.z, 
            -maxRotationSpeed, 
            maxRotationSpeed
        );
        
        // Apply rotation if there's any angular velocity
        if (starshipProperties.angularVelocity.lengthSq() > 0.000001) {
            const deltaQuaternion = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                    starshipProperties.angularVelocity.x * delta, 
                    starshipProperties.angularVelocity.y * delta, 
                    starshipProperties.angularVelocity.z * delta, 
                    'YXZ'
                )
            );
            starship.quaternion.multiply(deltaQuaternion);
            starship.quaternion.normalize();
        }

        // Ensure starship's world matrix is updated before camera rig targets it
        starship.updateMatrixWorld(true);

        // --- Camera Rig Movement ---
        if (starshipCameraRig) {
            // Get ship's current position and orientation
            const targetPos = new THREE.Vector3();
            starship.getWorldPosition(targetPos);
            const targetQuat = new THREE.Quaternion();
            starship.getWorldQuaternion(targetQuat);
            
            // Calculate adaptive lag factor based on ship speed
            const currentSpeed = velocity.length();
            const dynamicLagFactor = Math.min(0.25, CAMERA_LAG_FACTOR_BASE + (currentSpeed * CAMERA_LAG_FACTOR_SPEED_SCALE));
            
            // Smooth follow with inertia - more responsive at higher speeds
            // Apply a fixed delta for position lerping to reduce judder related to frame time variations
            const positionLerpFactor = Math.min(1, dynamicLagFactor * (delta * 60)); // assuming 60fps target for delta scaling
            starshipCameraRig.position.lerp(targetPos, positionLerpFactor);
            
            // Calculate frame-rate independent slerp factor for rotation
            const rotationSlerpFactor = Math.min(1, (dynamicLagFactor * 0.75) * (delta * 60));
            starshipCameraRig.quaternion.slerp(targetQuat, rotationSlerpFactor); 

            // Force update of the rig's world matrix so camera calculations use the latest state
            starshipCameraRig.updateMatrixWorld(true);
            
            // Calculate distance between camera rig and ship
            const distanceToShip = starshipCameraRig.position.distanceTo(targetPos);
            
            // Dynamic snap threshold based on speed
            const dynamicSnapThreshold = CAMERA_SNAP_THRESHOLD_BASE + (currentSpeed * CAMERA_SNAP_THRESHOLD_SPEED_SCALE);
            
            // Prevent excessive camera lag (snap if too far) - scales with speed
            if (distanceToShip > dynamicSnapThreshold) {
                // Instead of snapping 100%, move camera a significant portion toward the ship
                const positionSnapLerpFactor = Math.min(1, 0.7 * (delta * 60)); // Adjusted snap factor for position
                const rotationSnapSlerpFactor = Math.min(1, 0.8 * (delta * 60)); // Adjusted snap factor for rotation

                starshipCameraRig.position.lerp(targetPos, positionSnapLerpFactor); // Directly lerp towards targetPos
                starshipCameraRig.quaternion.slerp(targetQuat, rotationSnapSlerpFactor);

                // Force update of the rig's world matrix
                starshipCameraRig.updateMatrixWorld(true);
                
                if (logThrottleCounter % LOG_THROTTLE_INTERVAL === 0) {
                    console.log(`[Starship Debug] Camera snap triggered: distance=${distanceToShip.toFixed(1)}, threshold=${dynamicSnapThreshold.toFixed(1)}, speed=${currentSpeed.toFixed(1)}`);
                }
            }
            
            // Position camera at the correct offset in rig's local space
            const camOffsetY_local = starshipProperties.camOffsetY || STARSHIP_CAMERA_LOCAL_OFFSET.y; // Use property, fallback if needed
            const camOffsetZ_local = starshipProperties.camOffsetZ || STARSHIP_CAMERA_LOCAL_OFFSET.z; // Use property, fallback if needed
            camera.position.set(0, camOffsetY_local, camOffsetZ_local); // Camera's LOCAL position relative to rig.
            
            // Define the point the camera should look at, locally within the rig, then convert to world.
            const lookAtDistanceForward_local = 200; 
            const downwardAngleRad = 15.0 * Math.PI / 180;
            const lookAtY_target_local = camOffsetY_local - Math.tan(downwardAngleRad) * (camOffsetZ_local + lookAtDistanceForward_local);
            const lookAtPoint_local = new THREE.Vector3(0, lookAtY_target_local, -lookAtDistanceForward_local);
            
            // Transform this local look-at point (relative to rig) to world space
            const lookAtPoint_world = lookAtPoint_local.clone().applyMatrix4(starshipCameraRig.matrixWorld);
            
            // Determine the camera's "up" vector in world space, aligned with the rig's up
            const worldUp = new THREE.Vector3(0, 1, 0);
            worldUp.applyQuaternion(starshipCameraRig.quaternion); // Apply rig's world rotation to get world up
            camera.up.copy(worldUp);
            
            // Make the camera look at the world-space target point, using the calculated worldUp
            camera.lookAt(lookAtPoint_world);
        }

        // --- UI Update & Logging ---
        const speed = velocity.length();
        const starshipTelemetryDiv = document.getElementById('starship-telemetry');
        if (starshipTelemetryDiv) {
            starshipTelemetryDiv.innerHTML = `Speed: ${speed.toFixed(0)} u/s<br>Throttle: ${(throttle*100).toFixed(0)}%<br>Altitude: ${starship.position.y.toFixed(0)} u`;
        }
        logThrottleCounter++;
        if (logThrottleCounter % LOG_THROTTLE_INTERVAL === 0) {
            console.log(`Starship Debug:\n                Position: ${starship.position.x.toFixed(1)}, ${starship.position.y.toFixed(1)}, ${starship.position.z.toFixed(1)}\n                Velocity: ${velocity.x.toFixed(1)}, ${velocity.y.toFixed(1)}, ${velocity.z.toFixed(1)} (Speed: ${speed.toFixed(1)})\n                LocalAngVel: ${starshipProperties.angularVelocity.x.toFixed(3)}, ${starshipProperties.angularVelocity.y.toFixed(3)}, ${starshipProperties.angularVelocity.z.toFixed(3)}\n                Inputs U/D/L/R: ${inputUp}/${inputDown}/${inputLeft}/${inputRight}, RollL/R: ${inputRollLeft}/${inputRollRight}, Throttle: ${throttle.toFixed(2)}, CurrZThrust: ${starshipProperties.currThrustZ.toFixed(3)}\n                CameraRigPos: ${starshipCameraRig.position.x.toFixed(1)}, ${starshipCameraRig.position.y.toFixed(1)}, ${starshipCameraRig.position.z.toFixed(1)}\n                CameraLocal: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`
            );
        }

        // In animate(), inside if (isStarshipMode) block, at the end:
        updateHUD();
    } else {
        // --- Existing Solar System Simulation Logic ---
        const worldPos = new THREE.Vector3();
        const previousCameraPosition = camera.position.clone();
        // ... (rest of solar system logic - ensure cameraRelativePosition is handled correctly here too)
    celestialObjects.forEach(obj => {
        if (obj.rotationPeriod && obj.bodyObject) {
            const rotationRadPerDay = (2 * Math.PI) / obj.rotationPeriod;
                let rotationDelta;
                if (uiSettings.realisticRotation) {
                    rotationDelta = rotationRadPerDay * simulationTimeDeltaDays;
                } else {
            const rotationRadPerSecond = rotationRadPerDay / (24 * 60 * 60);
                    rotationDelta = rotationRadPerSecond * delta;
        }
                obj.bodyObject.rotateY(rotationDelta);
            }
        if (obj.orbitalProperties && obj.orbitalPeriodDays && obj.orbitPivot && obj.bodyObject) {
            const { semiMajorAxis: a_km, eccentricity: e, argumentOfPerihelion: omega_deg } = obj.orbitalProperties;
                const isMoon = obj.isMoon;
                let a = a_km * (isMoon ? MOON_DISTANCE_SCALE : DISTANCE_SCALE);
                if (obj.isMoon && obj.visualOrbitFactor) {
                    a *= obj.visualOrbitFactor;
                }
            const meanMotionRadPerDay = (2 * Math.PI) / obj.orbitalPeriodDays;
                const newMeanAnomaly = (obj.currentMeanAnomaly + meanMotionRadPerDay * simulationTimeDeltaDays) % (2 * Math.PI);
                if (obj.currentMeanAnomaly !== undefined && obj.currentMeanAnomaly > newMeanAnomaly + Math.PI) {
                    if (!obj.orbitCount) obj.orbitCount = 0;
                    obj.orbitCount++;
                }
                obj.currentMeanAnomaly = newMeanAnomaly;
            const E = solveKeplerEquation(obj.currentMeanAnomaly, e); 
            const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)); 
                obj.trueAnomaly = nu;
            const r = a * (1 - e * Math.cos(E)); 
            const angleInOrbitalPlane = nu + THREE.MathUtils.degToRad(omega_deg || 0);
            const x_orb_plane = r * Math.cos(angleInOrbitalPlane);
            const z_orb_plane = r * Math.sin(angleInOrbitalPlane);
            obj.bodyObject.position.set(x_orb_plane, 0, -z_orb_plane); 
        }
            if (obj.bodyObject) {
                const label = obj.bodyObject.getObjectByName(`${obj.name}_label`);
                if (label) {
                    const bodyWorldPos = new THREE.Vector3();
                    obj.bodyObject.getWorldPosition(bodyWorldPos);
                    const distanceToCamera = camera.position.distanceTo(bodyWorldPos);
                    const objectRadius = obj.bodyObject.geometry.parameters.radius;
                    const worldLabelPos = bodyWorldPos.clone();
                    worldLabelPos.y += objectRadius * (obj.isStar ? 0.3 : 2.5);
                    const localLabelPos = obj.bodyObject.worldToLocal(worldLabelPos.clone());
                    label.position.copy(localLabelPos);
                    const baseScale = obj.isStar ? objectRadius * 2.5 : objectRadius * 1.5;
                    const visualScale = Math.min(1.2, Math.max(0.5, 0.7 + 50 / distanceToCamera));
                    const finalScale = baseScale * visualScale;
                    label.scale.set(finalScale * 2, finalScale, 1);
                    label.quaternion.copy(camera.quaternion);
                    if (label.material) {
                        label.visible = uiSettings.showLabels;
                        label.renderOrder = 999;
                        if (distanceToCamera > objectRadius * 30) {
                            label.material.depthTest = false;
                        } else {
                            label.material.depthTest = true;
                            label.renderOrder = 1;
                        }
                    }
                    label.updateLabelContent(distanceToCamera);
                }
            }
        });
        if (window._focusedPlanetName) {
            const focusedObj = celestialObjects.find(o => o.name === window._focusedPlanetName);
            if (focusedObj && !focusedObj.isStar) {
                focusedObj.bodyObject.getWorldPosition(worldPos);
                controls.target.copy(worldPos);
                const planetMovement = new THREE.Vector3().subVectors(worldPos, lastPlanetPosition);
                if (controls.enabled) {
                    camera.position.add(planetMovement);
                }
                // This is the solar system mode's cameraRelativePosition, ensure it is defined and used.
                // It seems it was declared much earlier (line 40 in a previous state).
                // We need to ensure this `cameraRelativePosition` is the one from the solar system view, not starship.
                // Let's assume `cameraRelativePosition` (the one from solar system scope) is available.
                const expectedPosition = new THREE.Vector3().addVectors(lastPlanetPosition, cameraRelativePosition); 
                if (!previousCameraPosition.equals(expectedPosition)) {
                    cameraRelativePosition.copy(camera.position).sub(worldPos);
                }
                lastPlanetPosition.copy(worldPos);
                if (!sunLight.target.isObject3D) {
                    sunLight.target = new THREE.Object3D();
                    scene.add(sunLight.target);
                }
                sunLight.target.position.copy(worldPos);
                if (!window._focusLight) {
                    window._focusLight = new THREE.PointLight(0xffffff, 2, 0, 1);
                    scene.add(window._focusLight);
                }
                const focusLightOffset = new THREE.Vector3(0, focusedObj.bodyObject.geometry.parameters.radius * 3, 0);
                window._focusLight.position.copy(worldPos.clone().add(focusLightOffset));
            }
        } else if (window._focusLight) {
            scene.remove(window._focusLight);
            window._focusLight = null;
        }
        const saturnCelestial = celestialObjects.find(obj => obj.name === "Saturn");
        if (saturnCelestial) {
            const rings = saturnCelestial.bodyObject.getObjectByName('Saturn_rings');
            if (rings) {
                const saturnRotationRate = (2 * Math.PI) / (saturnCelestial.rotationPeriod);
                const desiredRingRotationRate = (2 * Math.PI) / SATURN_RINGS_ROTATION_PERIOD;
                const relativeRotationDelta = (desiredRingRotationRate - saturnRotationRate) * simulationTimeDeltaDays;
                rings.rotation.y += relativeRotationDelta;
            }
        }
        if(controls) controls.update();
    } 
    renderer.render(scene, camera);
    celestialObjects.forEach(obj => {
        if (obj.name === 'Moon' && obj.orbitalProperties) {
            const yearsElapsed = simulationDaysElapsed / 365.25;
            obj.orbitalProperties.semiMajorAxis += MOON_RECESSION_KM_PER_YEAR * yearsElapsed;
            obj.orbitalProperties.period += MOON_ORBITAL_PERIOD_INCREASE_PER_YEAR * yearsElapsed;
        }
        if (obj.name === 'Mercury' && obj.orbitalProperties) {
            const precessionRatePerDay = MERCURY_PRECESSION_DEG_PER_CENTURY / 36525.0;
            obj.orbitalProperties.argumentOfPerihelion += precessionRatePerDay * simulationTimeDeltaDays;
            obj.orbitalProperties.argumentOfPerihelion %= 360;
        }
    });
    if (uiSettings.showTelemetry && window._focusedPlanetName && !isStarshipMode) {
        const focusedObj = celestialObjects.find(o => o.name === window._focusedPlanetName);
        if (focusedObj) {
            window.updateTelemetry(focusedObj);
        }
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// After starshipUiPanel definition, create HUD overlay
const hudContainer = document.createElement('div');
hudContainer.id = 'starship-hud';
hudContainer.style.position = 'fixed';
hudContainer.style.top = '0';
hudContainer.style.left = '0';
hudContainer.style.width = '100%';
hudContainer.style.height = '100%';
hudContainer.style.pointerEvents = 'none';
hudContainer.style.display = 'none'; // only visible in starship mode

// Create the full cockpit frame elements
const cockpitFrameBottom = document.createElement('div');
cockpitFrameBottom.className = 'cockpit-frame-bottom';
hudContainer.appendChild(cockpitFrameBottom);

const cockpitFrameLeft = document.createElement('div');
cockpitFrameLeft.className = 'cockpit-frame-left';
hudContainer.appendChild(cockpitFrameLeft);

const cockpitFrameRight = document.createElement('div');
cockpitFrameRight.className = 'cockpit-frame-right';
hudContainer.appendChild(cockpitFrameRight);

// Create main console that will hold instrumentation
const cockpitConsole = document.createElement('div');
cockpitConsole.className = 'cockpit-console';
hudContainer.appendChild(cockpitConsole);

// Left section of console (systems)
const consoleLeft = document.createElement('div');
consoleLeft.className = 'console-section console-section-left';
consoleLeft.innerHTML = '<div class="console-header">SYSTEMS</div>';
cockpitConsole.appendChild(consoleLeft);

// Center section of console (attitude and speed)
const consoleCenter = document.createElement('div');
consoleCenter.className = 'console-section console-section-center';
consoleCenter.innerHTML = '<div class="console-header">FLIGHT</div>';
cockpitConsole.appendChild(consoleCenter);

// Right section of console (navigation)
const consoleRight = document.createElement('div');
consoleRight.className = 'console-section console-section-right';
consoleRight.innerHTML = '<div class="console-header">NAVIGATION</div>';
cockpitConsole.appendChild(consoleRight);

// Attitude indicator canvas
const attitudeCanvas = document.createElement('canvas');
attitudeCanvas.width = 160;
attitudeCanvas.height = 160;
attitudeCanvas.id = 'attitudeCanvas';
// Move attitude indicator to center console section
consoleCenter.appendChild(attitudeCanvas);

// Velocity / Throttle text - this now just holds the top-left info
const hudText = document.createElement('div');
hudContainer.appendChild(hudText);

// Add a central reticle element to the HUD container
const hudReticle = document.createElement('div');
hudReticle.id = 'hud-reticle';
hudReticle.innerHTML = '<div></div>'; // Center dot
hudContainer.appendChild(hudReticle);

// Add Mini-map placeholder to HUD
const hudMiniMap = document.createElement('div');
hudMiniMap.id = 'hud-mini-map';
hudMiniMap.innerHTML = '';
hudContainer.appendChild(hudMiniMap);

// Add Inventory placeholder to HUD
const hudInventory = document.createElement('div');
hudInventory.id = 'hud-inventory';
hudInventory.innerHTML = '<div>CARGO: EMPTY</div>'; 
hudContainer.appendChild(hudInventory);

document.body.appendChild(hudContainer);

function setHUDVisible(visible){
    hudContainer.style.display = visible ? 'block' : 'none';
    // All elements are children of hudContainer, so they'll toggle with it
}

function updateHUD(){
    const speed = starshipProperties.velocity.length();
    const speedDisplay = speed < 1000 ? 
        `${speed.toFixed(0)} u/s` : 
        `${(speed/1000).toFixed(1)} ku/s`;
    
    const thrustPct = (starshipProperties.throttle * 100).toFixed(0);
    const latThrust = (starshipProperties.currThrustX * 100).toFixed(0);
    const vertThrust = (starshipProperties.currThrustY * 100).toFixed(0);

    // Ship Systems Data
    const shieldPercent = starshipProperties.maxShields > 0 ? (starshipProperties.shields / starshipProperties.maxShields * 100).toFixed(0) : 0;
    const hullPercent = starshipProperties.maxHull > 0 ? (starshipProperties.hull / starshipProperties.maxHull * 100).toFixed(0) : 0;
    const powerStatus = `${starshipProperties.powerLevel.toFixed(0)}%`;
    const autopilotStatus = starshipProperties.autopilotEngaged ? "ON" : "OFF";

    // Targeting Data
    let targetName = "NO TARGET";
    let targetDistanceDisplay = "---";
    let targetBearing = "---";

    if (starshipProperties.currentTargetIndex !== -1 && celestialObjects[starshipProperties.currentTargetIndex]) {
        const targetObject = celestialObjects[starshipProperties.currentTargetIndex];
        targetName = targetObject.name.toUpperCase();
        if (targetObject.bodyObject) {
            const targetPosition = new THREE.Vector3();
            targetObject.bodyObject.getWorldPosition(targetPosition);
            const distance = starship.position.distanceTo(targetPosition);
            
            // More meaningful units display
            if (distance < 1000) {
                targetDistanceDisplay = `${distance.toFixed(1)} u`;
            } else if (distance < 1000000) {
                targetDistanceDisplay = `${(distance/1000).toFixed(1)} km`;
            } else {
                targetDistanceDisplay = `${(distance/149.6e6).toFixed(2)} AU`;
            }
            
            // Calculate bearing (direction) to target
            const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(starship.quaternion);
            const directionToTarget = targetPosition.clone().sub(starship.position).normalize();
            const angle = THREE.MathUtils.radToDeg(shipForward.angleTo(directionToTarget));
            targetBearing = `${angle.toFixed(1)}°`;

            // Calculate relative velocity
            if (targetObject.orbitalProperties) {
                // Show only in km/s for simplicity
                const relVelocity = starshipProperties.velocity.length() / 1000;
            }
        } else {
            targetDistanceDisplay = "UNKNOWN";
        }
    }

    // Clear any previous top HUD content (we'll put everything in the console)
    hudText.innerHTML = '';

    // Update Mini-map (remove the header div, CSS will handle it)
    hudMiniMap.innerHTML = `
        <div class="mini-map-content">
            <div class="mini-map-data">
                <div class="mini-map-item">TARGET: ${targetName}</div>
                <div class="mini-map-item">DIST: ${targetDistanceDisplay}</div>
                <div class="mini-map-item">BEAR: ${targetBearing}</div>
            </div>
        </div>
    `;

    // Update Systems section (left console)
    consoleLeft.innerHTML = `
        <div class="console-header">SYSTEMS</div>
        <div class="system-status">
            <div class="hud-item"><span class="hud-label">SHD</span> <div class="hud-value-bar"><div class="shield-bar-fill" style="width: ${shieldPercent}%;"></div></div> ${shieldPercent}%</div>
            <div class="hud-item"><span class="hud-label">HULL</span> <div class="hud-value-bar"><div class="hull-bar-fill" style="width: ${hullPercent}%;"></div></div> ${hullPercent}%</div>
            <div class="hud-item"><span class="hud-label">PWR</span> <div class="power-value">${powerStatus}</div></div>
        </div>
        <div class="autopilot-status">
            <div class="autopilot-indicator ${autopilotStatus === 'ON' ? 'active' : ''}"></div>
            <span>AUTOPILOT: ${autopilotStatus}</span>
        </div>
    `;

    // Update Speed section (below attitude indicator in center console)
    const speedInfoContent = `
        <div class="console-header">FLIGHT</div>
        <div class="flight-stats">
            <div class="hud-item"><span class="hud-label">SPD</span> ${speedDisplay}</div>
            <div class="hud-item"><span class="hud-label">THR</span> ${thrustPct}%</div>
            <div class="thrust-indicators">
                <div class="hud-item"><span class="hud-label">LAT</span> ${latThrust}%</div>
                <div class="hud-item"><span class="hud-label">VERT</span> ${vertThrust}%</div>
            </div>
        </div>
    `;
    
    // Update only the content before the attitude indicator
    consoleCenter.innerHTML = speedInfoContent;
    consoleCenter.appendChild(attitudeCanvas);

    // Update Navigation section (right console)
    consoleRight.innerHTML = `
        <div class="console-header">NAVIGATION</div>
        <div class="target-info">
            <div class="hud-item"><span class="hud-label">TGT</span> ${targetName}</div>
            <div class="hud-item"><span class="hud-label">DIST</span> ${targetDistanceDisplay}</div>
            <div class="hud-item"><span class="hud-label">BEAR</span> ${targetBearing}</div>
        </div>
        <div class="nav-controls">
            <div class="hud-item nav-key"><span class="key-prompt">T</span> CYCLE TARGET</div>
            <div class="hud-item nav-key"><span class="key-prompt">P</span> ${autopilotStatus === 'ON' ? 'DISENGAGE AP' : 'ENGAGE AP'}</div>
        </div>
    `;
    
    // Update inventory display
    hudInventory.innerHTML = '<div class="cargo-status">CARGO: EMPTY</div>';

    // Also display a status bar at the top of the screen with essential info
    // First check if it exists already
    let topStatusBar = document.querySelector('.top-status-bar');
    if (!topStatusBar) {
        topStatusBar = document.createElement('div');
        topStatusBar.className = 'top-status-bar';
        hudContainer.appendChild(topStatusBar);
    }

    // Update status bar content
    topStatusBar.innerHTML = `
        <div class="status-item"><span class="status-label">TGT:</span> ${targetName}</div>
        <div class="status-item"><span class="status-label">SHD:</span> ${shieldPercent}%</div>
        <div class="status-item"><span class="status-label">HULL:</span> ${hullPercent}%</div>
        <div class="status-item"><span class="status-label">AP:</span> ${autopilotStatus}</div>
    `;

    // Draw attitude indicator canvas
    const ctx = attitudeCanvas.getContext('2d');
    ctx.clearRect(0, 0, 160, 160);
    ctx.save();
    
    // Get ship orientation vectors
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(starship.quaternion);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(starship.quaternion);
    
    // Calculate attitude angles
    const pitch = Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1));
    const roll = Math.atan2(up.x, up.y);
    
    // Translate to center of indicator
    ctx.translate(80, 80);
    
    // Apply roll rotation
    ctx.rotate(-roll);
    
    // Draw space (dark blue)
    ctx.fillStyle = 'rgba(0, 10, 30, 0.85)';
    ctx.beginPath();
    ctx.rect(-160, -160, 320, 160 + pitch * 320);
    ctx.fill();
    
    // Draw ground (brown-red)
    ctx.fillStyle = 'rgba(90, 40, 20, 0.8)';
    ctx.beginPath();
    ctx.rect(-160, pitch * 320, 320, 160);
    ctx.fill();
    
    // Draw horizon line
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-80, pitch * 320);
    ctx.lineTo(80, pitch * 320);
    ctx.stroke();
    
    // Draw pitch ladder (5-degree increments)
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
    ctx.lineWidth = 1;
    for(let i = -30; i <= 30; i += 5) {
        if(i === 0) continue; // Skip horizon line (already drawn)
        const y = pitch * 320 - i * 10;
        const width = i % 10 === 0 ? 40 : 20; // Longer marks at 10° increments
        
        ctx.beginPath();
        ctx.moveTo(-width, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        
        // Add labels for 10° increments
        if(i % 10 === 0) {
            ctx.fillStyle = 'rgba(0, 255, 200, 0.8)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(Math.abs(i) + '°', width + 5, y + 3);
            ctx.textAlign = 'right';
            ctx.fillText(Math.abs(i) + '°', -width - 5, y + 3);
        }
    }
    
    // Draw roll indicator
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.8)';
    ctx.fillStyle = 'rgba(0, 255, 200, 0.8)';
    ctx.beginPath();
    ctx.arc(0, -60, 30, 0, Math.PI * 2); // Smaller roll indicator
    ctx.stroke();
    
    // Roll tick marks
    for(let i = 0; i < 12; i++) {
        const angle = (i * Math.PI/6) - Math.PI/2;
        const length = i % 3 === 0 ? 6 : 4; // Smaller tick marks
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 30, Math.sin(angle) * 30 - 60);
        ctx.lineTo(Math.cos(angle) * (30 - length), Math.sin(angle) * (30 - length) - 60);
        ctx.stroke();
        
        // Add labels for 30° increments
        if(i % 3 === 0 && i > 0) {
            const labelAngle = (i * 30) % 180;
            const textRadius = 22;
            ctx.fillStyle = 'rgba(0, 255, 200, 0.7)';
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelAngle + '°', 
                Math.cos(angle) * textRadius, 
                Math.sin(angle) * textRadius - 60);
        }
    }
    
    // Roll indicator pointer
    ctx.beginPath();
    ctx.moveTo(0, -85);
    ctx.lineTo(-5, -75);
    ctx.lineTo(5, -75);
    ctx.closePath();
    ctx.fill();
    
    // Draw center crosshair
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.9)';
    ctx.beginPath();
    
    // Left part of crosshair
    ctx.moveTo(-20, 0);
    ctx.lineTo(-5, 0);
    
    // Right part
    ctx.moveTo(5, 0);
    ctx.lineTo(20, 0);
    
    // Top part
    ctx.moveTo(0, -20);
    ctx.lineTo(0, -5);
    
    // Bottom part
    ctx.moveTo(0, 5);
    ctx.lineTo(0, 20);
    
    ctx.stroke();
    
    // Velocity vector indicator
    if(speed > 5) {
        const normVel = starshipProperties.velocity.clone().normalize();
        const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(starship.quaternion);
        const shipRight = new THREE.Vector3(1, 0, 0).applyQuaternion(starship.quaternion);
        const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(starship.quaternion);
        
        // Project velocity onto ship's local frame
        const rightDot = normVel.dot(shipRight) * 70;
        const upDot = normVel.dot(shipUp) * 70;
        
        // Draw velocity vector indicator
        ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(rightDot, -upDot, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw circle around it
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(rightDot, -upDot, 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.restore();
}

// modify starship mode toggle to show/hide HUD
// inside keydown F toggle when entering starshipMode add:
// setHUDVisible(true);
// exiting: setHUDVisible(false);

// In starship creation (replace capsule mesh with GLB model)
const gltfLoader = new GLTFLoader();
const STARSHIP_MODEL_PATH = '../textures/Starship_Calypso_0521230350_texture.glb';

// Load GLB model and add to starship group
let starshipModel = null;
gltfLoader.load(
  STARSHIP_MODEL_PATH,
  (gltf) => {
    starshipModel = gltf.scene;
    
    // Get initial model dimensions before our scaling
    const initialBox = new THREE.Box3().setFromObject(starshipModel);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    console.log('[Starship Debug] Initial GLB model size (before scaling): Z=', initialSize.z, 'Y=', initialSize.y, 'X=', initialSize.x);
    const modelZLength = initialSize.z; // Use actual Z-depth of the loaded model

    starshipModel.rotation.set(0, -Math.PI / 2, 0); 
    starship.add(starshipModel);

    const desiredLengthKm = 0.005; // 5 meters - much smaller ship
    // const modelLength = 236.18; // Using dynamic modelZLength instead
    const scale = desiredLengthKm * 1000 / modelZLength; // convert km to meters, then scale
    console.log('[Starship Debug] Calculated starship scale:', scale, 'for desiredLengthKm:', desiredLengthKm, 'and modelZLength:', modelZLength);
    starshipModel.scale.set(scale, scale, scale);
    console.log('[Starship Debug] Starship model scale after set:', starshipModel.scale.x, starshipModel.scale.y, starshipModel.scale.z);

    const box = new THREE.Box3().setFromObject(starshipModel); // Box of the *scaled* model
    const size = box.getSize(new THREE.Vector3());
    console.log('[Starship Debug] Starship model size AFTER scaling (used for camera offset): Z=', size.z, 'Y=', size.y, 'X=', size.x);
    
    const cameraDistance = size.z * 1.6; // Reduced Z distance multiplier
    const cameraHeight = size.y * 1;   // Reduced Y height multiplier
    
    starshipProperties.camOffsetY = cameraHeight;
    starshipProperties.camOffsetZ = cameraDistance;
    console.log('[Starship Debug] Starship camOffsetY:', starshipProperties.camOffsetY, 'camOffsetZ:', starshipProperties.camOffsetZ);

  },
  undefined,
  (error) => {
    console.error('Error loading starship GLB:', error);
  }
);

// Remove placeholder mesh if present
if (typeof starshipMesh !== 'undefined' && starship.children.includes(starshipMesh)) {
    starship.remove(starshipMesh);
}

// In GLTFLoader callback, after loading the model:
const desiredLengthKm = 0.005; // 5 meters - much smaller ship
const modelLength = 236.18; // from trimesh extents[0], in meters
const scale = desiredLengthKm * 1000 / modelLength; // convert km to meters, then scale
starshipModel.scale.set(scale, scale, scale);


// After scaling and adding starshipModel to starship:
const box = new THREE.Box3().setFromObject(starshipModel);
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());
// Store offsets for use each frame
starshipProperties.camOffsetY = cameraHeight;
starshipProperties.camOffsetZ = cameraDistance;

// Position camera relative to rig local axes
camera.position.set(0, cameraHeight, cameraDistance);
camera.lookAt(0, 0, 0);

// --- Starship Navigation and Systems Panels ---
// REMOVING starshipNavPanel and starshipSystemsPanel as per revised plan
// let starshipNavPanel;
// let starshipSystemsPanel;
// window._starshipTarget = null; 

// Target Selection Functions
function selectNextTarget() {
    if (celestialObjects.length === 0) return;
    starshipProperties.currentTargetIndex++;
    if (starshipProperties.currentTargetIndex >= celestialObjects.length) {
        starshipProperties.currentTargetIndex = 0; // Wrap around
    }
    logSelectedTarget();
}

function selectPreviousTarget() {
    if (celestialObjects.length === 0) return;
    starshipProperties.currentTargetIndex--;
    if (starshipProperties.currentTargetIndex < 0) {
        starshipProperties.currentTargetIndex = celestialObjects.length - 1; // Wrap around
    }
    logSelectedTarget();
}

function logSelectedTarget() {
    if (starshipProperties.currentTargetIndex !== -1 && celestialObjects[starshipProperties.currentTargetIndex]) {
        console.log("Target selected: ", celestialObjects[starshipProperties.currentTargetIndex].name);
    } else {
        console.log("No target selected or target list empty.");
    }
}

// --- Ship System Logic ---
function showFloatingFeedback(text, color) {
    console.log('showFloatingFeedback', text, color);
    const feedback = document.createElement('div');
    feedback.textContent = text;
    feedback.style.position = 'fixed';
    feedback.style.left = '50%';
    feedback.style.bottom = '240px';
    feedback.style.transform = 'translateX(-50%)';
    feedback.style.fontSize = '2.5em';
    feedback.style.fontWeight = 'bold';
    feedback.style.color = color;
    feedback.style.background = 'rgba(0,0,0,0.7)';
    feedback.style.padding = '8px 24px';
    feedback.style.borderRadius = '12px';
    feedback.style.textShadow = '0 0 10px #000, 0 0 20px #000';
    feedback.style.pointerEvents = 'none';
    feedback.style.opacity = '1';
    feedback.style.transition = 'opacity 0.8s cubic-bezier(.4,2,.6,1)';
    feedback.style.zIndex = '3000';
    document.body.appendChild(feedback);
    setTimeout(() => { feedback.style.opacity = '0'; }, 200);
    setTimeout(() => { feedback.remove(); }, 1000);
}

function applyDamage(amount) {
    console.log('applyDamage called with', amount);
    // Shields absorb damage first
    if (starshipProperties.shields > 0) {
        const shieldDamage = Math.min(amount, starshipProperties.shields);
        starshipProperties.shields -= shieldDamage;
        amount -= shieldDamage;
    }
    // Remaining damage goes to hull
    if (amount > 0 && starshipProperties.hull > 0) {
        starshipProperties.hull = Math.max(0, starshipProperties.hull - amount);
        if (starshipProperties.hull === 0) {
            showFloatingFeedback('SHIP DESTROYED!', '#ff3333');
            console.log('SHIP DESTROYED!');
        }
    }
    showFloatingFeedback('-100', '#ff3333');
    updateHUD();
}

function repair(amount) {
    console.log('repair called with', amount);
    // Repair hull first, then shields
    if (starshipProperties.hull < starshipProperties.maxHull) {
        const hullRepair = Math.min(amount, starshipProperties.maxHull - starshipProperties.hull);
        starshipProperties.hull += hullRepair;
        amount -= hullRepair;
    }
    if (amount > 0 && starshipProperties.shields < starshipProperties.maxShields) {
        starshipProperties.shields = Math.min(starshipProperties.maxShields, starshipProperties.shields + amount);
    }
    showFloatingFeedback('+100', '#33ff66');
    updateHUD();
}


