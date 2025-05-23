#!/usr/bin/env python3
"""
True Geometry Viewer
Creates detailed visualizations to actually see ship structure
"""

import trimesh
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

def create_detailed_visualizations(file_path, model_name):
    """Create multiple detailed views of the actual geometry"""
    print(f"\n{'='*60}")
    print(f"TRUE GEOMETRY VISUALIZATION: {model_name}")
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
    
    bounds = combined.bounds
    center = combined.centroid
    vertices = combined.vertices
    faces = combined.faces
    
    print(f"Vertices: {len(vertices)}, Faces: {len(faces)}")
    print(f"Bounds: X[{bounds[0][0]:.2f}, {bounds[1][0]:.2f}]")
    print(f"        Y[{bounds[0][1]:.2f}, {bounds[1][1]:.2f}]") 
    print(f"        Z[{bounds[0][2]:.2f}, {bounds[1][2]:.2f}]")
    print(f"Centroid: [{center[0]:.2f}, {center[1]:.2f}, {center[2]:.2f}]")
    
    # Create comprehensive visualization
    create_mesh_wireframe_view(combined, model_name)
    create_cross_section_analysis(combined, model_name)
    create_density_maps(combined, model_name)
    
    return combined

def create_mesh_wireframe_view(mesh, model_name):
    """Create wireframe view to see actual ship structure"""
    fig = plt.figure(figsize=(20, 15))
    vertices = mesh.vertices
    faces = mesh.faces
    
    # 3D wireframe view
    ax1 = fig.add_subplot(231, projection='3d')
    
    # Draw edges of faces to show structure
    for face in faces[::10]:  # Sample every 10th face to avoid overcrowding
        triangle = vertices[face]
        # Draw triangle edges
        for i in range(3):
            start = triangle[i]
            end = triangle[(i+1)%3]
            ax1.plot([start[0], end[0]], [start[1], end[1]], [start[2], end[2]], 
                    'b-', alpha=0.3, linewidth=0.5)
    
    ax1.set_title(f'{model_name} - Wireframe Structure')
    ax1.set_xlabel('X'); ax1.set_ylabel('Y'); ax1.set_zlabel('Z')
    
    # Top view wireframe
    ax2 = fig.add_subplot(232)
    for face in faces[::20]:
        triangle = vertices[face]
        triangle_x = triangle[:, 0]
        triangle_z = triangle[:, 2]
        # Close the triangle
        triangle_x = np.append(triangle_x, triangle_x[0])
        triangle_z = np.append(triangle_z, triangle_z[0])
        ax2.plot(triangle_x, triangle_z, 'b-', alpha=0.3, linewidth=0.3)
    
    ax2.set_title('Top View (X-Z) - Structure')
    ax2.set_xlabel('X'); ax2.set_ylabel('Z')
    ax2.grid(True, alpha=0.3)
    ax2.set_aspect('equal')
    
    # Side view wireframe
    ax3 = fig.add_subplot(233)
    for face in faces[::20]:
        triangle = vertices[face]
        triangle_y = triangle[:, 1]
        triangle_z = triangle[:, 2]
        triangle_y = np.append(triangle_y, triangle_y[0])
        triangle_z = np.append(triangle_z, triangle_z[0])
        ax3.plot(triangle_y, triangle_z, 'b-', alpha=0.3, linewidth=0.3)
    
    ax3.set_title('Side View (Y-Z) - Structure')
    ax3.set_xlabel('Y'); ax3.set_ylabel('Z')
    ax3.grid(True, alpha=0.3)
    ax3.set_aspect('equal')
    
    # Front view wireframe
    ax4 = fig.add_subplot(234)
    for face in faces[::20]:
        triangle = vertices[face]
        triangle_x = triangle[:, 0]
        triangle_y = triangle[:, 1]
        triangle_x = np.append(triangle_x, triangle_x[0])
        triangle_y = np.append(triangle_y, triangle_y[0])
        ax4.plot(triangle_x, triangle_y, 'b-', alpha=0.3, linewidth=0.3)
    
    ax4.set_title('Front View (X-Y) - Structure')
    ax4.set_xlabel('X'); ax4.set_ylabel('Y')
    ax4.grid(True, alpha=0.3)
    ax4.set_aspect('equal')
    
    # Vertex density plot
    ax5 = fig.add_subplot(235)
    hist, xedges, yedges = np.histogram2d(vertices[:, 0], vertices[:, 2], bins=50)
    im = ax5.imshow(hist.T, origin='lower', extent=[xedges[0], xedges[-1], yedges[0], yedges[-1]], 
                    cmap='hot', alpha=0.8)
    ax5.set_title('Vertex Density (Top View)')
    ax5.set_xlabel('X'); ax5.set_ylabel('Z')
    plt.colorbar(im, ax=ax5)
    
    # Profile analysis
    ax6 = fig.add_subplot(236)
    hist2, xedges2, yedges2 = np.histogram2d(vertices[:, 1], vertices[:, 2], bins=50)
    im2 = ax6.imshow(hist2.T, origin='lower', extent=[xedges2[0], xedges2[-1], yedges2[0], yedges2[-1]], 
                     cmap='hot', alpha=0.8)
    ax6.set_title('Vertex Density (Side View)')
    ax6.set_xlabel('Y'); ax6.set_ylabel('Z')
    plt.colorbar(im2, ax=ax6)
    
    plt.tight_layout()
    plt.savefig(f'{model_name}_wireframe_analysis.png', dpi=150, bbox_inches='tight')
    print(f"Wireframe analysis saved as {model_name}_wireframe_analysis.png")

