"""
Colleges package: data loading, preprocessing, matching, and predictions.

- preprocessing — load_merged_data(), EXPERIENCE_DIMS, trim/aggregate pipelines
- matching      — get_matches() (Gemini-powered college recommendations)
- predictions   — get_predictions(), suggest_sliders(), admission/earnings/graduation
"""

from backend.colleges.matching import get_matches
from backend.colleges.predictions import get_predictions, suggest_sliders
from backend.colleges.preprocessing import EXPERIENCE_DIMS, load_merged_data

__all__ = [
    "EXPERIENCE_DIMS",
    "load_merged_data",
    "get_matches",
    "get_predictions",
    "suggest_sliders",
]
