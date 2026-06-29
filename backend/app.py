import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from groq import Groq

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="")
CORS(app)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

LANGUAGE_CONFIG = {
    "fr": {"name": "French", "flag": "🇫🇷", "speech_code": "fr-FR", "greeting": "Bonjour"},
    "es": {"name": "Spanish", "flag": "🇪🇸", "speech_code": "es-ES", "greeting": "¡Hola"},
    "de": {"name": "German", "flag": "🇩🇪", "speech_code": "de-DE", "greeting": "Hallo"},
    "jp": {"name": "Japanese", "flag": "🇯🇵", "speech_code": "ja-JP", "greeting": "こんにちは"},
    "it": {"name": "Italian", "flag": "🇮🇹", "speech_code": "it-IT", "greeting": "Ciao"},
    "pt": {"name": "Portuguese", "flag": "🇵🇹", "speech_code": "pt-PT", "greeting": "Olá"},
}


def build_system_prompt(lang_code: str, settings: dict) -> str:
    cfg = LANGUAGE_CONFIG.get(lang_code, LANGUAGE_CONFIG["fr"])
    lang_name = cfg["name"]

    formal_note = (
        f"Use formal register (vous/Sie/usted etc.) in {lang_name}."
        if settings.get("formal")
        else f"Use informal/friendly register (tu/du/tú etc.) in {lang_name}."
    )

    correction_note = (
        "If the user makes a grammar, vocabulary, or spelling mistake, fill the 'correction' field "
        "with a gentle, encouraging explanation in English (1–2 sentences). If there's no mistake, leave it empty."
        if settings.get("correct")
        else "Leave the 'correction' field empty."
    )

    translation_note = (
        "Fill the 'translation' field with a short English summary of your reply."
        if settings.get("translate")
        else "Leave 'translation' empty."
    )

    tip_note = (
        f"Fill the 'tip' field with one interesting vocabulary, grammar, or cultural tip related to the conversation in {lang_name}."
        if settings.get("tips")
        else "Leave 'tip' empty."
    )

    return f"""You are a warm, encouraging, and fluent {lang_name} conversation partner and language tutor named "Companion".

ROLE:
- Hold natural, flowing conversations in {lang_name}.
- Gently help the user improve their language skills without making them feel embarrassed.
- Adapt complexity to the user's apparent level.
- If the user writes in English only, respond partly in {lang_name} with English support to ease them in.

REGISTER: {formal_note}

OUTPUT FORMAT — return ONLY a valid JSON object (no markdown, no backticks, no extra text):
{{
  "reply": "Your main response in {lang_name}",
  "correction": "{correction_note}",
  "translation": "{translation_note}",
  "tip": "{tip_note}"
}}

{correction_note}
{translation_note}
{tip_note}

IMPORTANT: Return ONLY the raw JSON object. Never wrap it in ```json``` or add any text outside the JSON."""


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body"}), 400

    lang_code = data.get("lang", "fr")
    settings = data.get("settings", {"correct": True, "translate": True, "formal": False, "tips": False})
    messages = data.get("messages", [])

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    system_prompt = build_system_prompt(lang_code, settings)

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system_prompt}] + messages,
            temperature=0.7,
            max_tokens=1024,
        )

        raw = completion.choices[0].message.content.strip()

        # Strip accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        parsed = json.loads(raw)
        return jsonify(parsed)

    except json.JSONDecodeError:
        # Fallback: return raw as reply
        return jsonify({"reply": raw, "correction": "", "translation": "", "tip": ""})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/languages", methods=["GET"])
def languages():
    return jsonify(LANGUAGE_CONFIG)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "llama-3.3-70b-versatile"})


# Serve React frontend (production)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    dist = os.path.join(app.static_folder)
    if path and os.path.exists(os.path.join(dist, path)):
        return send_from_directory(dist, path)
    return send_from_directory(dist, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV", "production") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