def create_cross_section_analysis(mesh, model_name):
    """Analyze cross-sections to understand ship structure"""
    vertices = mesh.vertices
    bounds = mesh.bounds
    
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    
    # Z-axis cross-sections (front to back)
    z_positions = np.linspace(bounds[0][2], bounds[1][2], 6)
    
    for i, z_pos in enumerate(z_positions):
        if i >= 6: break
        row = i // 3
        col = i % 3
        ax = axes[row, col]
        
        # Find vertices near this Z position
        tolerance = (bounds[1][2] - bounds[0][2]) * 0.02
        slice_mask = np.abs(vertices[:, 2] - z_pos) < tolerance
        slice_vertices = vertices[slice_mask]
        
        if len(slice_vertices) > 0:
            ax.scatter(slice_vertices[:, 0], slice_vertices[:, 1], s=1, alpha=0.6)
            ax.set_title(f'Cross-section Z={z_pos:.1f}\n({len(slice_vertices)} vertices)')
            ax.set_xlabel('X')
            ax.set_ylabel('Y')
            ax.grid(True, alpha=0.3)
            ax.set_aspect('equal')
            
            # Find extremes for this slice
            if len(slice_vertices) > 10:
                x_range = slice_vertices[:, 0].max() - slice_vertices[:, 0].min()
                y_range = slice_vertices[:, 1].max() - slice_vertices[:, 1].min()
                ax.text(0.02, 0.98, f'X-range: {x_range:.1f}\nY-range: {y_range:.1f}', 
                       transform=ax.transAxes, verticalalignment='top',
                       bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    plt.tight_layout()
    plt.savefig(f'{model_name}_cross_sections.png', dpi=150, bbox_inches='tight')
    print(f"Cross-section analysis saved as {model_name}_cross_sections.png")

def create_density_maps(mesh, model_name):
    """Create detailed density maps to show ship structure"""
    vertices = mesh.vertices
    bounds = mesh.bounds
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # High-resolution density map - Top view
    ax1 = axes[0, 0]
    hist, xedges, yedges = np.histogram2d(vertices[:, 0], vertices[:, 2], bins=100)
    im1 = ax1.imshow(hist.T, origin='lower', extent=[xedges[0], xedges[-1], yedges[0], yedges[-1]], 
                     cmap='plasma', alpha=0.9)
    ax1.set_title('High-Res Density Map (Top View)')
    ax1.set_xlabel('X'); ax1.set_ylabel('Z')
    plt.colorbar(im1, ax=ax1)
    
    # High-resolution density map - Side view
    ax2 = axes[0, 1]
    hist2, xedges2, yedges2 = np.histogram2d(vertices[:, 1], vertices[:, 2], bins=100)
    im2 = ax2.imshow(hist2.T, origin='lower', extent=[xedges2[0], xedges2[-1], yedges2[0], yedges2[-1]], 
                     cmap='plasma', alpha=0.9)
    ax2.set_title('High-Res Density Map (Side View)')
    ax2.set_xlabel('Y'); ax2.set_ylabel('Z')
    plt.colorbar(im2, ax=ax2)
    
    # Edge detection on top view
    ax3 = axes[1, 0]
    from scipy import ndimage
    edges = ndimage.sobel(hist.T)
    im3 = ax3.imshow(edges, origin='lower', extent=[xedges[0], xedges[-1], yedges[0], yedges[-1]], 
                     cmap='gray', alpha=0.9)
    ax3.set_title('Edge Detection (Top View)')
    ax3.set_xlabel('X'); ax3.set_ylabel('Z')
    plt.colorbar(im3, ax=ax3)
    
    # Edge detection on side view
    ax4 = axes[1, 1]
    edges2 = ndimage.sobel(hist2.T)
    im4 = ax4.imshow(edges2, origin='lower', extent=[xedges2[0], xedges2[-1], yedges2[0], yedges2[-1]], 
                     cmap='gray', alpha=0.9)
    ax4.set_title('Edge Detection (Side View)')
    ax4.set_xlabel('Y'); ax4.set_ylabel('Z')
    plt.colorbar(im4, ax=ax4)
    
    plt.tight_layout()
    plt.savefig(f'{model_name}_density_maps.png', dpi=150, bbox_inches='tight')
    print(f"Density maps saved as {model_name}_density_maps.png")

def analyze_ship_features(mesh, model_name):
    """Analyze specific ship features for hardpoint placement"""
    vertices = mesh.vertices
    bounds = mesh.bounds
    center = mesh.centroid
    
    print(f"\nDETAILED FEATURE ANALYSIS for {model_name}:")
    print(f"Centroid: [{center[0]:.2f}, {center[1]:.2f}, {center[2]:.2f}]")
    
    # Analyze front section more carefully
    front_threshold = center[2] - (bounds[1][2] - bounds[0][2]) * 0.25
    front_vertices = vertices[vertices[:, 2] < front_threshold]
    
    if len(front_vertices) > 0:
        print(f"\nFRONT SECTION (Z < {front_threshold:.2f}):")
        print(f"  Vertices: {len(front_vertices)}")
        print(f"  X range: [{front_vertices[:, 0].min():.2f}, {front_vertices[:, 0].max():.2f}]")
        print(f"  Y range: [{front_vertices[:, 1].min():.2f}, {front_vertices[:, 1].max():.2f}]")
        print(f"  Z range: [{front_vertices[:, 2].min():.2f}, {front_vertices[:, 2].max():.2f}]")
        
        # Look for weapon mount points (areas with consistent geometry)
        front_center_x = np.mean(front_vertices[:, 0])
        left_wing = front_vertices[front_vertices[:, 0] < front_center_x - 5]
        right_wing = front_vertices[front_vertices[:, 0] > front_center_x + 5]
        
        if len(left_wing) > 10:
            left_weapon_point = np.mean(left_wing, axis=0)
            print(f"  Left weapon mount candidate: [{left_weapon_point[0]:.2f}, {left_weapon_point[1]:.2f}, {left_weapon_point[2]:.2f}]")
        
        if len(right_wing) > 10:
            right_weapon_point = np.mean(right_wing, axis=0)
            print(f"  Right weapon mount candidate: [{right_weapon_point[0]:.2f}, {right_weapon_point[1]:.2f}, {right_weapon_point[2]:.2f}]")
    
    # Analyze rear section
    rear_threshold = center[2] + (bounds[1][2] - bounds[0][2]) * 0.25
    rear_vertices = vertices[vertices[:, 2] > rear_threshold]
    
    if len(rear_vertices) > 0:
        print(f"\nREAR SECTION (Z > {rear_threshold:.2f}):")
        print(f"  Vertices: {len(rear_vertices)}")
        print(f"  X range: [{rear_vertices[:, 0].min():.2f}, {rear_vertices[:, 0].max():.2f}]")
        print(f"  Y range: [{rear_vertices[:, 1].min():.2f}, {rear_vertices[:, 1].max():.2f}]")
        print(f"  Z range: [{rear_vertices[:, 2].min():.2f}, {rear_vertices[:, 2].max():.2f}]")
        
        # Engine mount analysis
        rear_center = np.mean(rear_vertices, axis=0)
        print(f"  Main engine candidate: [{rear_center[0]:.2f}, {rear_center[1]:.2f}, {rear_center[2]:.2f}]")

def main():
    """Create comprehensive visualizations of both models"""
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
            mesh = create_detailed_visualizations(model['path'], model['name'])
            analyze_ship_features(mesh, model['name'])
        else:
            print(f"File not found: {model['path']}")

if __name__ == "__main__":
    import os
    try:
        from scipy import ndimage
    except ImportError:
        print("Installing scipy for edge detection...")
        import subprocess
        subprocess.run(["uv", "pip", "install", "scipy"])
        from scipy import ndimage
    
    main() 