import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Kamu adalah Career Advisor AI untuk platform NaviKarier Indonesia.
Tugasmu: menganalisis teks CV kandidat dan membandingkan skill-nya dengan requirement untuk target role dan level tertentu.

Kamu HARUS merespons dalam format JSON yang valid (tanpa markdown, tanpa backtick) dengan struktur berikut:
{
  "match_score": <number 0-100, seberapa cocok kandidat dengan role>,
  "skills": [
    {
      "skill": "<nama skill>",
      "current": <number 0-100, estimasi level skill kandidat berdasarkan CV>,
      "required": <number 0-100, level yang dibutuhkan untuk role+level>,
      "gap": <number 0-100, max(0, required - current)>,
      "priority": "<HIGH jika gap >= 30, MEDIUM jika gap >= 15, LOW jika gap < 15>"
    }
  ],
  "missing_skills": ["<skill yang gap-nya >= 20>"],
  "recommended_courses": ["<nama course spesifik dan platform yang relevan, max 8 items>"]
}

Panduan:
- Analisis 6-10 skill yang paling relevan untuk role tersebut
- Estimasi "current" berdasarkan apa yang terlihat di CV (pengalaman, sertifikasi, project)
- Jika skill tidak disebutkan di CV sama sekali, current = 10-25
- Jika disebutkan secara umum, current = 40-60
- Jika ada bukti kuat (project, sertifikasi, pengalaman bertahun-tahun), current = 65-95
- Untuk "required", sesuaikan dengan level: JUNIOR (50-70), MID (65-80), SENIOR (75-95)
- Rekomendasikan course dari platform populer: Coursera, Udemy, Dicoding, LinkedIn Learning, edX, Kaggle, freeCodeCamp
- Prioritaskan course untuk skill dengan gap terbesar
- HANYA output JSON, tanpa teks lain"""


def analyze_cv_with_claude(cv_text: str, target_role: str, level: str = "MID") -> Dict[str, Any]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    user_message = f"""Analisis CV berikut untuk posisi **{target_role}** level **{level}**:

---CV TEXT---
{cv_text[:8000]}
---END CV---

Berikan analisis gap skill dalam format JSON sesuai instruksi."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

        result = json.loads(raw)

        if not isinstance(result.get("match_score"), (int, float)):
            raise ValueError("Invalid match_score")
        if not isinstance(result.get("skills"), list) or len(result["skills"]) == 0:
            raise ValueError("Invalid skills array")

        for skill in result["skills"]:
            skill["current"] = max(0, min(100, int(skill.get("current", 0))))
            skill["required"] = max(0, min(100, int(skill.get("required", 0))))
            skill["gap"] = max(0, skill["required"] - skill["current"])
            if skill["gap"] >= 30:
                skill["priority"] = "HIGH"
            elif skill["gap"] >= 15:
                skill["priority"] = "MEDIUM"
            else:
                skill["priority"] = "LOW"

        result["match_score"] = max(0, min(100, round(float(result["match_score"]), 1)))
        result["missing_skills"] = [s["skill"] for s in result["skills"] if s["gap"] >= 20]
        result["recommended_courses"] = result.get("recommended_courses", [])[:8]

        return result

    except json.JSONDecodeError as e:
        logger.error("Failed to parse Claude response as JSON: %s", e)
        raise ValueError("AI response was not valid JSON") from e
    except anthropic.APIError as e:
        logger.error("Claude API error: %s", e)
        raise ValueError(f"AI service error: {e.message}") from e
