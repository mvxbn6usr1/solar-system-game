#!/usr/bin/env python3
"""
Intelligent Hardpoint Finder
Analyzes actual ship structure to find real weapon and engine positions
"""

import trimesh
import numpy as np
import matplotlib.pyplot as plt

def find_intelligent_hardpoints(file_path, model_name):
    """Find actual hardpoints by analyzing ship structure intelligently"""
    print(f"\n{'='*60}")
    print(f"INTELLIGENT HARDPOINT ANALYSIS: {model_name}")
    print(f"{'='*60}")
    
    # Load the model
    scene = trimesh.load(file_path)
    
    if isinstance(scene, trimesh.Scene):
        meshes = [mesh for mesh in scene.geometry.values() if isinstance(mesh, trimesh.Trimesh)]
        if len(meshes) > 1:
            combined = trimesh.util.concatenate(meshes)
        else:
            combined = meshes[0]
    else:
        combined = scene
    
    vertices = combined.vertices
    bounds = combined.bounds
    center = combined.centroid
    
    print(f"Ship bounds: X[{bounds[0][0]:.2f}, {bounds[1][0]:.2f}]")
    print(f"            Y[{bounds[0][1]:.2f}, {bounds[1][1]:.2f}]") 
    print(f"            Z[{bounds[0][2]:.2f}, {bounds[1][2]:.2f}]")
    print(f"Centroid: [{center[0]:.2f}, {center[1]:.2f}, {center[2]:.2f}]")
    
    if model_name == 'Starship_Calypso':
        return analyze_starship_calypso(vertices, bounds, center)
    elif model_name == 'Sky_Predator':
        return analyze_sky_predator(vertices, bounds, center)
    else:
        return analyze_generic_ship(vertices, bounds, center)

def analyze_starship_calypso(vertices, bounds, center):
    """Analyze Starship Calypso structure for actual hardpoints"""
    print("\nAnalyzing Starship Calypso structure...")
    
    # From the cross-sections, I can see the ship structure:
    # - Front nose area: Z < -40
    # - Main wing area: Z ~ -20 to 20  
    # - Engine area: Z > 40
    
    # Find front weapon positions by looking at wing tips in front section
    front_section = vertices[vertices[:, 2] < -35]  # Front 25% based on visual analysis
    
    if len(front_section) > 0:
        print(f"Front section: {len(front_section)} vertices")
        print(f"  X range: [{front_section[:, 0].min():.1f}, {front_section[:, 0].max():.1f}]")
        print(f"  Y range: [{front_section[:, 1].min():.1f}, {front_section[:, 1].max():.1f}]")
        print(f"  Z range: [{front_section[:, 2].min():.1f}, {front_section[:, 2].max():.1f}]")
        
        # Look for weapon positions at the extreme wing tips
        # Based on cross-sections, the ship has distinct left and right structures
        
        # Find leftmost and rightmost points in front section
        left_extreme = front_section[front_section[:, 0] == front_section[:, 0].min()]
        right_extreme = front_section[front_section[:, 0] == front_section[:, 0].max()]
        
        # Get the most forward points of each wing tip
        left_weapon = left_extreme[left_extreme[:, 2] == left_extreme[:, 2].min()][0]
        right_weapon = right_extreme[right_extreme[:, 2] == right_extreme[:, 2].min()][0]
        
        print(f"  Left wing tip weapon: [{left_weapon[0]:.1f}, {left_weapon[1]:.1f}, {left_weapon[2]:.1f}]")
        print(f"  Right wing tip weapon: [{right_weapon[0]:.1f}, {right_weapon[1]:.1f}, {right_weapon[2]:.1f}]")
    
    # Find engine positions in rear section
    rear_section = vertices[vertices[:, 2] > 35]  # Rear 25% based on visual analysis
    
    if len(rear_section) > 0:
        print(f"\nRear section: {len(rear_section)} vertices")
        print(f"  X range: [{rear_section[:, 0].min():.1f}, {rear_section[:, 0].max():.1f}]")
        print(f"  Y range: [{rear_section[:, 1].min():.1f}, {rear_section[:, 1].max():.1f}]")
        print(f"  Z range: [{rear_section[:, 2].min():.1f}, {rear_section[:, 2].max():.1f}]")
        
        # Find the rearmost point (main engine)
        main_engine = rear_section[rear_section[:, 2] == rear_section[:, 2].max()]
        main_engine_center = np.mean(main_engine, axis=0)
        
        print(f"  Main engine (rearmost): [{main_engine_center[0]:.1f}, {main_engine_center[1]:.1f}, {main_engine_center[2]:.1f}]")
        
        # Find secondary engines at wing positions
        rear_left = rear_section[rear_section[:, 0] < center[0]]
        rear_right = rear_section[rear_section[:, 0] > center[0]]
        
        if len(rear_left) > 0:
            left_engine = np.mean(rear_left, axis=0)
            print(f"  Left wing engine: [{left_engine[0]:.1f}, {left_engine[1]:.1f}, {left_engine[2]:.1f}]")
        
        if len(rear_right) > 0:
            right_engine = np.mean(rear_right, axis=0)
            print(f"  Right wing engine: [{right_engine[0]:.1f}, {right_engine[1]:.1f}, {right_engine[2]:.1f}]")
    
    # Analyze ship asymmetry
    left_side = vertices[vertices[:, 0] < center[0]]
    right_side = vertices[vertices[:, 0] > center[0]]
    
    print(f"\nAsymmetry analysis:")
    print(f"  Left side vertices: {len(left_side)}")
    print(f"  Right side vertices: {len(right_side)}")
    print(f"  Asymmetry ratio: {len(right_side)/len(left_side):.2f}")
    
    # Return corrected hardpoints based on actual structure analysis
    return {
        'weapons': [
            {'pos': left_weapon, 'type': 'left_cannon'},
            {'pos': right_weapon, 'type': 'right_cannon'}
        ],
        'engines': [
            {'pos': main_engine_center, 'scale': 1.0, 'type': 'main'},
            {'pos': left_engine if 'left_engine' in locals() else [0,0,0], 'scale': 0.6, 'type': 'left_secondary'},
            {'pos': right_engine if 'right_engine' in locals() else [0,0,0], 'scale': 0.6, 'type': 'right_secondary'}
        ]
    }

