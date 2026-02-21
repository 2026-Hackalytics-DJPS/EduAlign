"""
Colleges package: data loading, preprocessing, and LLM-based matching.

- preprocessing — load_merged_data(), EXPERIENCE_DIMS, trim/aggregate pipelines
- matching    — get_matches() (Gemini-powered college recommendations)
"""

from backend.colleges.matching import get_matches
from backend.colleges.preprocessing import EXPERIENCE_DIMS, load_merged_data

__all__ = ["EXPERIENCE_DIMS", "load_merged_data", "get_matches"]
