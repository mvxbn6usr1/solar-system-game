# Solar System 3D Game

A browser-based 3D solar system exploration and combat game built with Three.js, featuring realistic planetary textures, starship combat, and immersive gameplay mechanics.

## 🌟 Features

### 🪐 Solar System Exploration
- **Realistic 3D Solar System**: Accurate planetary positions, sizes, and orbital mechanics
- **High-Quality Textures**: 2K, 4K, and 8K textures for planets, moons, and celestial bodies
- **Interactive Navigation**: Smooth camera controls and planetary focusing
- **AR Labels**: Information overlay system for celestial bodies

### 🚀 Starship Mode
- **3D Ship Models**: Detailed starship with realistic cockpit view
- **Advanced HUD Interface**: Futuristic heads-up display with:
  - Navigation controls
  - Weapon systems status
  - Shield and hull integrity
  - Targeting overlay
  - Mini-map with radar functionality

### ⚔️ Combat System
- **AI Opponents**: Intelligent enemy ships with various behaviors
- **Weapon Systems**: Multiple weapon types with visual effects
- **Real-time Combat**: Fast-paced space combat mechanics
- **Targeting System**: Advanced targeting overlay with enemy tracking

### 🎮 RPG Elements
- **Faction System**: Multiple space factions with unique characteristics
- **Story Components**: Narrative elements and mission structure
- **Ship Configurations**: Various ship types and customization options

## 🎯 Controls

### Solar System View
- **Mouse**: Look around / Camera rotation
- **WASD**: Move camera
- **Scroll**: Zoom in/out
- **Click Planets**: Focus and get information
- **F**: Enter starship mode

### Starship Mode
- **WASD**: Ship movement
- **Mouse**: Look around / Aim
- **Space**: Fire weapons
- **G**: Spawn AI enemies
- **F**: Return to solar system view
- **Tab**: Toggle targeting overlay
- **M**: Toggle mini-map

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mvxbn6usr1/solar-system-game.git
   cd solar-system-game
   ```

2. **Open the game**:
   - Navigate to the `solar system` directory
   - Open `index.html` in a modern web browser
   - Or serve it with a local web server for better performance

3. **Recommended Setup** (for development):
   ```bash
   cd "solar system"
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser

## 🛠️ Technical Details

### Built With
- **Three.js**: 3D graphics rendering
- **WebGL**: Hardware-accelerated graphics
- **JavaScript ES6+**: Modern JavaScript features
- **HTML5 Canvas**: Web-based rendering

### Project Structure
```
solar system/
├── index.html              # Main entry point
├── main.js                 # Core game logic
├── starship-enhanced.css   # Starship mode styling
├── ui.css                  # UI components styling
├── combat/                 # Combat system modules
│   ├── CombatSystem.js
│   ├── AIOpponent.js
│   ├── AIBehaviors.js
│   └── EnhancedWeaponEffects.js
├── ui/                     # User interface components
│   ├── StarshipHUD.js
│   ├── TargetingOverlay.js
│   ├── ARLabels.js
│   └── MiniMap.js
├── ships/                  # Ship configurations
├── textures/               # High-quality planet textures
├── rpg/                    # RPG and story elements
└── utils/                  # Utility modules
```

### Performance Notes
- High-resolution textures may require significant GPU memory
- Tested on modern browsers with WebGL 2.0 support
- Best performance on dedicated graphics cards

## 🔧 Development

### Scripts
The `scripts/` directory contains Python utilities for:
- Model analysis and hardpoint detection
- Texture processing and optimization
- Geometry verification and debugging

### Backup
The `backup/` directory contains previous versions and experimental features.

## 🌍 Browser Compatibility

- **Chrome**: Fully supported
- **Firefox**: Fully supported  
- **Safari**: Supported (WebGL 2.0 required)
- **Edge**: Supported

## 📝 License

This project is open source. See the repository for license details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🐛 Known Issues

- Large texture files may cause initial loading delays
- Combat AI pathfinding occasionally needs optimization
- Some mobile devices may experience performance limitations

## 🎮 Future Features

- [ ] Multiplayer support
- [ ] More ship types and customization
- [ ] Extended story campaign
- [ ] Resource gathering and trading
- [ ] Station docking mechanics
- [ ] Enhanced particle effects

## 🏆 Credits

- Planetary textures sourced from NASA and space imagery databases
- 3D models created with Blender and exported for Three.js
- Sound effects and music (when implemented) from royalty-free sources

---

**Enjoy exploring the cosmos and engaging in epic space battles!** 🚀✨ 