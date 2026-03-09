from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
import joblib
import json
import os
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# ── Auto-generate data & model if missing ───────────────────────────────────
def generate_all():
    """Generate wards CSV, hotspot CSV, GeoJSON and train model if any are missing."""
    os.makedirs(Config.DATA_DIR,  exist_ok=True)
    os.makedirs(Config.MODEL_DIR, exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'static', 'data'), exist_ok=True)

    needs_data  = (not os.path.exists(Config.WARDS_CSV)    or os.path.getsize(Config.WARDS_CSV)    < 100)
    needs_data |= (not os.path.exists(Config.HOTSPOTS_CSV) or os.path.getsize(Config.HOTSPOTS_CSV) < 100)
    needs_model = (not os.path.exists(Config.MODEL_PATH)   or os.path.getsize(Config.MODEL_PATH)   < 100)

    if needs_data:
        print("Generating ward & hotspot data...")
        wards_df    = _gen_wards()
        hotspots_df = _gen_hotspots(wards_df)
        wards_df.to_csv(Config.WARDS_CSV,    index=False)
        hotspots_df.to_csv(Config.HOTSPOTS_CSV, index=False)
        _gen_geojson(wards_df)
        print(f"Done: {len(wards_df)} wards | {len(hotspots_df)} hotspots saved.")
    else:
        print("Data files found.")

    if needs_model:
        print("Training ML model...")
        _train_model()
        print("Model trained and saved.")
    else:
        print("Model file found.")


# ── Ward & Hotspot names ─────────────────────────────────────────────────────
DELHI_WARDS = [
    "Rohini Sector 1","Rohini Sector 2","Rohini Sector 3","Rohini Sector 4",
    "Dwarka Sector 1","Dwarka Sector 2","Dwarka Sector 3","Dwarka Sector 4",
    "Dwarka Sector 5","Karol Bagh North","Karol Bagh South","Karol Bagh Central",
    "Janakpuri East","Janakpuri West","Lajpat Nagar I","Lajpat Nagar II",
    "Lajpat Nagar III","Saket A","Saket B","Okhla Phase I","Okhla Phase II",
    "Okhla Phase III","Pitampura East","Pitampura West","Mayur Vihar Phase I",
    "Mayur Vihar Phase II","Shahdara North","Shahdara South","Shahdara East",
    "Chandni Chowk","Paharganj","Connaught Place","Civil Lines North",
    "Civil Lines South","Model Town A","Model Town B","Shalimar Bagh North",
    "Shalimar Bagh South","Ashok Vihar","Vikaspuri East","Vikaspuri West",
    "Uttam Nagar East","Uttam Nagar West","Palam","Mahipalpur",
    "Vasant Kunj A","Vasant Kunj B","Vasant Vihar","Munirka",
    "RK Puram Sector 1","RK Puram Sector 2","RK Puram Sector 3",
    "Hauz Khas","Green Park","Malviya Nagar","Safdarjung",
    "Lodi Colony","Jangpura A","Jangpura B","Bhogal",
    "Srinivaspuri","Kalkaji A","Kalkaji B","Govindpuri",
    "Sangam Vihar A","Sangam Vihar B","Badarpur","Sarita Vihar",
    "Jasola","Madanpur Khadar","Tughlakabad","Fateh Nagar",
    "Moti Nagar","Kirti Nagar","Tagore Garden","Subhash Nagar",
    "Rajouri Garden","Ramesh Nagar","Punjabi Bagh East","Punjabi Bagh West",
    "Sunder Nagar","Laxmi Nagar East","Laxmi Nagar West","Nirman Vihar",
    "Preet Vihar","Vivek Vihar","Anand Vihar","Patparganj",
    "Trilokpuri A","Trilokpuri B","Kondli","Mandawali",
    "Burari North","Burari South","Mukherjee Nagar","GTB Nagar",
    "Azadpur","Jahangirpuri A","Jahangirpuri B","Seelampur",
    "Mustafabad","Maujpur","Gokulpuri","Jaffrabad",
    "Bhajanpura","Welcome Colony","Nand Nagri","Dilshad Garden",
    "Geeta Colony","Gandhi Nagar East","Gandhi Nagar West","Shakarpur",
    "Shastri Park","Sonia Vihar","Harsh Vihar","Nand Nagri Extension",
    "Karawal Nagar North","Karawal Nagar South","Mustafabad East","Seemapuri",
    "Babarpur","Gamri","Johripur","Shiv Puri",
    "Rajendra Nagar","Inderpuri","Naraina","Patel Nagar East",
    "Patel Nagar West","Baljeet Nagar","Mehrauli A","Mehrauli B",
]