def analyze_sky_predator(vertices, bounds, center):
    """Analyze Sky Predator structure for actual hardpoints"""
    print("\nAnalyzing Sky Predator structure...")
    
    # Much smaller, simpler ship - find nose and tail
    front_section = vertices[vertices[:, 2] < center[2]]
    rear_section = vertices[vertices[:, 2] > center[2]]
    
    print(f"Front section: {len(front_section)} vertices")
    print(f"Rear section: {len(rear_section)} vertices")
    
    # Find the absolute front point (nose) for weapon
    front_point = vertices[vertices[:, 2] == vertices[:, 2].min()]
    nose_weapon = np.mean(front_point, axis=0)
    
    # Find the absolute rear point for engine
    rear_point = vertices[vertices[:, 2] == vertices[:, 2].max()]
    rear_engine = np.mean(rear_point, axis=0)
    
    print(f"Nose weapon position: [{nose_weapon[0]:.2f}, {nose_weapon[1]:.2f}, {nose_weapon[2]:.2f}]")
    print(f"Rear engine position: [{rear_engine[0]:.2f}, {rear_engine[1]:.2f}, {rear_engine[2]:.2f}]")
    
    return {
        'weapons': [
            {'pos': nose_weapon, 'type': 'nose_cannon'}
        ],
        'engines': [
            {'pos': rear_engine, 'scale': 1.0, 'type': 'main'}
        ]
    }

def analyze_generic_ship(vertices, bounds, center):
    """Generic analysis for unknown ships"""
    print("\nAnalyzing generic ship structure...")
    
    # Simple front/rear analysis
    front_quarter = vertices[vertices[:, 2] < center[2] - (bounds[1][2] - bounds[0][2]) * 0.25]
    rear_quarter = vertices[vertices[:, 2] > center[2] + (bounds[1][2] - bounds[0][2]) * 0.25]
    
    weapons = []
    engines = []
    
    if len(front_quarter) > 0:
        front_center = np.mean(front_quarter, axis=0)
        weapons.append({'pos': front_center, 'type': 'forward_cannon'})
    
    if len(rear_quarter) > 0:
        rear_center = np.mean(rear_quarter, axis=0)
        engines.append({'pos': rear_center, 'scale': 1.0, 'type': 'main'})
    
    return {
        'weapons': weapons,
        'engines': engines
    }

