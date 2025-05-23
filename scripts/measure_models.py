#!/usr/bin/env python3
"""
GLB Model Dimension Measurement Script
Accurately measures the dimensions of GLB models using trimesh
"""

import trimesh
import numpy as np
import os

def measure_glb_model(file_path, model_name):
    """Measure the actual dimensions of a GLB model"""
    print(f"\n=== Measuring {model_name} ===")
    print(f"File: {file_path}")
    
    try:
        # Load the GLB file
        mesh = trimesh.load(file_path)
        
        # If it's a scene (multiple meshes), get the combined bounds
        if hasattr(mesh, 'bounds'):
            bounds = mesh.bounds
        else:
            # If it's a scene, get the bounding box of the whole scene
            bounds = mesh.bounding_box.bounds
            
        # Calculate dimensions
        min_bounds = bounds[0]  # [x_min, y_min, z_min]
        max_bounds = bounds[1]  # [x_max, y_max, z_max]
        
        dimensions = max_bounds - min_bounds
        center = (max_bounds + min_bounds) / 2
        
        print(f"Bounding Box:")
        print(f"  Min: [{min_bounds[0]:.3f}, {min_bounds[1]:.3f}, {min_bounds[2]:.3f}]")
        print(f"  Max: [{max_bounds[0]:.3f}, {max_bounds[1]:.3f}, {max_bounds[2]:.3f}]")
        print(f"Dimensions (W x H x L):")
        print(f"  Width (X):  {dimensions[0]:.3f} units")
        print(f"  Height (Y): {dimensions[1]:.3f} units") 
        print(f"  Length (Z): {dimensions[2]:.3f} units")
        print(f"Center: [{center[0]:.3f}, {center[1]:.3f}, {center[2]:.3f}]")
        
        # For engine/weapon positioning, we need to know the rear and front of the model
        rear_z = max_bounds[2]  # Assuming +Z is rear (engines)
        front_z = min_bounds[2]  # Assuming -Z is front (weapons)
        
        print(f"Positioning Reference:")
        print(f"  Front (weapons) Z: {front_z:.3f}")
        print(f"  Rear (engines) Z:  {rear_z:.3f}")
        print(f"  Center Z: {center[2]:.3f}")
        
        return {
            'name': model_name,
            'width': dimensions[0],
            'height': dimensions[1], 
            'length': dimensions[2],
            'center': center.tolist(),
            'min_bounds': min_bounds.tolist(),
            'max_bounds': max_bounds.tolist(),
            'front_z': front_z,
            'rear_z': rear_z
        }
        
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None