WARD_ZONES = {
    "north":   {"lat": (28.75, 28.88), "lng": (76.95, 77.25)},
    "south":   {"lat": (28.40, 28.55), "lng": (77.05, 77.30)},
    "east":    {"lat": (28.60, 28.75), "lng": (77.20, 77.35)},
    "west":    {"lat": (28.55, 28.70), "lng": (76.84, 77.05)},
    "central": {"lat": (28.58, 28.68), "lng": (77.05, 77.25)},
}

def _risk_from_score(rs):
    if rs > 0.55: return "HIGH"
    if rs > 0.35: return "MEDIUM"
    return "LOW"

def _gen_wards():
    rng   = np.random.RandomState(42)
    zones = list(WARD_ZONES.keys())
    rows  = []
    for i, name in enumerate(DELHI_WARDS):
        z        = WARD_ZONES[zones[i % len(zones)]]
        lat      = rng.uniform(*z["lat"])
        lng      = rng.uniform(*z["lng"])
        rainfall = int(rng.randint(40, 200))
        elev     = int(rng.randint(180, 280))
        drain    = round(float(rng.uniform(0.2, 1.0)), 2)
        pop      = int(rng.randint(30000, 250000))
        rs       = (rainfall/200)*0.4 + (1-drain)*0.35 + ((280-elev)/100)*0.25
        rows.append({
            "ward_id":            f"W{i+1:03d}",
            "ward_name":          name,
            "latitude":           round(float(lat), 6),
            "longitude":          round(float(lng), 6),
            "rainfall":           rainfall,
            "elevation":          elev,
            "drain_capacity":     drain,
            "population":         pop,
            "drain_network":      int(rng.randint(5, 50)),
            "emergency_resources":int(rng.randint(1, 10)),
            "readiness_score":    round(float(rng.uniform(0.3, 0.95)), 2),
            "risk_level":         _risk_from_score(rs),
        })
    return pd.DataFrame(rows)

def _gen_hotspots(wards_df):
    rng      = np.random.RandomState(42)
    rows     = []
    hid      = 1
    per_ward = (2550 // len(wards_df)) + 1
    for _, w in wards_df.iterrows():
        n = per_ward + int(rng.randint(0, 4))
        for _ in range(n):
            lat   = float(w["latitude"])  + rng.uniform(-0.025, 0.025)
            lng   = float(w["longitude"]) + rng.uniform(-0.025, 0.025)
            rain  = max(10, min(250, int(w["rainfall"]) + int(rng.randint(-20, 30))))
            elev  = int(w["elevation"])   + int(rng.randint(-20, 20))
            drain = round(max(0.1, min(1.0, float(w["drain_capacity"]) + rng.uniform(-0.2, 0.2))), 2)
            rs    = (rain/250)*0.4 + (1-drain)*0.35 + ((280-elev)/100)*0.25
            rows.append({
                "hotspot_id":       f"HS{hid:04d}",
                "latitude":         round(float(lat), 6),
                "longitude":        round(float(lng), 6),
                "rainfall":         rain,
                "elevation":        elev,
                "drain_capacity":   drain,
                "flood_risk_level": _risk_from_score(rs),
                "associated_ward":  w["ward_id"],
            })
            hid += 1
            if hid > 2561: break
        if hid > 2561: break
    return pd.DataFrame(rows)

def _gen_geojson(wards_df):
    features = []
    for _, w in wards_df.iterrows():
        color = {"HIGH":"#ef4444","MEDIUM":"#f59e0b","LOW":"#22c55e"}[w["risk_level"]]
        features.append({
            "type": "Feature",
            "properties": {
                "ward_id":       w["ward_id"],
                "ward_name":     w["ward_name"],
                "risk_level":    w["risk_level"],
                "color":         color,
                "rainfall":      int(w["rainfall"]),
                "elevation":     int(w["elevation"]),
                "drain_capacity":float(w["drain_capacity"]),
                "population":    int(w["population"]),
            },
            "geometry": {
                "type":        "Point",
                "coordinates": [float(w["longitude"]), float(w["latitude"])]
            }
        })
    geojson_path = os.path.join(os.path.dirname(__file__), 'static', 'data', 'wards.geojson')
    with open(geojson_path, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)

def _train_model():
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder
    rng   = np.random.RandomState(42)
    n     = 500
    rain  = rng.randint(10, 250, n).astype(float)
    elev  = rng.randint(170, 290, n).astype(float)
    drain = rng.uniform(0.1, 1.0, n)
    pop   = rng.randint(1000, 50000, n).astype(float)
    rs    = (rain/250)*0.4 + (1-drain)*0.35 + ((290-elev)/120)*0.25
    labels = np.array([_risk_from_score(r) for r in rs])
    X     = np.column_stack([rain, elev, drain, pop])
    le    = LabelEncoder()
    y     = le.fit_transform(labels)
    clf   = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)
    joblib.dump({"model": clf, "encoder": le}, Config.MODEL_PATH)

