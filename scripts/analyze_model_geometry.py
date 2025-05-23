#!/usr/bin/env python3
"""
Advanced GLB Model Geometry Analysis
Examines actual mesh structure to find logical hardpoint positions
"""

import trimesh
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

def analyze_model_geometry(file_path, model_name):
    """Deep analysis of model geometry to understand actual shape"""
    print(f"\n{'='*60}")
    print(f"DETAILED GEOMETRY ANALYSIS: {model_name}")
    print(f"{'='*60}")
    
    try:
        # Load the model
        scene = trimesh.load(file_path)
        
        if isinstance(scene, trimesh.Scene):
            # Get all mesh objects from scene
            meshes = [mesh for mesh in scene.geometry.values() if isinstance(mesh, trimesh.Trimesh)]
            print(f"Scene contains {len(meshes)} mesh objects")
            
            # Combine all meshes
            if len(meshes) > 1:
                combined = trimesh.util.concatenate(meshes)
            else:
                combined = meshes[0]
        else:
            combined = scene
            print("Single mesh object")
        
        # Basic properties
        print(f"Vertices: {len(combined.vertices)}")
        print(f"Faces: {len(combined.faces)}")
        print(f"Volume: {combined.volume:.3f}")
        print(f"Surface Area: {combined.area:.3f}")
        
        # Detailed bounding analysis
        bounds = combined.bounds
        center = combined.centroid
        print(f"Centroid: [{center[0]:.3f}, {center[1]:.3f}, {center[2]:.3f}]")
        print(f"Bounds: X[{bounds[0][0]:.3f}, {bounds[1][0]:.3f}]")
        print(f"        Y[{bounds[0][1]:.3f}, {bounds[1][1]:.3f}]")
        print(f"        Z[{bounds[0][2]:.3f}, {bounds[1][2]:.3f}]")
        
        # Analyze geometry distribution
        vertices = combined.vertices
        
        # Find vertices by position characteristics
        front_vertices = vertices[vertices[:, 2] < center[2] - (bounds[1][2] - bounds[0][2]) * 0.3]
        rear_vertices = vertices[vertices[:, 2] > center[2] + (bounds[1][2] - bounds[0][2]) * 0.3]
        
        print(f"\nGeometry Distribution:")
        print(f"Front section vertices: {len(front_vertices)}")
        print(f"Rear section vertices: {len(rear_vertices)}")
        
        # Analyze cross-sections at different Z positions
        z_positions = np.linspace(bounds[0][2], bounds[1][2], 10)
        cross_sections = []
        
        for z in z_positions:
            tolerance = (bounds[1][2] - bounds[0][2]) * 0.05
            slice_vertices = vertices[np.abs(vertices[:, 2] - z) < tolerance]
            if len(slice_vertices) > 0:
                x_range = slice_vertices[:, 0].max() - slice_vertices[:, 0].min()
                y_range = slice_vertices[:, 1].max() - slice_vertices[:, 1].min()
                cross_sections.append({
                    'z': z,
                    'vertices': len(slice_vertices),
                    'x_range': x_range,
                    'y_range': y_range
                })
        
        print(f"\nCross-section Analysis:")
        for cs in cross_sections:
            print(f"Z={cs['z']:6.1f}: {cs['vertices']:4d} vertices, "
                  f"X-range={cs['x_range']:6.1f}, Y-range={cs['y_range']:6.1f}")
        
        # Find potential hardpoint locations
        hardpoints = find_logical_hardpoints(combined, model_name)
        
        # Create visualization
        create_model_visualization(combined, hardpoints, model_name)
        
        return {
            'vertices': vertices,
            'bounds': bounds,
            'center': center,
            'hardpoints': hardpoints,
            'cross_sections': cross_sections
        }
        
    except Exception as e:
        print(f"Error analyzing {model_name}: {e}")
        return None

