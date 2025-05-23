#!/usr/bin/env python3
"""
Debug Script: Ship Scaling Analysis
Shows exactly how scaling is applied to all ship components
"""

def analyze_ship_scaling():
    print("=" * 60)
    print("SHIP SCALING ANALYSIS")
    print("=" * 60)
    
    # Ship configurations
    ships = {
        'Starship_Calypso': {
            'native_length': 142.672,
            'desired_length': 20,
            'native_width': 236.2,
            'native_height': 150.0,
            'weapon_hardpoints': [
                {'x': 23.6, 'y': 15.0, 'z': -66.5, 'type': 'cannon'},
                {'x': -23.6, 'y': 15.0, 'z': -66.5, 'type': 'cannon'},
            ],
            'engine_positions': [
                {'x': 0, 'y': 0, 'z': 66.2, 'scale': 1.0, 'type': 'main'},
                {'x': 35.4, 'y': 0, 'z': 61.2, 'scale': 0.7, 'type': 'secondary'},
            ]
        },
        'Sky_Predator': {
            'native_length': 1.983,
            'desired_length': 8,
            'native_width': 2.0,
            'native_height': 1.1,
            'weapon_hardpoints': [
                {'x': 0.2, 'y': 0, 'z': -1.0, 'type': 'blaster'},
                {'x': -0.2, 'y': 0, 'z': -1.0, 'type': 'blaster'},
            ],
            'engine_positions': [
                {'x': 0, 'y': 0, 'z': 1.0, 'scale': 0.8, 'type': 'main'},
                {'x': 0.3, 'y': 0, 'z': 0.8, 'scale': 0.5, 'type': 'secondary'},
            ]
        }
    }
    
    for ship_name, config in ships.items():
        print(f"\n{ship_name}:")
        print(f"  Native dimensions: {config['native_width']:.1f} x {config['native_height']:.1f} x {config['native_length']:.1f}")
        
        # Calculate model scale
        model_scale = config['desired_length'] / config['native_length']
        print(f"  Model scale: {config['desired_length']} / {config['native_length']:.3f} = {model_scale:.4f}")
        
        # Calculate final scaled dimensions
        final_width = config['native_width'] * model_scale
        final_height = config['native_height'] * model_scale
        final_length = config['native_length'] * model_scale
        print(f"  Final dimensions: {final_width:.1f} x {final_height:.1f} x {final_length:.1f} meters")
        
        # Analyze weapon hardpoints
        print(f"  Weapon hardpoints (scaled):")
        for i, weapon in enumerate(config['weapon_hardpoints']):
            scaled_x = weapon['x'] * model_scale
            scaled_y = weapon['y'] * model_scale
            scaled_z = weapon['z'] * model_scale
            print(f"    {i+1}. {weapon['type']}: ({scaled_x:.2f}, {scaled_y:.2f}, {scaled_z:.2f})")
        
        # Analyze engine positions
        print(f"  Engine positions (scaled):")
        for i, engine in enumerate(config['engine_positions']):
            scaled_x = engine['x'] * model_scale
            scaled_y = engine['y'] * model_scale
            scaled_z = engine['z'] * model_scale
            effect_scale = engine['scale'] * model_scale * 5  # Estimate effect scale
            print(f"    {i+1}. {engine['type']}: ({scaled_x:.2f}, {scaled_y:.2f}, {scaled_z:.2f}) effect_scale: {effect_scale:.3f}")
        
        # Hit detection analysis
        hit_radius = config['desired_length'] * 0.5
        print(f"  Hit detection radius: {hit_radius:.1f} meters")
        
        # Camera positioning
        if ship_name == 'Starship_Calypso':
            cam_y = final_height * 2.0
            cam_z = final_length * 3.0
            print(f"  Camera position (estimated): Y={cam_y:.1f}, Z={cam_z:.1f}")
        
        print()

def show_effect_scaling_requirements():
    print("=" * 60)
    print("EFFECT SCALING REQUIREMENTS")
    print("=" * 60)
    
    print("1. WEAPON EFFECTS:")
    print("   - Muzzle flash size should scale with model_scale * weapon_scale_factor")
    print("   - Projectile size should remain constant (weapon caliber)")
    print("   - Effect position must use: native_position * model_scale")
    print()
    
    print("2. THRUSTER EFFECTS:")
    print("   - Thruster flame size should scale with model_scale * engine_scale")
    print("   - Effect position must use: native_position * model_scale")
    print("   - Particle count should scale with ship size")
    print()
    
    print("3. HIT DETECTION:")
    print("   - Hit radius = desired_length * 0.5 (half ship length)")
    print("   - NOT based on model_scale directly")
    print()
    
    print("4. CAMERA POSITIONING:")
    print("   - Camera offset should scale with final ship dimensions")
    print("   - Y offset = final_height * multiplier")
    print("   - Z offset = final_length * multiplier")

if __name__ == "__main__":
    analyze_ship_scaling()
    show_effect_scaling_requirements() 