# ── Bootstrap on startup ─────────────────────────────────────────────────────
generate_all()

def load_data():
    wards    = pd.read_csv(Config.WARDS_CSV)
    hotspots = pd.read_csv(Config.HOTSPOTS_CSV)
    md       = joblib.load(Config.MODEL_PATH)
    return wards, hotspots, md["model"], md["encoder"]

wards_df, hotspots_df, model, label_encoder = load_data()
print(f"Loaded {len(wards_df)} wards | {len(hotspots_df)} hotspots | Model ready")

# ── Helpers ──────────────────────────────────────────────────────────────────
def predict_risk(rainfall, elevation, drain_capacity, population_density):
    X    = np.array([[rainfall, elevation, drain_capacity, population_density]])
    pred = model.predict(X)
    return label_encoder.inverse_transform(pred)[0]

def get_summary_stats(df=None):
    if df is None: df = wards_df
    return {
        "total_wards":         len(df),
        "high_risk":           int((df["risk_level"] == "HIGH").sum()),
        "medium_risk":         int((df["risk_level"] == "MEDIUM").sum()),
        "low_risk":            int((df["risk_level"] == "LOW").sum()),
        "affected_population": int(df[df["risk_level"] == "HIGH"]["population"].sum()),
        "avg_rainfall":        int(df["rainfall"].mean()),
        "total_hotspots":      len(hotspots_df),
    }

# ── Page routes ───────────────────────────────────────────────────────────────
@app.route("/")
def dashboard():
    return render_template("index.html", stats=get_summary_stats(), active="dashboard")

@app.route("/prediction")
def prediction():
    return render_template("prediction.html", stats=get_summary_stats(), active="prediction")

@app.route("/simulation")
def simulation():
    return render_template("simulation.html", active="simulation")

@app.route("/analytics")
def analytics():
    return render_template("analytics.html", stats=get_summary_stats(), active="analytics")

@app.route("/resources")
def resources():
    return render_template("resources.html", active="resources")

@app.route("/alerts")
def alerts():
    return render_template("alerts.html", active="alerts")

@app.route("/settings")
def settings():
    return render_template("settings.html", active="settings")

# ── API routes ────────────────────────────────────────────────────────────────
@app.route("/api/wards")
def api_wards():
    rainfall_filter = request.args.get("rainfall", type=int)
    df = wards_df.copy()
    if rainfall_filter:
        df["rainfall"] = rainfall_filter
        df["risk_level"] = df.apply(
            lambda r: _risk_from_score(
                (rainfall_filter/250)*0.4 + (1 - r["drain_capacity"])*0.35 + ((280 - r["elevation"])/100)*0.25
            ), axis=1
        )
    return jsonify({"wards": df.to_dict(orient="records"), "stats": get_summary_stats(df)})

@app.route("/api/hotspots")
def api_hotspots():
    risk_filter = request.args.get("risk", "ALL")
    df = hotspots_df.copy()
    if risk_filter != "ALL":
        df = df[df["flood_risk_level"] == risk_filter]
    cols = ["hotspot_id","latitude","longitude","flood_risk_level","rainfall","drain_capacity","associated_ward"]
    return jsonify({"hotspots": df[cols].to_dict(orient="records"), "count": len(df)})

