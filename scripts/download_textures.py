#!/usr/bin/env python3
"""
Download script for Solar System Simulation textures.
This script downloads high-quality textures for planets, moons, and other celestial bodies
from NASA sources and other public repositories.
"""

import os
import requests
from tqdm import tqdm
import time

# Create textures directory if it doesn't exist
TEXTURE_DIR = 'textures'
if not os.path.exists(TEXTURE_DIR):
    os.makedirs(TEXTURE_DIR)

# Function to download a file with progress bar
def download_file(url, filename):
    filepath = os.path.join(TEXTURE_DIR, filename)
    if os.path.exists(filepath):
        print(f"File {filename} already exists. Skipping.")
        return
    
    try:
        print(f"Attempting to download {filename} from {url}...")
        response = requests.get(url, stream=True, timeout=30) # Added timeout
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        total_size = int(response.headers.get('content-length', 0))
        
        # Use tqdm for progress bar
        with open(filepath, 'wb') as file, tqdm(
            desc=filename,
            total=total_size,
            unit='B',
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for chunk in response.iter_content(chunk_size=8192): # Increased chunk size
                size = file.write(chunk)
                bar.update(size)
        
        print(f"Downloaded {filename} successfully.")
        
    except requests.exceptions.RequestException as e:
        print(f"Error downloading {url}: {e}")
    except Exception as e_gen:
        print(f"An unexpected error occurred with {url}: {e_gen}")

# List of textures to download with verified links
textures_to_download = [
    # Planets (from SolarSystemScope - assuming these are still desired and working)
    ("https://www.solarsystemscope.com/textures/download/2k_sun.jpg", "2k_sun.jpg"),
    ("https://www.solarsystemscope.com/textures/download/8k_sun.jpg", "8k_sun.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_mercury.jpg", "2k_mercury.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg", "2k_venus_surface.jpg"),
    ("https://www.solarsystemscope.com/textures/download/8k_venus_surface.jpg", "8k_venus_surface.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg", "2k_venus_atmosphere.jpg"),
    ("https://www.solarsystemscope.com/textures/download/4k_venus_atmosphere.jpg", "4k_venus_atmosphere.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg", "2k_earth_daymap.jpg"),
    ("https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg", "8k_earth_daymap.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg", "2k_earth_nightmap.jpg"),
    ("https://www.solarsystemscope.com/textures/download/8k_earth_nightmap.jpg", "8k_earth_nightmap.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg", "2k_earth_clouds.jpg"),
    ("https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg", "8k_earth_clouds.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_mars.jpg", "2k_mars.jpg"),
    ("https://www.solarsystemscope.com/textures/download/8k_mars.jpg", "8k_mars.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg", "2k_jupiter.jpg"),
    ("https://www.solarsystemscope.com/textures/download/8k_jupiter.jpg", "8k_jupiter.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_saturn.jpg", "2k_saturn.jpg"),
    ("https://www.solarsystemscope.com/textures/download/8k_saturn.jpg", "8k_saturn.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png", "2k_saturn_ring_alpha.png"),
    ("https://www.solarsystemscope.com/textures/download/8k_saturn_ring_alpha.png", "8k_saturn_ring_alpha.png"),
    ("https://www.solarsystemscope.com/textures/download/2k_uranus.jpg", "2k_uranus.jpg"),
    ("https://www.solarsystemscope.com/textures/download/2k_neptune.jpg", "2k_neptune.jpg"),
    
    # Earth's Moon (from SolarSystemScope)
    ("https://www.solarsystemscope.com/textures/download/2k_moon.jpg", "2k_moon.jpg"),

    # Mars Moons (USGS Astrogeology Science Center - High Quality)
    # Phobos
    ("https://astropedia.astrogeology.usgs.gov/download/Mars/Viking/Phobos_Viking_Mosaic_400px.tif", "2k_phobos.tif"), # Note: .tif format
    # Deimos
    ("https://astropedia.astrogeology.usgs.gov/download/Mars/Viking/Deimos_Viking_Mosaic_400px.tif", "2k_deimos.tif"), # Note: .tif format

    # Jupiter Moons (NASA / JPL-Caltech / SETI Institute / DLR - High Quality)
    # Io - Volcanic surface 
    ("https://solarsystem.nasa.gov/system/resources/detail_files/770_io_g1_1997_browse.jpg", "2k_io.jpg"),
    # Europa - Icy, cracked surface
    ("https://solarsystem.nasa.gov/system/resources/detail_files/803_europa_g1_1997_browse.jpg", "2k_europa.jpg"),
    # Ganymede - Largest moon
    ("https://solarsystem.nasa.gov/system/resources/detail_files/804_ganymede_g1_1997_browse.jpg", "2k_ganymede.jpg"),
    # Callisto - Heavily cratered surface
    ("https://solarsystem.nasa.gov/system/resources/detail_files/802_callisto_g1_1997_browse.jpg", "2k_callisto.jpg"),

    # Dwarf planets with fictional textures (from SolarSystemScope - if still needed)
    # ("https://www.solarsystemscope.com/textures/download/2k_eris_fictional.jpg", "2k_eris_fictional.jpg"),
    # ("https://www.solarsystemscope.com/textures/download/4k_eris_fictional.jpg", "4k_eris_fictional.jpg"),
    # ... and so on for other fictional dwarf planets ...
]

# Download each texture file
print("Downloading texture files...")
for url, filename in textures_to_download:
    download_file(url, filename)
    # Add a short delay between requests to be nice to the servers
    time.sleep(1) # Increased delay to 1 second

print("\nAll specified texture files attempted to download.")
print("Please ensure you have the necessary Python packages: pip install requests tqdm")
print("You may need to convert .tif files to .jpg or .png for Three.js if not supported directly.") 