def generate_ship_config(measurements):
    """Generate ship configuration based on actual measurements"""
    print(f"\n=== Generated Configuration for {measurements['name']} ===")
    
    # Use the actual length for native dimensions
    native_length = measurements['length']
    center = measurements['center']
    rear_z = measurements['rear_z']
    front_z = measurements['front_z']
    width = measurements['width']
    height = measurements['height']
    
    print(f"nativeLength: {native_length:.3f}")
    
    # Generate engine positions based on actual rear of model
    engines = []
    
    if measurements['name'] == 'Starship_Calypso':
        # Main engine at rear center
        engines.append(f"{{ position: {{ x: 0, y: 0, z: {rear_z-5:.1f} }}, scale: 1.0, type: 'main' }}")
        
        # Secondary engines slightly forward and to sides
        engines.append(f"{{ position: {{ x: {width*0.15:.1f}, y: 0, z: {rear_z-10:.1f} }}, scale: 0.7, type: 'secondary' }}")
        engines.append(f"{{ position: {{ x: {-width*0.15:.1f}, y: 0, z: {rear_z-10:.1f} }}, scale: 0.7, type: 'secondary' }}")
        
        # Maneuvering thrusters at extremities
        # Top thrusters
        engines.append(f"{{ position: {{ x: {width*0.2:.1f}, y: {height*0.3:.1f}, z: {rear_z-20:.1f} }}, scale: 0.3, type: 'maneuvering' }}")
        engines.append(f"{{ position: {{ x: {-width*0.2:.1f}, y: {height*0.3:.1f}, z: {rear_z-20:.1f} }}, scale: 0.3, type: 'maneuvering' }}")
        
        # Bottom thrusters
        engines.append(f"{{ position: {{ x: {width*0.2:.1f}, y: {-height*0.3:.1f}, z: {rear_z-20:.1f} }}, scale: 0.3, type: 'maneuvering' }}")
        engines.append(f"{{ position: {{ x: {-width*0.2:.1f}, y: {-height*0.3:.1f}, z: {rear_z-20:.1f} }}, scale: 0.3, type: 'maneuvering' }}")
        
        # Side thrusters
        engines.append(f"{{ position: {{ x: {width*0.4:.1f}, y: 0, z: {center[2]:.1f} }}, scale: 0.3, type: 'maneuvering' }}")
        engines.append(f"{{ position: {{ x: {-width*0.4:.1f}, y: 0, z: {center[2]:.1f} }}, scale: 0.3, type: 'maneuvering' }}")
        
        # Forward thrusters for braking
        engines.append(f"{{ position: {{ x: {width*0.15:.1f}, y: {height*0.1:.1f}, z: {front_z+20:.1f} }}, scale: 0.25, type: 'maneuvering' }}")
        engines.append(f"{{ position: {{ x: {-width*0.15:.1f}, y: {height*0.1:.1f}, z: {front_z+20:.1f} }}, scale: 0.25, type: 'maneuvering' }}")
        
    elif measurements['name'] == 'Sky_Predator':
        # Main engine at rear
        engines.append(f"{{ position: {{ x: 0, y: 0, z: {rear_z-2:.1f} }}, scale: 0.8, type: 'main' }}")
        
        # Secondary engines
        engines.append(f"{{ position: {{ x: {width*0.15:.1f}, y: 0, z: {rear_z-4:.1f} }}, scale: 0.5, type: 'secondary' }}")
        engines.append(f"{{ position: {{ x: {-width*0.15:.1f}, y: 0, z: {rear_z-4:.1f} }}, scale: 0.5, type: 'secondary' }}")
        
        # Maneuvering thrusters
        engines.append(f"{{ position: {{ x: {width*0.25:.1f}, y: {height*0.2:.1f}, z: {rear_z-6:.1f} }}, scale: 0.2, type: 'maneuvering' }}")
        engines.append(f"{{ position: {{ x: {-width*0.25:.1f}, y: {height*0.2:.1f}, z: {rear_z-6:.1f} }}, scale: 0.2, type: 'maneuvering' }}")
        engines.append(f"{{ position: {{ x: {width*0.25:.1f}, y: {-height*0.2:.1f}, z: {rear_z-6:.1f} }}, scale: 0.2, type: 'maneuvering' }}")
        engines.append(f"{{ position: {{ x: {-width*0.25:.1f}, y: {-height*0.2:.1f}, z: {rear_z-6:.1f} }}, scale: 0.2, type: 'maneuvering' }}")
    
    print("Engine Positions:")
    for engine in engines:
        print(f"  {engine}")
    
    # Generate weapon positions based on front of model
    weapons = []
    if measurements['name'] == 'Starship_Calypso':
        weapons.append(f"{{ position: {{ x: {width*0.1:.1f}, y: {height*0.1:.1f}, z: {front_z+5:.1f} }}, type: 'cannon' }}")
        weapons.append(f"{{ position: {{ x: {-width*0.1:.1f}, y: {height*0.1:.1f}, z: {front_z+5:.1f} }}, type: 'cannon' }}")
        weapons.append(f"{{ position: {{ x: {width*0.05:.1f}, y: {-height*0.05:.1f}, z: {front_z+15:.1f} }}, type: 'blaster' }}")
        weapons.append(f"{{ position: {{ x: {-width*0.05:.1f}, y: {-height*0.05:.1f}, z: {front_z+15:.1f} }}, type: 'blaster' }}")
    elif measurements['name'] == 'Sky_Predator':
        weapons.append(f"{{ position: {{ x: {width*0.1:.1f}, y: 0, z: {front_z+2:.1f} }}, type: 'blaster' }}")
        weapons.append(f"{{ position: {{ x: {-width*0.1:.1f}, y: 0, z: {front_z+2:.1f} }}, type: 'blaster' }}")
    
    print("Weapon Positions:")
    for weapon in weapons:
        print(f"  {weapon}")
    
    return {
        'engines': engines,
        'weapons': weapons,
        'native_length': native_length
    }

def main():
    """Main function to measure all models"""
    models_to_measure = [
        {
            'path': '../solar system/textures/Starship_Calypso_0521230350_texture.glb',
            'name': 'Starship_Calypso'
        },
        {
            'path': '../solar system/textures/Sky_Predator_0522121524_texture.glb', 
            'name': 'Sky_Predator'
        }
    ]
    
    all_measurements = []
    
    for model_info in models_to_measure:
        if os.path.exists(model_info['path']):
            measurement = measure_glb_model(model_info['path'], model_info['name'])
            if measurement:
                all_measurements.append(measurement)
                config = generate_ship_config(measurement)
        else:
            print(f"File not found: {model_info['path']}")
    
    print("\n" + "="*60)
    print("SUMMARY OF MEASUREMENTS")
    print("="*60)
    
    for measurement in all_measurements:
        print(f"{measurement['name']}:")
        print(f"  Native Length: {measurement['length']:.3f}")
        print(f"  Dimensions: {measurement['width']:.1f} x {measurement['height']:.1f} x {measurement['length']:.1f}")
        print(f"  Front Z: {measurement['front_z']:.1f}, Rear Z: {measurement['rear_z']:.1f}")
        print()

if __name__ == "__main__":
    main() 