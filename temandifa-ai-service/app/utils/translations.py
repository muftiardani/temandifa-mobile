# YOLO Label Translations for Indonesian (Bahasa Indonesia)
# Common object labels detected by YOLOv8

LABEL_TRANSLATIONS = {
    # People
    "person": "Orang",
    # Vehicles
    "bicycle": "Sepeda",
    "car": "Mobil",
    "motorcycle": "Sepeda Motor",
    "airplane": "Pesawat",
    "bus": "Bus",
    "train": "Kereta Api",
    "truck": "Truk",
    "boat": "Perahu",
    # Traffic
    "traffic light": "Lampu Lalu Lintas",
    "fire hydrant": "Hidran Air",
    "stop sign": "Tanda Berhenti",
    "parking meter": "Meteran Parkir",
    # Animals
    "bird": "Burung",
    "cat": "Kucing",
    "dog": "Anjing",
    "horse": "Kuda",
    "sheep": "Domba",
    "cow": "Sapi",
    "elephant": "Gajah",
    "bear": "Beruang",
    "zebra": "Zebra",
    "giraffe": "Jerapah",
    # Personal Items
    "backpack": "Tas Ransel",
    "umbrella": "Payung",
    "handbag": "Tas Tangan",
    "tie": "Dasi",
    "suitcase": "Koper",
    # Sports
    "frisbee": "Frisbee",
    "skis": "Ski",
    "snowboard": "Papan Salju",
    "sports ball": "Bola",
    "kite": "Layang-layang",
    "baseball bat": "Pemukul Bisbol",
    "baseball glove": "Sarung Tangan Bisbol",
    "skateboard": "Papan Luncur",
    "surfboard": "Papan Selancar",
    "tennis racket": "Raket Tenis",
    # Kitchen Items
    "bottle": "Botol",
    "wine glass": "Gelas Anggur",
    "cup": "Cangkir",
    "fork": "Garpu",
    "knife": "Pisau",
    "spoon": "Sendok",
    "bowl": "Mangkuk",
    # Food
    "banana": "Pisang",
    "apple": "Apel",
    "sandwich": "Sandwich",
    "orange": "Jeruk",
    "broccoli": "Brokoli",
    "carrot": "Wortel",
    "hot dog": "Hot Dog",
    "pizza": "Pizza",
    "donut": "Donat",
    "cake": "Kue",
    # Furniture
    "chair": "Kursi",
    "couch": "Sofa",
    "potted plant": "Tanaman Pot",
    "bed": "Tempat Tidur",
    "dining table": "Meja Makan",
    "toilet": "Toilet",
    # Electronics
    "tv": "Televisi",
    "laptop": "Laptop",
    "mouse": "Mouse Komputer",
    "remote": "Remote",
    "keyboard": "Keyboard",
    "cell phone": "Ponsel",
    # Appliances
    "microwave": "Microwave",
    "oven": "Oven",
    "toaster": "Pemanggang Roti",
    "sink": "Wastafel",
    "refrigerator": "Kulkas",
    # Other Objects
    "book": "Buku",
    "clock": "Jam",
    "vase": "Vas",
    "scissors": "Gunting",
    "teddy bear": "Boneka Beruang",
    "hair drier": "Pengering Rambut",
    "toothbrush": "Sikat Gigi",
    "bench": "Bangku",
}


def translate_label(label: str, lang: str = "id") -> str:
    """
    Translate an object detection label to the specified language.

    Args:
        label: The English label from YOLO detection
        lang: Target language code ('id' for Indonesian, 'en' for English)

    Returns:
        Translated label or original if no translation available
    """
    if lang == "en":
        return label

    # Convert to lowercase for matching
    label_lower = label.lower().strip()

    # Return translation if available, otherwise return capitalized original
    return LABEL_TRANSLATIONS.get(label_lower, label.capitalize())


def translate_detections(detections: list, lang: str = "id") -> list:
    """
    Translate all labels in a list of detections.

    Args:
        detections: List of detection dictionaries with 'label' key
        lang: Target language code

    Returns:
        List of detections with translated labels (adds 'label_translated' key)
    """
    for detection in detections:
        if "label" in detection:
            detection["label_original"] = detection["label"]
            detection["label"] = translate_label(detection["label"], lang)

    return detections
