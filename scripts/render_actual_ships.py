#!/usr/bin/env python3
"""
Render Actual Ships
Actually renders the 3D models so we can SEE the ship structure
"""

import trimesh
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import io

def render_ship_views(file_path, model_name):
    """Render the ship from multiple angles to see actual structure"""
    print(f"\n{'='*60}")
    print(f"RENDERING ACTUAL SHIP: {model_name}")
    print(f"{'='*60}")
    
    # Load the model
    scene = trimesh.load(file_path)
    
    if isinstance(scene, trimesh.Scene):
        # It's a scene, we need to get the mesh
        print("Loaded as scene")
        mesh = scene.dump(concatenate=True)
    else:
        mesh = scene
    
    print(f"Mesh info: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
    print(f"Bounds: {mesh.bounds}")
    
    # Create figure for multiple views
    fig = plt.figure(figsize=(20, 15))
    
    # Define camera angles for different views
    views = [
        ('Top', [0, -90, 0]),      # Looking down from above
        ('Bottom', [0, 90, 0]),    # Looking up from below
        ('Front', [0, 0, 0]),      # Looking from front
        ('Back', [0, 180, 0]),     # Looking from back
        ('Left', [0, -90, 90]),    # Looking from left side
        ('Right', [0, 90, -90]),   # Looking from right side
        ('Iso1', [30, -45, 0]),    # Isometric view 1
        ('Iso2', [30, 135, 0]),    # Isometric view 2
    ]
    
    for i, (view_name, angles) in enumerate(views):
        ax = fig.add_subplot(3, 3, i+1)
        
        # Create a scene for rendering
        scene = mesh.scene()
        
        # Set up camera angle
        # Convert angles to rotation matrix
        R = trimesh.transformations.euler_matrix(
            np.radians(angles[0]), 
            np.radians(angles[1]), 
            np.radians(angles[2])
        )
        
        # Position camera at a good distance
        camera_distance = mesh.bounding_sphere.primitive.radius * 3
        camera_transform = np.eye(4)
        camera_transform[:3, 3] = [0, 0, camera_distance]
        camera_transform = R @ camera_transform
        
        scene.camera_transform = camera_transform
        
        # Render the scene
        try:
            # Get the PNG image
            png = scene.save_image(resolution=[800, 800], visible=True)
            
            # Convert to PIL image
            image = Image.open(io.BytesIO(png))
            
            # Display in matplotlib
            ax.imshow(image)
            ax.set_title(f'{view_name} View')
            ax.axis('off')
        except Exception as e:
            print(f"Error rendering {view_name} view: {e}")
            ax.text(0.5, 0.5, f'Render failed:\n{view_name}', 
                   transform=ax.transAxes, ha='center', va='center')
            ax.axis('off')
    
    plt.tight_layout()
    plt.savefig(f'{model_name}_rendered_views.png', dpi=150, bbox_inches='tight')
    print(f"Rendered views saved as {model_name}_rendered_views.png")
    
    return mesh

def find_geometric_features(mesh, model_name):
    """Find actual geometric features like cylinders (engines), protrusions (wings)"""
    print(f"\nFINDING GEOMETRIC FEATURES for {model_name}")
    
    vertices = mesh.vertices
    
    # Find the main axis of the ship (longest dimension)
    bounds = mesh.bounds
    dimensions = bounds[1] - bounds[0]
    main_axis = np.argmax(dimensions)
    
    axis_names = ['X', 'Y', 'Z']
    print(f"Main axis: {axis_names[main_axis]} (length: {dimensions[main_axis]:.2f})")
    
    # Analyze cross-sections along main axis to find features
    num_slices = 20
    positions = np.linspace(bounds[0][main_axis], bounds[1][main_axis], num_slices)
    
    slice_profiles = []
    for pos in positions:
        # Get vertices near this slice
        tolerance = dimensions[main_axis] / (num_slices * 2)
        mask = np.abs(vertices[:, main_axis] - pos) < tolerance
        slice_verts = vertices[mask]
        
        if len(slice_verts) > 10:
            # Calculate profile metrics
            other_axes = [i for i in range(3) if i != main_axis]
            width = slice_verts[:, other_axes[0]].max() - slice_verts[:, other_axes[0]].min()
            height = slice_verts[:, other_axes[1]].max() - slice_verts[:, other_axes[1]].min()
            area = width * height
            center = slice_verts.mean(axis=0)
            
            slice_profiles.append({
                'position': pos,
                'width': width,
                'height': height,
                'area': area,
                'center': center,
                'vertex_count': len(slice_verts)
            })
    
    # Identify features based on profile changes
    if slice_profiles:
        areas = [p['area'] for p in slice_profiles]
        max_area_idx = np.argmax(areas)
        
        print(f"\nShip profile analysis:")
        print(f"  Widest section at position {slice_profiles[max_area_idx]['position']:.2f}")
        print(f"  Max width: {max(p['width'] for p in slice_profiles):.2f}")
        print(f"  Max height: {max(p['height'] for p in slice_profiles):.2f}")
        
        # Look for engine exhausts (typically at one end with multiple circular features)
        rear_profiles = slice_profiles[-5:]  # Last 5 slices
        front_profiles = slice_profiles[:5]  # First 5 slices
        
        print(f"\nRear section analysis:")
        for p in rear_profiles:
            print(f"  Position {p['position']:.1f}: area={p['area']:.1f}, vertices={p['vertex_count']}")
        
        print(f"\nFront section analysis:")
        for p in front_profiles:
            print(f"  Position {p['position']:.1f}: area={p['area']:.1f}, vertices={p['vertex_count']}")
    
    # Try to identify actual features
    print(f"\nSearching for specific features...")
    
    # Look for cylindrical structures (engines)
    # This is a simplified approach - in reality we'd need more sophisticated shape detection
    
    # Find rear-most section
    if main_axis == 2:  # Z is main axis
        rear_verts = vertices[vertices[:, 2] > bounds[1][2] - dimensions[2] * 0.1]
        front_verts = vertices[vertices[:, 2] < bounds[0][2] + dimensions[2] * 0.1]
        
        print(f"  Rear section: {len(rear_verts)} vertices")
        print(f"  Front section: {len(front_verts)} vertices")
        
        if len(rear_verts) > 0:
            # Cluster rear vertices to find engine positions
            from sklearn.cluster import DBSCAN
            clustering = DBSCAN(eps=dimensions.max() * 0.05, min_samples=50).fit(rear_verts)
            n_clusters = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)
            
            print(f"  Found {n_clusters} potential engine clusters in rear")
            
            engine_positions = []
            for i in range(n_clusters):
                cluster_verts = rear_verts[clustering.labels_ == i]
                engine_pos = cluster_verts.mean(axis=0)
                engine_positions.append(engine_pos)
                print(f"    Engine {i+1}: [{engine_pos[0]:.1f}, {engine_pos[1]:.1f}, {engine_pos[2]:.1f}]")
            
            return {'engines': engine_positions}
    
    return {}

def main():
    """Render and analyze ship models"""
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
            mesh = render_ship_views(model['path'], model['name'])
            features = find_geometric_features(mesh, model['name'])
        else:
            print(f"File not found: {model['path']}")

if __name__ == "__main__":
    import os
    # Check if we need sklearn
    try:
        from sklearn.cluster import DBSCAN
    except ImportError:
        print("Installing scikit-learn for clustering...")
        import subprocess
        subprocess.run(["uv", "pip", "install", "scikit-learn"])
        from sklearn.cluster import DBSCAN
    
    main() 