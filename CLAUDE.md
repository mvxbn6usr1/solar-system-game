# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based solar system simulation built with Three.js that renders planets, moons, and other celestial bodies in 3D with realistic orbital mechanics and lighting.

## Architecture

### Frontend Structure
- **Entry Point**: `solar system/index.html` - Main HTML file that loads the application
- **Main Logic**: `solar system/main.js` - Core simulation logic including:
  - Three.js scene setup with lighting and camera controls
  - Planet/moon creation with orbital mechanics
  - UI controls for time scale, planet focus, and visual settings
  - Realistic astronomical calculations (moon recession, Mercury precession, etc.)
- **Styling**: 
  - `solar system/style.css` - General application styles
  - `solar system/ui.css` - UI panel styles with glass morphism effects
- **Dependencies**: Three.js v0.160.0 loaded via CDN importmap
- **Utilities**: 
  - `solar system/js/GLTFLoader.js` - For loading 3D models
  - `solar system/utils/BufferGeometryUtils.js` - Geometry utilities

### Asset Management
- **Textures**: High-resolution planet/moon textures stored in `textures/` directory
- **Texture Download**: `download_textures.py` script for downloading textures from NASA and other public sources
  - Requires: `pip install requests tqdm`
  - Run: `python download_textures.py`

## Development Commands

Since this is a static web application with no build process:

1. **Run the application**: Open `solar system/index.html` in a web browser or serve via any static file server
   ```bash
   # Example using Python's built-in server (run from project root)
   cd "/Users/williamfranks/Pictures/solar system"
   python -m http.server 8000
   # Then open http://localhost:8000/solar%20system/
   ```

2. **Download textures**: 
   ```bash
   python download_textures.py
   ```

3. **No build/lint/test commands** - This is a vanilla JavaScript project without a build system

## Key Features

- Real-time orbital mechanics simulation with adjustable time scales
- Accurate planet sizes, distances, and orbital periods
- Dynamic lighting system with sun illumination
- UI controls for focusing on specific celestial bodies
- Support for loading custom 3D models (starships)
- Astronomically accurate features like moon recession and Mercury precession

## Combat System

The project now includes an advanced space combat system with:

### Architecture Improvements:
- **Ship Configurations** (`ships/ShipConfigurations.js`): Model-specific weapon/engine hardpoints and scaling
- **AI Behaviors** (`combat/AIBehaviors.js`): Advanced tactical AI with multiple behavior patterns
- **Enhanced Effects** (`combat/EnhancedWeaponEffects.js`): Properly scaled visual effects for weapons and engines

### Combat Features:
- AI opponents with tactical behaviors (fighter, cruiser, interceptor patterns)
- Weapon effects scaled to ship models (muzzle flash, recoil, shell casings)
- Dynamic thruster effects with particle systems
- Shield and damage visualization
- Combat HUD showing enemy count and distance

### Controls:
- **F**: Toggle starship mode
- **Spacebar**: Fire main weapons
- **G**: Spawn enemy fighter for testing
- **K/L**: Test damage/repair systems

 