def find_logical_hardpoints(mesh, model_name):
    """Find logical positions for weapons and thrusters based on actual geometry"""
    bounds = mesh.bounds
    center = mesh.centroid
    vertices = mesh.vertices
    
    hardpoints = {
        'weapons': [],
        'engines': []
    }
    
    # Define search regions
    front_z = bounds[0][2]
    rear_z = bounds[1][2]
    center_z = center[2]
    
    # More conservative approach - look for actual geometric features
    front_region = vertices[vertices[:, 2] < center_z - (rear_z - front_z) * 0.2]
    rear_region = vertices[vertices[:, 2] > center_z + (rear_z - front_z) * 0.2]
    
    if len(front_region) > 0:
        # Find weapon positions in front region
        front_center = np.mean(front_region, axis=0)
        
        # Look for symmetrical positions
        front_left = front_region[front_region[:, 0] < front_center[0] - 2]
        front_right = front_region[front_region[:, 0] > front_center[0] + 2]
        
        if len(front_left) > 0 and len(front_right) > 0:
            left_pos = np.mean(front_left, axis=0)
            right_pos = np.mean(front_right, axis=0)
            
            hardpoints['weapons'] = [
                {'position': right_pos, 'type': 'cannon'},
                {'position': left_pos, 'type': 'cannon'}
            ]
        else:
            # Single central weapon
            hardpoints['weapons'] = [
                {'position': front_center, 'type': 'cannon'}
            ]
    
    if len(rear_region) > 0:
        # Find engine positions in rear region
        rear_center = np.mean(rear_region, axis=0)
        
        # Main engine at center
        hardpoints['engines'] = [
            {'position': rear_center, 'type': 'main', 'scale': 1.0}
        ]
        
        # Look for secondary engine positions
        rear_left = rear_region[rear_region[:, 0] < rear_center[0] - 3]
        rear_right = rear_region[rear_region[:, 0] > rear_center[0] + 3]
        
        if len(rear_left) > 5 and len(rear_right) > 5:
            left_engine = np.mean(rear_left, axis=0)
            right_engine = np.mean(rear_right, axis=0)
            
            hardpoints['engines'].extend([
                {'position': right_engine, 'type': 'secondary', 'scale': 0.7},
                {'position': left_engine, 'type': 'secondary', 'scale': 0.7}
            ])
    
    print(f"\nLogical Hardpoints Found:")
    print(f"Weapons: {len(hardpoints['weapons'])}")
    for i, wp in enumerate(hardpoints['weapons']):
        pos = wp['position']
        print(f"  {i+1}. {wp['type']}: ({pos[0]:.2f}, {pos[1]:.2f}, {pos[2]:.2f})")
    
    print(f"Engines: {len(hardpoints['engines'])}")
    for i, ep in enumerate(hardpoints['engines']):
        pos = ep['position']
        print(f"  {i+1}. {ep['type']}: ({pos[0]:.2f}, {pos[1]:.2f}, {pos[2]:.2f})")
    
    return hardpoints

