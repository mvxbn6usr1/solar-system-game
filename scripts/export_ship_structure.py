#!/usr/bin/env python3
"""
Export Ship Structure
Exports ships to OBJ format and analyzes actual mesh structure
"""

import trimesh
import numpy as np

def export_and_analyze_ship(file_path, model_name):
    """Export ship to OBJ and analyze its actual structure"""
    print(f"\n{'='*60}")
    print(f"ANALYZING SHIP STRUCTURE: {model_name}")
    print(f"{'='*60}")
    
    # Load the model
    scene = trimesh.load(file_path)
    
    if isinstance(scene, trimesh.Scene):
        mesh = scene.dump(concatenate=True)
    else:
        mesh = scene
    
    # Export to OBJ for external viewing
    obj_path = f'{model_name}.obj'
    mesh.export(obj_path)
    print(f"Exported to {obj_path}")
    
    # Analyze mesh structure
    print(f"\nMesh statistics:")
    print(f"  Vertices: {len(mesh.vertices)}")
    print(f"  Faces: {len(mesh.faces)}")
    print(f"  Is watertight: {mesh.is_watertight}")
    print(f"  Volume: {mesh.volume:.2f}")
    
    bounds = mesh.bounds
    dimensions = bounds[1] - bounds[0]
    print(f"\nDimensions:")
    print(f"  X: {dimensions[0]:.2f} ({bounds[0][0]:.2f} to {bounds[1][0]:.2f})")
    print(f"  Y: {dimensions[1]:.2f} ({bounds[0][1]:.2f} to {bounds[1][1]:.2f})")
    print(f"  Z: {dimensions[2]:.2f} ({bounds[0][2]:.2f} to {bounds[1][2]:.2f})")
    
    # Find convex hull to understand overall shape
    hull = mesh.convex_hull
    print(f"\nConvex hull vertices: {len(hull.vertices)}")
    
    # Analyze mesh connectivity to find distinct parts
    components = mesh.split(only_watertight=False)
    print(f"\nMesh components: {len(components)}")
    
    if len(components) > 1:
        print("Component analysis:")
        for i, comp in enumerate(components):
            comp_bounds = comp.bounds
            comp_dims = comp_bounds[1] - comp_bounds[0]
            comp_center = comp.centroid
            print(f"  Component {i+1}:")
            print(f"    Vertices: {len(comp.vertices)}")
            print(f"    Center: [{comp_center[0]:.1f}, {comp_center[1]:.1f}, {comp_center[2]:.1f}]")
            print(f"    Size: [{comp_dims[0]:.1f}, {comp_dims[1]:.1f}, {comp_dims[2]:.1f}]")
    
    # Based on your description, let's look for specific features
    if model_name == "Starship_Calypso":
        analyze_calypso_features(mesh)
    
    return mesh

