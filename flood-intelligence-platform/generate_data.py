import pandas as pd
import numpy as np
import os
import json

np.random.seed(42)

DELHI_WARDS = [
    "Rohini Sector 1", "Rohini Sector 2", "Rohini Sector 3", "Rohini Sector 4",
    "Dwarka Sector 1", "Dwarka Sector 2", "Dwarka Sector 3", "Dwarka Sector 4",
    "Dwarka Sector 5", "Karol Bagh North", "Karol Bagh South", "Karol Bagh Central",
    "Janakpuri East", "Janakpuri West", "Lajpat Nagar I", "Lajpat Nagar II",
    "Lajpat Nagar III", "Saket A", "Saket B", "Okhla Phase I", "Okhla Phase II",
    "Okhla Phase III", "Pitampura East", "Pitampura West", "Mayur Vihar Phase I",
    "Mayur Vihar Phase II", "Shahdara North", "Shahdara South", "Shahdara East",
    "Chandni Chowk", "Paharganj", "Connaught Place", "Civil Lines North",
    "Civil Lines South", "Model Town A", "Model Town B", "Shalimar Bagh North",
    "Shalimar Bagh South", "Ashok Vihar", "Vikaspuri East", "Vikaspuri West",
    "Uttam Nagar East", "Uttam Nagar West", "Palam", "Mahipalpur",
    "Vasant Kunj A", "Vasant Kunj B", "Vasant Vihar", "Munirka",
    "RK Puram Sector 1", "RK Puram Sector 2", "RK Puram Sector 3",
    "Hauz Khas", "Green Park", "Malviya Nagar", "Safdarjung",
    "Lodi Colony", "Jangpura A", "Jangpura B", "Bhogal",
    "Srinivaspuri", "Kalkaji A", "Kalkaji B", "Govindpuri",
    "Sangam Vihar A", "Sangam Vihar B", "Badarpur", "Sarita Vihar",
    "Jasola", "Madanpur Khadar", "Tughlakabad", "Fateh Nagar",
    "Moti Nagar", "Kirti Nagar", "Tagore Garden", "Subhash Nagar",
    "Rajouri Garden", "Ramesh Nagar", "Punjabi Bagh East", "Punjabi Bagh West",
    "Sunder Nagar", "Laxmi Nagar East", "Laxmi Nagar West", "Nirman Vihar",
    "Preet Vihar", "Vivek Vihar", "Anand Vihar", "Patparganj",
    "Trilokpuri A", "Trilokpuri B", "Kondli", "Mandawali",
    "Burari North", "Burari South", "Mukherjee Nagar", "GTB Nagar",
    "Azadpur", "Jahangirpuri A", "Jahangirpuri B", "Seelampur",
    "Mustafabad", "Maujpur", "Gokulpuri", "Jaffrabad",
    "Bhajanpura", "Welcome Colony", "Nand Nagri", "Dilshad Garden",
    "Geeta Colony", "Gandhi Nagar East", "Gandhi Nagar West", "Shakarpur",
    "Shastri Park", "Sonia Vihar", "Harsh Vihar", "Nand Nagri Extension",
    "Karawal Nagar North", "Karawal Nagar South", "Mustafabad East", "Seemapuri",
    "Babarpur", "Gamri", "Johripur", "Shiv Puri",
    "Rajendra Nagar", "Inderpuri", "Naraina", "Patel Nagar East",
    "Patel Nagar West", "Baljeet Nagar", "Ranjit Nagar",
]

# Pad to 120+ wards
extra = [
    "Mehrauli A", "Mehrauli B", "Chhattarpur", "Sultanpur",
    "Gadaipur", "Kishangarh", "Aya Nagar", "Mandi Village",
    "Ghitorni", "Lado Sarai",
]
DELHI_WARDS = DELHI_WARDS + extra
DELHI_WARDS = DELHI_WARDS[:120]

# Delhi approximate bounding box: lat 28.40-28.88, lng 76.84-77.35
WARD_ZONES = {
    "north": {"lat_range": (28.75, 28.88), "lng_range": (76.95, 77.25)},
    "south": {"lat_range": (28.40, 28.55), "lng_range": (77.05, 77.30)},
    "east":  {"lat_range": (28.60, 28.75), "lng_range": (77.20, 77.35)},
    "west":  {"lat_range": (28.55, 28.70), "lng_range": (76.84, 77.05)},
    "central": {"lat_range": (28.58, 28.68), "lng_range": (77.05, 77.25)},
}

