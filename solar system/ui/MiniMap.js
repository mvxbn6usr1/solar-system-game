import * as THREE from 'three';

export class MiniMap {
    constructor(parentElement, mainCamera, mainScene) {
        this.parentElement = parentElement;
        this.mainCamera = mainCamera;
        this.mainScene = mainScene;
        
        // Mini-map properties
        this.width = 252;
        this.height = 200;
        this.zoom = 2.0; // Start more zoomed in for tactical view
        this.isVisible = true;
        this.playerShip = null;
        
        // Create mini-map container
        this.container = document.createElement('div');
        this.container.className = 'mini-map-3d-container';
        this.container.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 4px;
            background: rgba(5, 15, 30, 0.9);
            overflow: hidden;
        `;
        
        // Create mini-map renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0x000510, 0.9);
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.display = 'block';
        this.container.appendChild(this.renderer.domElement);
        
        // Create mini-map scene
        this.scene = new THREE.Scene();
        
        // Create mini-map camera (orthographic for top-down view)
        this.baseFrustumSize = 800; // Base tactical view range
        this.camera = new THREE.OrthographicCamera(
            -this.baseFrustumSize / 2, this.baseFrustumSize / 2,
            this.baseFrustumSize / 2, -this.baseFrustumSize / 2,
            1, 100000
        );
        this.camera.position.set(0, 25000, 0);
        this.camera.lookAt(0, 0, 0);
        this.updateCamera();
        
        // Create tactical objects
        this.tacticalObjects = new Map();
        this.enemyMarkers = new Map();
        this.playerMarker = null;
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        // Initialize tactical objects
        this.initializeTacticalDisplay();
        
        // Create UI controls
        this.createControls();
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.updateCamera();
    }
    
    initializeTacticalDisplay() {
        // Create player marker (always at center)
        this.createPlayerMarker();
        
        // Create tactical grid
        this.createTacticalGrid();
        
        // Create range rings
        this.createRangeRings();
        
        // Celestial objects will be created dynamically
    }
    
    createPlayerMarker() {
        // Create distinctive player ship marker
        const geometry = new THREE.ConeGeometry(15, 40, 4);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00
        });
        this.playerMarker = new THREE.Mesh(geometry, material);
        this.playerMarker.rotation.x = -Math.PI / 2; // Point forward
        this.playerMarker.position.set(0, 10, 0); // Always at center
        this.scene.add(this.playerMarker);
        
        // Add a glow ring around player
        const ringGeometry = new THREE.RingGeometry(20, 25, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const playerRing = new THREE.Mesh(ringGeometry, ringMaterial);
        playerRing.rotation.x = -Math.PI / 2;
        playerRing.position.set(0, 5, 0);
        this.scene.add(playerRing);
    }
    
    createTacticalGrid() {
        // Create a subtle grid for reference
        const gridSize = 2000;
        const divisions = 20;
        const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x003366, 0x001133);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);
    }
    
    createRangeRings() {
        // Create concentric range rings
        const ranges = [100, 200, 400, 800];
        ranges.forEach((range, index) => {
            const geometry = new THREE.RingGeometry(range - 2, range + 2, 32);
            const material = new THREE.MeshBasicMaterial({
                color: 0x004488,
                transparent: true,
                opacity: 0.4 - (index * 0.1),
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 1;
            this.scene.add(ring);
        });
    }
    
    createOrUpdateCelestialObject(celestialObj, playerPosition) {
        let obj = this.tacticalObjects.get(celestialObj.name);
        
        if (!obj) {
            // Create new celestial object marker
            const planetColors = {
                Sun: 0xffaa00,
                Mercury: 0x8c7853,
                Venus: 0xffc649,
                Earth: 0x6b93d6,
                Mars: 0xcd5c5c,
                Jupiter: 0xd8ca9d,
                Saturn: 0xfad5a5,
                Uranus: 0x4fd0e7,
                Neptune: 0x4169e1,
                Pluto: 0xcccccc,
                Moon: 0xaaaaaa
            };
            
            const color = planetColors[celestialObj.name] || 0x888888;
            const size = celestialObj.name === 'Sun' ? 50 : 
                        celestialObj.name === 'Jupiter' ? 25 :
                        celestialObj.name === 'Saturn' ? 20 : 15;
            
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.8
            });
            obj = new THREE.Mesh(geometry, material);
            this.scene.add(obj);
            this.tacticalObjects.set(celestialObj.name, obj);
        }
        
        // Update position relative to player
        if (celestialObj.bodyObject && playerPosition) {
            const worldPos = new THREE.Vector3();
            celestialObj.bodyObject.getWorldPosition(worldPos);
            
            // Position relative to player with tactical scale
            const scale = 0.5; // Larger scale for tactical view
            const relativeX = (worldPos.x - playerPosition.x) * scale;
            const relativeZ = (worldPos.z - playerPosition.z) * scale;
            const distance = Math.sqrt(relativeX * relativeX + relativeZ * relativeZ);
            
            // Only show objects within tactical range and limit to reasonable distance
            if (distance < 1500) {
                obj.position.set(relativeX, 0, relativeZ);
                obj.visible = true;
            } else {
                obj.visible = false;
            }
        }
        
        return obj;
    }
    
    createEnemyMarker(enemy) {
        const geometry = new THREE.ConeGeometry(12, 30, 3);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.rotation.x = -Math.PI / 2;
        this.scene.add(marker);
        this.enemyMarkers.set(enemy.id, marker);
        return marker;
    }
    
    removeEnemyMarker(enemyId) {
        const marker = this.enemyMarkers.get(enemyId);
        if (marker) {
            this.scene.remove(marker);
            this.enemyMarkers.delete(enemyId);
        }
    }
    
    createControls() {
        // Zoom controls
        const controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = `
            position: absolute;
            bottom: 5px;
            right: 5px;
            display: flex;
            gap: 3px;
            z-index: 10;
        `;
        
        const zoomInBtn = document.createElement('button');
        zoomInBtn.textContent = '+';
        zoomInBtn.style.cssText = `
            width: 22px;
            height: 22px;
            background: rgba(0, 150, 255, 0.4);
            border: 1px solid rgba(0, 200, 255, 0.6);
            border-radius: 3px;
            color: #0ff;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            font-family: 'Orbitron', monospace;
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        zoomInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.zoomIn();
        });
        
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.textContent = '-';
        zoomOutBtn.style.cssText = zoomInBtn.style.cssText;
        zoomOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.zoomOut();
        });
        
        controlsDiv.appendChild(zoomInBtn);
        controlsDiv.appendChild(zoomOutBtn);
        this.container.appendChild(controlsDiv);
        
        // Zoom indicator
        this.zoomIndicator = document.createElement('div');
        this.zoomIndicator.style.cssText = `
            position: absolute;
            bottom: 5px;
            left: 5px;
            font-size: 10px;
            color: #88ccff;
            font-family: 'Orbitron', monospace;
            background: rgba(0, 50, 100, 0.6);
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid rgba(0, 150, 255, 0.3);
        `;
        this.updateZoomIndicator();
        this.container.appendChild(this.zoomIndicator);
    }
    
    zoomIn() {
        const oldZoom = this.zoom;
        this.zoom = Math.min(this.zoom * 1.4, 8.0);
        console.log(`Tactical zoom in: ${oldZoom.toFixed(1)} -> ${this.zoom.toFixed(1)}`);
        this.updateCamera();
        this.updateZoomIndicator();
    }
    
    zoomOut() {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.zoom / 1.4, 0.2);
        console.log(`Tactical zoom out: ${oldZoom.toFixed(1)} -> ${this.zoom.toFixed(1)}`);
        this.updateCamera();
        this.updateZoomIndicator();
    }
    
    updateCamera() {
        const frustumSize = this.baseFrustumSize / this.zoom;
        this.camera.left = -frustumSize / 2;
        this.camera.right = frustumSize / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();
    }
    
    updateZoomIndicator() {
        if (this.zoomIndicator) {
            this.zoomIndicator.textContent = `${this.zoom.toFixed(1)}x`;
        }
    }
    
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';
    }
    
    update(celestialObjects, playerShip, enemies) {
        if (!this.isVisible || !playerShip) return;
        
        this.playerShip = playerShip;
        
        // Update player marker rotation
        if (this.playerMarker) {
            const euler = new THREE.Euler();
            euler.setFromQuaternion(playerShip.quaternion);
            this.playerMarker.rotation.y = euler.y;
        }
        
        // Update celestial objects relative to player
        if (celestialObjects) {
            celestialObjects.forEach(celestialObj => {
                this.createOrUpdateCelestialObject(celestialObj, playerShip.position);
            });
        }
        
        // Update enemy markers
        if (enemies) {
            // Remove markers for destroyed enemies
            const activeEnemyIds = new Set();
            enemies.forEach(enemy => activeEnemyIds.add(enemy.id));
            
            this.enemyMarkers.forEach((marker, id) => {
                if (!activeEnemyIds.has(id)) {
                    this.removeEnemyMarker(id);
                }
            });
            
            // Update or create enemy markers (relative to player)
            enemies.forEach(enemy => {
                let marker = this.enemyMarkers.get(enemy.id);
                if (!marker) {
                    marker = this.createEnemyMarker(enemy);
                }
                
                if (enemy.model) {
                    // Position relative to player with tactical scale
                    const scale = 0.5;
                    const relativeX = (enemy.model.position.x - playerShip.position.x) * scale;
                    const relativeZ = (enemy.model.position.z - playerShip.position.z) * scale;
                    
                    marker.position.set(relativeX, 15, relativeZ);
                    
                    // Update enemy rotation
                    const euler = new THREE.Euler();
                    euler.setFromQuaternion(enemy.model.quaternion);
                    marker.rotation.y = euler.y;
                    
                    // Make enemy markers pulse
                    const time = Date.now() * 0.003;
                    marker.material.emissiveIntensity = 0.8 + Math.sin(time) * 0.2;
                }
            });
        }
        
        // Render mini-map
        this.renderer.render(this.scene, this.camera);
    }
    
    setVisible(visible) {
        this.isVisible = visible;
        this.container.style.display = visible ? 'block' : 'none';
    }
    
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
} 