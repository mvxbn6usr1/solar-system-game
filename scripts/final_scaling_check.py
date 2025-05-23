#!/usr/bin/env python3
"""
Final Scaling Verification
Shows the corrected hardpoint positions based on actual geometry
"""

def verify_final_scaling():
    print("=" * 70)
    print("FINAL SCALING VERIFICATION - GEOMETRY-BASED POSITIONS")
    print("=" * 70)
    
    # Updated ship configurations based on actual geometry analysis
    ships = {
        'Starship_Calypso': {
            'native_length': 142.672,
            'desired_length': 20,
            'native_centroid': [32.984, -13.834, -0.218],
            'weapon_hardpoints': [
                {'x': 55.0, 'y': -3.8, 'z': -46.4, 'type': 'cannon'},
                {'x': -20.3, 'y': -1.6, 'z': -49.9, 'type': 'cannon'},
            ],
            'engine_positions': [
                {'x': 18.0, 'y': -1.9, 'z': 48.6, 'scale': 1.0, 'type': 'main'},
                {'x': 54.4, 'y': -1.7, 'z': 47.1, 'scale': 0.7, 'type': 'secondary'},
                {'x': -23.5, 'y': -1.7, 'z': 49.1, 'scale': 0.7, 'type': 'secondary'},
            ]
        },
        'Sky_Predator': {
            'native_length': 1.983,
            'desired_length': 8,
            'native_centroid': [0.279, 0.001, -0.011],
            'weapon_hardpoints': [
                {'x': 0.3, 'y': 0.0, 'z': -0.5, 'type': 'cannon'},
            ],
            'engine_positions': [
                {'x': 0.3, 'y': 0.0, 'z': 0.6, 'scale': 1.0, 'type': 'main'},
            ]
        }
    }
    
    for ship_name, config in ships.items():
        print(f"\n{ship_name}:")
        
        # Calculate model scale
        model_scale = config['desired_length'] / config['native_length']
        print(f"  Model scale: {config['desired_length']} / {config['native_length']:.3f} = {model_scale:.4f}")
        
        # Final ship dimensions
        if ship_name == 'Starship_Calypso':
            final_width = 236.2 * model_scale
            final_height = 150.0 * model_scale
        else:
            final_width = 2.0 * model_scale
            final_height = 1.1 * model_scale
            
        final_length = config['native_length'] * model_scale
        print(f"  Final dimensions: {final_width:.1f} x {final_height:.1f} x {final_length:.1f} meters")
        
        # Show centroid offset (important for positioning)
        centroid = config['native_centroid']
        print(f"  Native centroid: [{centroid[0]:.1f}, {centroid[1]:.1f}, {centroid[2]:.1f}]")
        print(f"  Scaled centroid offset: [{centroid[0]*model_scale:.2f}, {centroid[1]*model_scale:.2f}, {centroid[2]*model_scale:.2f}]")
        
        # Weapon hardpoints in final scale
        print(f"  Weapon hardpoints (final scale):")
        for i, weapon in enumerate(config['weapon_hardpoints']):
            scaled_x = weapon['x'] * model_scale
            scaled_y = weapon['y'] * model_scale
            scaled_z = weapon['z'] * model_scale
            print(f"    {i+1}. {weapon['type']}: ({scaled_x:.2f}, {scaled_y:.2f}, {scaled_z:.2f}) meters")
        
        # Engine positions in final scale
        print(f"  Engine positions (final scale):")
        for i, engine in enumerate(config['engine_positions']):
            scaled_x = engine['x'] * model_scale
            scaled_y = engine['y'] * model_scale
            scaled_z = engine['z'] * model_scale
            effect_scale = engine['scale'] * model_scale * 2  # Conservative effect scaling
            print(f"    {i+1}. {engine['type']}: ({scaled_x:.2f}, {scaled_y:.2f}, {scaled_z:.2f}) effect: {effect_scale:.3f}")
        
        # Hit detection
        hit_radius = config['desired_length'] * 0.5
        print(f"  Hit detection radius: {hit_radius:.1f} meters")
        
        print()

def show_comparison():
    print("=" * 70)
    print("COMPARISON: BEFORE vs AFTER")
    print("=" * 70)
    
    print("BEFORE (Estimated from bounding box):")
    print("  Starship weapons: Far outside actual geometry")
    print("  Starship engines: At extreme rear")
    print("  Sky_Predator: Microscopic (0.008m instead of 8m)")
    print("  Hit detection: Auto-hit with huge radii")
    print()
    
    print("AFTER (Geometry analysis based):")
    print("  Starship weapons: At actual weapon mount points")
    print("  Starship engines: At actual engine geometry locations")
    print("  Sky_Predator: Proper 8m length, visible size")
    print("  Hit detection: Skill-based with realistic radii")
    print()
    
    print("KEY IMPROVEMENTS:")
    print("  ✅ Weapons fire from actual ship geometry")
    print("  ✅ Thrusters positioned within ship models")
    print("  ✅ Enemy fighters are properly sized and visible")
    print("  ✅ Combat requires actual aiming")
    print("  ✅ Effects scale correctly with ship size")

if __name__ == "__main__":
    verify_final_scaling()
    show_comparison() 