def assign_zone(idx):
    zones = list(WARD_ZONES.keys())
    return zones[idx % len(zones)]

def generate_wards():
    rows = []
    for i, name in enumerate(DELHI_WARDS):
        zone = assign_zone(i)
        z = WARD_ZONES[zone]
        lat = np.random.uniform(*z["lat_range"])
        lng = np.random.uniform(*z["lng_range"])
        rainfall = np.random.randint(40, 200)
        elevation = np.random.randint(180, 280)
        drain_capacity = round(np.random.uniform(0.2, 1.0), 2)
        population = np.random.randint(30000, 250000)
        drain_network = np.random.randint(5, 50)
        emergency_resources = np.random.randint(1, 10)
        readiness_score = round(np.random.uniform(0.3, 0.95), 2)
        
        # Risk logic
        risk_score = (rainfall / 200) * 0.4 + ((1 - drain_capacity)) * 0.35 + ((280 - elevation) / 100) * 0.25
        if risk_score > 0.55:
            risk_level = "HIGH"
        elif risk_score > 0.35:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        rows.append({
            "ward_id": f"W{i+1:03d}",
            "ward_name": name,
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "rainfall": rainfall,
            "elevation": elevation,
            "drain_capacity": drain_capacity,
            "population": population,
            "drain_network": drain_network,
            "emergency_resources": emergency_resources,
            "readiness_score": readiness_score,
            "risk_level": risk_level,
        })
    return pd.DataFrame(rows)

def generate_hotspots(wards_df):
    rows = []
    hid = 1
    per_ward = 2550 // len(wards_df) + 1
    for _, ward in wards_df.iterrows():
        n = per_ward + np.random.randint(-2, 4)
        for _ in range(n):
            lat_offset = np.random.uniform(-0.025, 0.025)
            lng_offset = np.random.uniform(-0.025, 0.025)
            rainfall = ward["rainfall"] + np.random.randint(-20, 30)
            rainfall = max(10, min(250, rainfall))
            elevation = ward["elevation"] + np.random.randint(-20, 20)
            drain_cap = round(ward["drain_capacity"] + np.random.uniform(-0.2, 0.2), 2)
            drain_cap = max(0.1, min(1.0, drain_cap))
            
            rs = (rainfall / 250) * 0.4 + (1 - drain_cap) * 0.35 + ((280 - elevation) / 100) * 0.25
            if rs > 0.55:
                risk = "HIGH"
            elif rs > 0.35:
                risk = "MEDIUM"
            else:
                risk = "LOW"
            
            rows.append({
                "hotspot_id": f"HS{hid:04d}",
                "latitude": round(ward["latitude"] + lat_offset, 6),
                "longitude": round(ward["longitude"] + lng_offset, 6),
                "rainfall": rainfall,
                "elevation": elevation,
                "drain_capacity": drain_cap,
                "flood_risk_level": risk,
                "associated_ward": ward["ward_id"],
            })
            hid += 1
            if hid > 2560:
                break
        if hid > 2560:
            break
    return pd.DataFrame(rows)

def generate_geojson(wards_df):
    features = []
    for _, w in wards_df.iterrows():
        color = {"HIGH": "#ef4444", "MEDIUM": "#f59e0b", "LOW": "#22c55e"}[w["risk_level"]]
        features.append({
            "type": "Feature",
            "properties": {
                "ward_id": w["ward_id"],
                "ward_name": w["ward_name"],
                "risk_level": w["risk_level"],
                "color": color,
                "rainfall": int(w["rainfall"]),
                "elevation": int(w["elevation"]),
                "drain_capacity": float(w["drain_capacity"]),
                "population": int(w["population"]),
            },
            "geometry": {
                "type": "Point",
                "coordinates": [float(w["longitude"]), float(w["latitude"])]
            }
        })
    return {"type": "FeatureCollection", "features": features}


if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    print("Generating ward data...")
    wards_df = generate_wards()
    wards_df.to_csv("data/wards_data.csv", index=False)
    print(f"  → {len(wards_df)} wards saved.")

    print("Generating hotspot data...")
    hotspots_df = generate_hotspots(wards_df)
    hotspots_df.to_csv("data/hotspot_data.csv", index=False)
    print(f"  → {len(hotspots_df)} hotspots saved.")

    print("Generating GeoJSON...")
    geojson = generate_geojson(wards_df)
    with open("static/data/wards.geojson", "w") as f:
        json.dump(geojson, f)
    print("  → GeoJSON saved.")
    print("Data generation complete.")