def create_model_visualization(mesh, hardpoints, model_name):
    """Create a 3D visualization of the model with hardpoints"""
    try:
        fig = plt.figure(figsize=(15, 10))
        
        # 3D scatter plot of vertices
        ax1 = fig.add_subplot(221, projection='3d')
        vertices = mesh.vertices
        
        # Sample vertices for visualization (too many to plot all)
        sample_size = min(1000, len(vertices))
        sample_indices = np.random.choice(len(vertices), sample_size, replace=False)
        sample_vertices = vertices[sample_indices]
        
        ax1.scatter(sample_vertices[:, 0], sample_vertices[:, 1], sample_vertices[:, 2], 
                   alpha=0.6, s=1, c=sample_vertices[:, 2], cmap='viridis')
        
        # Plot hardpoints
        for wp in hardpoints['weapons']:
            pos = wp['position']
            ax1.scatter([pos[0]], [pos[1]], [pos[2]], color='red', s=100, marker='^')
        
        for ep in hardpoints['engines']:
            pos = ep['position']
            ax1.scatter([pos[0]], [pos[1]], [pos[2]], color='orange', s=100, marker='o')
        
        ax1.set_title(f'{model_name} - 3D Structure')
        ax1.set_xlabel('X')
        ax1.set_ylabel('Y')
        ax1.set_zlabel('Z')
        
        # Top view (X-Z plane)
        ax2 = fig.add_subplot(222)
        ax2.scatter(sample_vertices[:, 0], sample_vertices[:, 2], alpha=0.6, s=1)
        for wp in hardpoints['weapons']:
            pos = wp['position']
            ax2.scatter([pos[0]], [pos[2]], color='red', s=50, marker='^')
        for ep in hardpoints['engines']:
            pos = ep['position']
            ax2.scatter([pos[0]], [pos[2]], color='orange', s=50, marker='o')
        ax2.set_title('Top View (X-Z)')
        ax2.set_xlabel('X')
        ax2.set_ylabel('Z')
        ax2.grid(True)
        
        # Side view (Y-Z plane)
        ax3 = fig.add_subplot(223)
        ax3.scatter(sample_vertices[:, 1], sample_vertices[:, 2], alpha=0.6, s=1)
        for wp in hardpoints['weapons']:
            pos = wp['position']
            ax3.scatter([pos[1]], [pos[2]], color='red', s=50, marker='^')
        for ep in hardpoints['engines']:
            pos = ep['position']
            ax3.scatter([pos[1]], [pos[2]], color='orange', s=50, marker='o')
        ax3.set_title('Side View (Y-Z)')
        ax3.set_xlabel('Y')
        ax3.set_ylabel('Z')
        ax3.grid(True)
        
        # Front view (X-Y plane)
        ax4 = fig.add_subplot(224)
        ax4.scatter(sample_vertices[:, 0], sample_vertices[:, 1], alpha=0.6, s=1)
        for wp in hardpoints['weapons']:
            pos = wp['position']
            ax4.scatter([pos[0]], [pos[1]], color='red', s=50, marker='^')
        for ep in hardpoints['engines']:
            pos = ep['position']
            ax4.scatter([pos[0]], [pos[1]], color='orange', s=50, marker='o')
        ax4.set_title('Front View (X-Y)')
        ax4.set_xlabel('X')
        ax4.set_ylabel('Y')
        ax4.grid(True)
        
        plt.tight_layout()
        plt.savefig(f'{model_name}_analysis.png', dpi=150, bbox_inches='tight')
        print(f"\nVisualization saved as {model_name}_analysis.png")
        
    except Exception as e:
        print(f"Could not create visualization: {e}")

def generate_accurate_config(analysis_data, model_name):
    """Generate ship configuration based on actual geometry analysis"""
    if not analysis_data:
        return
    
    hardpoints = analysis_data['hardpoints']
    center = analysis_data['center']
    
    print(f"\n{'='*60}")
    print(f"ACCURATE CONFIGURATION FOR {model_name}")
    print(f"{'='*60}")
    
    print("weaponHardpoints: [")
    for i, wp in enumerate(hardpoints['weapons']):
        pos = wp['position']
        # Offset relative to center
        rel_pos = pos - center
        print(f"    {{ position: {{ x: {rel_pos[0]:.1f}, y: {rel_pos[1]:.1f}, z: {rel_pos[2]:.1f} }}, type: '{wp['type']}' }},")
    print("],")
    
    print("\nenginePositions: [")
    for i, ep in enumerate(hardpoints['engines']):
        pos = ep['position']
        # Offset relative to center
        rel_pos = pos - center
        print(f"    {{ position: {{ x: {rel_pos[0]:.1f}, y: {rel_pos[1]:.1f}, z: {rel_pos[2]:.1f} }}, scale: {ep['scale']}, type: '{ep['type']}' }},")
    print("]")

def main():
    """Analyze both ship models"""
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
            analysis = analyze_model_geometry(model['path'], model['name'])
            if analysis:
                generate_accurate_config(analysis, model['name'])
        else:
            print(f"File not found: {model['path']}")

if __name__ == "__main__":
    import os
    main() 