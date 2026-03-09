import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'delhi-flood-intelligence-2024'
    DEBUG = True
    
    # Delhi city bounds
    DELHI_CENTER_LAT = 28.6139
    DELHI_CENTER_LNG = 77.2090
    
    # Data paths
    DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
    MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')
    WARDS_CSV = os.path.join(DATA_DIR, 'wards_data.csv')
    HOTSPOTS_CSV = os.path.join(DATA_DIR, 'hotspot_data.csv')
    MODEL_PATH = os.path.join(MODEL_DIR, 'flood_model.pkl')
    
    # ML Config
    N_TRAINING_SAMPLES = 500
    RISK_CLASSES = ['LOW', 'MEDIUM', 'HIGH']
    
    # Simulation
    SIMULATION_STEPS = [0, 30, 60, 90]
