#!/usr/bin/env python3
"""
Simple Ship Analysis
Based on user description of actual ship structure
"""

import trimesh
import numpy as np

def analyze_based_on_description(file_path, model_name):
    """Analyze ship based on user's description"""
    print(f"\n{'='*60}")
    print(f"ANALYZING {model_name} BASED ON DESCRIPTION")
    print(f"{'='*60}")
    
    # Load the model
    scene = trimesh.load(file_path)
    
    if isinstance(scene, trimesh.Scene):
        mesh = scene.to_geometry()  # Updated method
    else:
        mesh = scene
    
    bounds = mesh.bounds
    dimensions = bounds[1] - bounds[0]
    center = mesh.centroid
    
    print(f"Dimensions: X={dimensions[0]:.1f}, Y={dimensions[1]:.1f}, Z={dimensions[2]:.1f}")
    print(f"Centroid: [{center[0]:.1f}, {center[1]:.1f}, {center[2]:.1f}]")
    
    vertices = mesh.vertices
    
    if model_name == "Starship_Calypso":
        print("\nUser Description:")
        print("- Long, broadly symmetrical ship")
        print("- AFT (rear) wing protrusions")
        print("- Bridge tower")
        print("- Several large engine exhausts jutting out the back")
        print("- Weapons under winglet protrusions")
        
        # Based on description and cross-sections:
        # - Ship is LONG along X axis (236 units)
        # - Z is front-to-back (142 units)
        # - Y is height (150 units)
        
        print("\nCorrected understanding:")
        print("- X axis is the LONG axis (236 units) - ship length")
        print("- Y is height (150 units)")
        print("- Z is width/depth (142 units)")
        
        # AFT = rear = positive X (based on longest dimension)
        # Weapons under rear wing protrusions
        # Engines at very rear (max X)
        
        # Find rear section (AFT) - last 25% of X axis
        aft_threshold = bounds[0][0] + dimensions[0] * 0.75
        aft_vertices = vertices[vertices[:, 0] > aft_threshold]
        
        print(f"\nAFT section (X > {aft_threshold:.1f}):")
        print(f"  {len(aft_vertices)} vertices")
        
        # Find wing protrusions in AFT section by looking at Z extremes
        if len(aft_vertices) > 0:
            # Left wing (negative Z)
            left_wing_verts = aft_vertices[aft_vertices[:, 2] < np.percentile(aft_vertices[:, 2], 30)]
            if len(left_wing_verts) > 0:
                left_wing_pos = np.mean(left_wing_verts, axis=0)
                # Weapon is UNDER the wing
                left_weapon = [left_wing_pos[0] - 10, left_wing_pos[1] - 10, left_wing_pos[2]]
                print(f"  Left wing weapon: [{left_weapon[0]:.1f}, {left_weapon[1]:.1f}, {left_weapon[2]:.1f}]")
            
            # Right wing (positive Z)
            right_wing_verts = aft_vertices[aft_vertices[:, 2] > np.percentile(aft_vertices[:, 2], 70)]
            if len(right_wing_verts) > 0:
                right_wing_pos = np.mean(right_wing_verts, axis=0)
                # Weapon is UNDER the wing
                right_weapon = [right_wing_pos[0] - 10, right_wing_pos[1] - 10, right_wing_pos[2]]
                print(f"  Right wing weapon: [{right_weapon[0]:.1f}, {right_weapon[1]:.1f}, {right_weapon[2]:.1f}]")
        
        # Find engine exhausts at very rear (max X)
        rear_threshold = bounds[1][0] - dimensions[0] * 0.05
        rear_vertices = vertices[vertices[:, 0] > rear_threshold]
        
        print(f"\nEngine analysis (X > {rear_threshold:.1f}):")
        print(f"  {len(rear_vertices)} vertices at rear")
        
        # Engines are large exhausts - look for clusters
        if len(rear_vertices) > 100:
            # Simple clustering by Z position
            z_positions = rear_vertices[:, 2]
            
            # Main central engine
            center_engines = rear_vertices[np.abs(z_positions) < 20]
            if len(center_engines) > 0:
                main_engine = np.mean(center_engines, axis=0)
                print(f"  Main engine: [{main_engine[0]:.1f}, {main_engine[1]:.1f}, {main_engine[2]:.1f}]")
            
            # Side engines
            left_engines = rear_vertices[z_positions < -20]
            if len(left_engines) > 0:
                left_engine = np.mean(left_engines, axis=0)
                print(f"  Left engine: [{left_engine[0]:.1f}, {left_engine[1]:.1f}, {left_engine[2]:.1f}]")
            
            right_engines = rear_vertices[z_positions > 20]
            if len(right_engines) > 0:
                right_engine = np.mean(right_engines, axis=0)
                print(f"  Right engine: [{right_engine[0]:.1f}, {right_engine[1]:.1f}, {right_engine[2]:.1f}]")
        
        print("\nREVISED CONFIGURATION:")
        print("""
'Starship_Calypso': {
    nativeLength: 236.18,  // X-axis is length!
    desiredLength: 20,
    
    // Weapons under AFT wing protrusions
    weaponHardpoints: [
        { position: { x: 70.0, y: -30.0, z: -50.0 }, type: 'cannon' },  // Under left aft wing
        { position: { x: 70.0, y: -30.0, z: 50.0 }, type: 'cannon' },   // Under right aft wing
    ],
    
    // Multiple engine exhausts at rear
    enginePositions: [
        { position: { x: 110.0, y: -20.0, z: 0.0 }, scale: 1.0, type: 'main' },       // Central main
        { position: { x: 110.0, y: -20.0, z: -30.0 }, scale: 0.8, type: 'secondary' }, // Left
        { position: { x: 110.0, y: -20.0, z: 30.0 }, scale: 0.8, type: 'secondary' },  // Right
        { position: { x: 105.0, y: -30.0, z: -20.0 }, scale: 0.6, type: 'secondary' }, // Lower left
        { position: { x: 105.0, y: -30.0, z: 20.0 }, scale: 0.6, type: 'secondary' },  // Lower right
    ]
}
        """)
        
    elif model_name == "Sky_Predator":
        # Sky Predator is simpler
        print("\nSky Predator: Simple fighter")
        print("""
'Sky_Predator': {
    nativeLength: 1.99,
    desiredLength: 8,
    
    weaponHardpoints: [
        { position: { x: 0.0, y: 0.0, z: -0.9 }, type: 'cannon' },  // Nose cannon
    ],
    
    enginePositions: [
        { position: { x: 0.0, y: 0.0, z: 0.9 }, scale: 1.0, type: 'main' },  // Rear engine
    ]
}
        """)

def main():
    """Analyze ships based on descriptions"""
    models = [
        {
            'path': '../solar system/textures/Starship_Calypso_0521230350_texture.glb',
            'name': 'Starship_Calypso'
        },
        {
            'path': '../solar system/textures/Sky_Predator_0522121524_texture.glb',
            'name': 'Sky_Predator'
        }
    ]
    
    for model in models:
        if os.path.exists(model['path']):
            analyze_based_on_description(model['path'], model['name'])
        else:
            print(f"File not found: {model['path']}")

if __name__ == "__main__":
    import os
    main() 