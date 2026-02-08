# api/ai_service.py
from ultralytics import YOLO

MODEL_PATH = "api\best.pt"

try:
    MODEL = YOLO(MODEL_PATH)
    print("✅ YOLOv8 model loaded successfully.")
except Exception as e:
    MODEL = None
    print(f"🚨 ERROR: Failed to load YOLOv8 model. AI features will be disabled. Error: {e}")

def run_ai_analysis(image_path):
    if MODEL is None:
        return None
    try:
        results = MODEL(image_path, conf=0.4)
    except Exception as e:
        print(f"AI analysis failed during model prediction: {e}")
        return None
    
    detected_classes = {MODEL.names[int(box.cls[0])] for result in results for box in result.boxes}
    return determine_classification_and_suggestion(detected_classes)

def determine_classification_and_suggestion(detected_classes):
    """
    Analyzes detected classes to assign a classification and suggested action.
    Priority is no longer handled here.
    """
    if not detected_classes:
        return {
            "ai_classification": "Unclassified",
            "ai_suggestion": "Requires manual review by an admin.",
        }

    # --- Rule Engine Logic for Suggestions ---
    suggestion = "Schedule for routine inspection."
    if any(p in detected_classes for p in ["Sparks", "Fire", "Fallen Line", "Broken Pole"]):
        suggestion = "Dispatch emergency crew immediately. Potential public safety hazard."
    elif "Leaning Pole" in detected_classes or "Damaged Transformer" in detected_classes:
        suggestion = "Assign a specialized crew for inspection within 24 hours."
    elif "Vegetation Overgrowth" in detected_classes:
        suggestion = "Assign to a tree-trimming crew for routine maintenance."

    # --- Determine the Main Category ---
    if "Transformer" in detected_classes:
        main_category = "Transformer"
    elif "Electric Pole" in detected_classes:
        main_category = "Electric Pole"
    else:
        main_category = list(detected_classes)[0]

    return {
        "ai_classification": main_category,
        "ai_suggestion": suggestion,
    }