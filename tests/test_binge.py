import pytest
from anilab.binge import build_anilist_binge_query, VIBE_CATEGORIES

def test_vibe_categories_defined():
    assert "hype" in VIBE_CATEGORIES
    assert "mind_games" in VIBE_CATEGORIES
    assert "dark" in VIBE_CATEGORIES
    assert "chill" in VIBE_CATEGORIES
    assert "feels" in VIBE_CATEGORIES

def test_query_generator_format():
    query, vars_dict = build_anilist_binge_query(
        vibe="mind_games", 
        length_mode="short", 
        hidden_gems=True,
        excluded_titles=["Death Note"]
    )
    assert "Page" in query
    assert "media" in query
    assert vars_dict.get("episodes_lesser") == 14
    assert vars_dict.get("averageScore_greater") >= 75