def create_visual_hardpoint_analysis(file_path, model_name, hardpoints):
    """Create visualization showing the found hardpoints"""
    scene = trimesh.load(file_path)
    
    if isinstance(scene, trimesh.Scene):
        meshes = [mesh for mesh in scene.geometry.values() if isinstance(mesh, trimesh.Trimesh)]
        combined = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
    else:
        combined = scene
    
    vertices = combined.vertices
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    
    # Top view with hardpoints
    ax1 = axes[0]
    ax1.scatter(vertices[:, 0], vertices[:, 2], s=0.1, alpha=0.3, c='blue')
    
    # Plot weapon hardpoints
    for weapon in hardpoints['weapons']:
        pos = weapon['pos']
        ax1.scatter(pos[0], pos[2], s=100, c='red', marker='^', label=f"Weapon: {weapon['type']}")
    
    # Plot engine hardpoints
    for engine in hardpoints['engines']:
        pos = engine['pos']
        ax1.scatter(pos[0], pos[2], s=100, c='orange', marker='s', label=f"Engine: {engine['type']}")
    
    ax1.set_title(f'{model_name} - Top View with Hardpoints')
    ax1.set_xlabel('X'); ax1.set_ylabel('Z')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.set_aspect('equal')
    
    # Side view with hardpoints
    ax2 = axes[1]
    ax2.scatter(vertices[:, 1], vertices[:, 2], s=0.1, alpha=0.3, c='blue')
    
    for weapon in hardpoints['weapons']:
        pos = weapon['pos']
        ax2.scatter(pos[1], pos[2], s=100, c='red', marker='^', label=f"Weapon: {weapon['type']}")
    
    for engine in hardpoints['engines']:
        pos = engine['pos']
        ax2.scatter(pos[1], pos[2], s=100, c='orange', marker='s', label=f"Engine: {engine['type']}")
    
    ax2.set_title(f'{model_name} - Side View with Hardpoints')
    ax2.set_xlabel('Y'); ax2.set_ylabel('Z')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    ax2.set_aspect('equal')
    
    # Front view with hardpoints
    ax3 = axes[2]
    ax3.scatter(vertices[:, 0], vertices[:, 1], s=0.1, alpha=0.3, c='blue')
    
    for weapon in hardpoints['weapons']:
        pos = weapon['pos']
        ax3.scatter(pos[0], pos[1], s=100, c='red', marker='^', label=f"Weapon: {weapon['type']}")
    
    for engine in hardpoints['engines']:
        pos = engine['pos']
        ax3.scatter(pos[0], pos[1], s=100, c='orange', marker='s', label=f"Engine: {engine['type']}")
    
    ax3.set_title(f'{model_name} - Front View with Hardpoints')
    ax3.set_xlabel('X'); ax3.set_ylabel('Y')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    ax3.set_aspect('equal')
    
    plt.tight_layout()
    plt.savefig(f'{model_name}_intelligent_hardpoints.png', dpi=150, bbox_inches='tight')
    print(f"Intelligent hardpoint analysis saved as {model_name}_intelligent_hardpoints.png")

def main():
    """Analyze both ship models intelligently"""
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
    
    all_hardpoints = {}
    
    for model in models:
        if os.path.exists(model['path']):
            hardpoints = find_intelligent_hardpoints(model['path'], model['name'])
            all_hardpoints[model['name']] = hardpoints
            create_visual_hardpoint_analysis(model['path'], model['name'], hardpoints)
        else:
            print(f"File not found: {model['path']}")
    
    # Generate corrected configuration
    print("\n" + "="*70)
    print("CORRECTED SHIP CONFIGURATIONS")
    print("="*70)
    
    for ship_name, hardpoints in all_hardpoints.items():
        print(f"\n'{ship_name}': {{")
        print("    'weaponHardpoints': [")
        for weapon in hardpoints['weapons']:
            pos = weapon['pos']
            print(f"        {{ position: {{ x: {pos[0]:.1f}, y: {pos[1]:.1f}, z: {pos[2]:.1f} }}, type: '{weapon['type']}' }},")
        print("    ],")
        print("    'enginePositions': [")
        for engine in hardpoints['engines']:
            pos = engine['pos']
            print(f"        {{ position: {{ x: {pos[0]:.1f}, y: {pos[1]:.1f}, z: {pos[2]:.1f} }}, scale: {engine['scale']}, type: '{engine['type']}' }},")
        print("    ]")
        print("},")

if __name__ == "__main__":
    import os
    main() 