@app.route("/api/predict", methods=["POST"])
def api_predict():
    data = request.get_json()
    risk = predict_risk(
        float(data.get("rainfall", 80)),
        float(data.get("elevation", 220)),
        float(data.get("drain_capacity", 0.6)),
        float(data.get("population_density", 15000)),
    )
    return jsonify({"risk_level": risk, "confidence": round(float(np.random.uniform(0.75, 0.98)), 3)})

@app.route("/api/resources")
def api_resources():
    resources = []
    for _, row in wards_df.iterrows():
        if row["risk_level"] == "HIGH":
            pumps, teams, boats = 3, 2, 1
        elif row["risk_level"] == "MEDIUM":
            pumps, teams, boats = 2, 1, 0
        else:
            continue
        resources.append({
            "ward_id":        row["ward_id"],
            "ward_name":      row["ward_name"],
            "risk_level":     row["risk_level"],
            "pumps":          pumps,
            "teams":          teams,
            "boats":          boats,
            "population":     int(row["population"]),
            "readiness_score":float(row["readiness_score"]),
        })
    return jsonify({"resources": resources})

@app.route("/api/alerts")
def api_alerts():
    high_risk  = wards_df[wards_df["risk_level"] == "HIGH"].head(15)
    severities = ["CRITICAL", "HIGH", "MODERATE"]
    advisories = [
        ["Evacuate low-lying areas", "Close road underpasses", "Deploy rescue teams"],
        ["Avoid travel", "Move vehicles to higher ground", "Stock emergency supplies"],
        ["Monitor water levels", "Clear drain outlets", "Stay indoors"],
    ]
    alerts = []
    rng = np.random.RandomState(7)
    for i, (_, row) in enumerate(high_risk.iterrows()):
        si = i % 3
        alerts.append({
            "alert_id":           f"ALT{i+1:03d}",
            "ward_name":          row["ward_name"],
            "severity":           severities[si],
            "expected_depth":     round(float(rng.uniform(0.3, 1.2)), 1),
            "eta_hours":          int(rng.randint(1, 6)),
            "population_at_risk": int(row["population"]),
            "advisories":         advisories[si],
            "rainfall":           int(row["rainfall"]),
        })
    return jsonify({"alerts": alerts, "total": len(alerts)})

@app.route("/api/simulation")
def api_simulation():
    high_wards = wards_df[wards_df["risk_level"] == "HIGH"].head(20)
    steps = []
    for t in [0, 30, 60, 90]:
        points = []
        for _, row in high_wards.iterrows():
            intensity = min(1.0, t / 90 * 0.8 + 0.2)
            points.append({
                "lat":        float(row["latitude"]),
                "lng":        float(row["longitude"]),
                "ward_name":  row["ward_name"],
                "radius":     t * 15 + 100,
                "intensity":  round(intensity, 2),
                "water_depth":round(intensity * 1.2, 2),
            })
        steps.append({"time_min": t, "points": points})
    return jsonify({"steps": steps})

@app.route("/api/analytics")
def api_analytics():
    risk_counts    = wards_df["risk_level"].value_counts().to_dict()
    top_wards      = wards_df.nlargest(10, "rainfall")[
        ["ward_name","rainfall","risk_level","population"]
    ].to_dict(orient="records")
    months         = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    readiness_bins = {"0-0.4": 0, "0.4-0.6": 0, "0.6-0.8": 0, "0.8-1.0": 0}
    for v in wards_df["readiness_score"]:
        if   v < 0.4: readiness_bins["0-0.4"]   += 1
        elif v < 0.6: readiness_bins["0.4-0.6"] += 1
        elif v < 0.8: readiness_bins["0.6-0.8"] += 1
        else:         readiness_bins["0.8-1.0"]  += 1
    return jsonify({
        "risk_distribution":        risk_counts,
        "top_rainfall_wards":       top_wards,
        "monthly_trend": {
            "months":       months,
            "rainfall":     [12,15,18,22,38,95,185,175,120,45,18,10],
            "flood_events": [0,0,0,0,1,4,12,11,7,2,0,0],
        },
        "readiness_distribution":   readiness_bins,
        "total_population_at_risk": int(wards_df[wards_df["risk_level"]=="HIGH"]["population"].sum()),
        "avg_drain_capacity":       round(float(wards_df["drain_capacity"].mean()), 3),
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