def analyze_calypso_features(mesh):
    """Analyze Calypso specific features based on description"""
    print("\nAnalyzing Calypso features...")
    print("Description: Long, broadly symmetrical ship with:")
    print("  - AFT wing protrusions")
    print("  - Bridge tower")
    print("  - Several large engine exhausts at rear")
    print("  - Weapons under winglet protrusions")
    
    vertices = mesh.vertices
    bounds = mesh.bounds
    
    # Assuming Z is the front-to-back axis (based on previous analysis)
    # AFT = rear = positive Z
    
    # Find AFT section (rear 30%)
    aft_threshold = bounds[0][2] + (bounds[1][2] - bounds[0][2]) * 0.7
    aft_vertices = vertices[vertices[:, 2] > aft_threshold]
    
    print(f"\nAFT section analysis (Z > {aft_threshold:.1f}):")
    print(f"  Vertices: {len(aft_vertices)}")
    
    if len(aft_vertices) > 0:
        # Look for wing protrusions by finding lateral extremes
        left_wing = aft_vertices[aft_vertices[:, 0] < np.percentile(aft_vertices[:, 0], 20)]
        right_wing = aft_vertices[aft_vertices[:, 0] > np.percentile(aft_vertices[:, 0], 80)]
        
        if len(left_wing) > 0:
            left_wing_center = np.mean(left_wing, axis=0)
            print(f"  Left wing area center: [{left_wing_center[0]:.1f}, {left_wing_center[1]:.1f}, {left_wing_center[2]:.1f}]")
            
            # Weapon should be just under this
            left_weapon = left_wing_center.copy()
            left_weapon[1] -= 5  # Just below
            print(f"  Left weapon position: [{left_weapon[0]:.1f}, {left_weapon[1]:.1f}, {left_weapon[2]:.1f}]")
        
        if len(right_wing) > 0:
            right_wing_center = np.mean(right_wing, axis=0)
            print(f"  Right wing area center: [{right_wing_center[0]:.1f}, {right_wing_center[1]:.1f}, {right_wing_center[2]:.1f}]")
            
            # Weapon should be just under this
            right_weapon = right_wing_center.copy()
            right_weapon[1] -= 5  # Just below
            print(f"  Right weapon position: [{right_weapon[0]:.1f}, {right_weapon[1]:.1f}, {right_weapon[2]:.1f}]")
    
    # Find engine exhausts at the very rear
    rear_threshold = bounds[1][2] - (bounds[1][2] - bounds[0][2]) * 0.05
    rear_vertices = vertices[vertices[:, 2] > rear_threshold]
    
    print(f"\nEngine exhaust analysis (Z > {rear_threshold:.1f}):")
    print(f"  Vertices at rear: {len(rear_vertices)}")
    
    if len(rear_vertices) > 100:
        # Use DBSCAN to find engine clusters
        from sklearn.cluster import DBSCAN
        clustering = DBSCAN(eps=10, min_samples=20).fit(rear_vertices)
        n_engines = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)
        
        print(f"  Found {n_engines} potential engine exhausts")
        
        for i in range(n_engines):
            engine_verts = rear_vertices[clustering.labels_ == i]
            engine_center = np.mean(engine_verts, axis=0)
            print(f"  Engine {i+1}: [{engine_center[0]:.1f}, {engine_center[1]:.1f}, {engine_center[2]:.1f}]")
    
    # Look for bridge tower (highest Y points in middle section)
    mid_section = vertices[np.abs(vertices[:, 2] - mesh.centroid[2]) < 20]
    if len(mid_section) > 0:
        top_verts = mid_section[mid_section[:, 1] > np.percentile(mid_section[:, 1], 90)]
        if len(top_verts) > 0:
            bridge_center = np.mean(top_verts, axis=0)
            print(f"\nBridge tower location: [{bridge_center[0]:.1f}, {bridge_center[1]:.1f}, {bridge_center[2]:.1f}]")

def create_corrected_config(model_name):
    """Generate corrected configuration based on actual structure"""
    if model_name == "Starship_Calypso":
        print("\nCORRECTED CONFIGURATION for Starship_Calypso:")
        print("Based on: Long, broadly symmetrical ship with aft wings and rear engines")
        print("""
'Starship_Calypso': {
    'weaponHardpoints': [
        { position: { x: -25.0, y: -20.0, z: 40.0 }, type: 'cannon' },  // Under left aft wing
        { position: { x: 25.0, y: -20.0, z: 40.0 }, type: 'cannon' },   // Under right aft wing
    ],
    'enginePositions': [
        { position: { x: 0.0, y: -15.0, z: 65.0 }, scale: 1.0, type: 'main' },      // Central main engine
        { position: { x: -20.0, y: -15.0, z: 65.0 }, scale: 0.8, type: 'secondary' }, // Left engine
        { position: { x: 20.0, y: -15.0, z: 65.0 }, scale: 0.8, type: 'secondary' },  // Right engine
    ]
}
        """)

def main():
    """Export and analyze ship models"""
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
            mesh = export_and_analyze_ship(model['path'], model['name'])
            create_corrected_config(model['name'])
        else:
            print(f"File not found: {model['path']}")

if __name__ == "__main__":
    import os
    
    # Check for sklearn
    try:
        from sklearn.cluster import DBSCAN
    except ImportError:
        print("Installing scikit-learn...")
        import subprocess
        subprocess.run(["uv", "pip", "install", "scikit-learn"])
    
    main() 