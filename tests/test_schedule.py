import pytest
from anilab.schedule import parse_airing_schedule

def test_parse_airing_schedule():
    sample_entry = {
        "id": 12345,
        "episode": 8,
        "airingAt": 1727000000,
        "media": {
            "title": {"english": "Solo Leveling", "romaji": "Ore dake Level Up na Ken"},
            "averageScore": 85,
            "format": "TV",
            "genres": ["Action", "Fantasy"]
        }
    }
    parsed = parse_airing_schedule([sample_entry], current_time=1727003600)
    assert len(parsed) == 1
    assert parsed[0]["title"] == "Solo Leveling"
    assert parsed[0]["episode"] == 8
    assert "Aired" in parsed[0]["status_str"]

def test_parse_airing_future():
    sample_entry = {
        "id": 12346,
        "episode": 5,
        "airingAt": 1727010000,
        "media": {
            "title": {"english": "Frieren", "romaji": "Sousou no Frieren"},
            "averageScore": 91,
            "format": "TV",
            "genres": ["Adventure", "Drama"]
        }
    }
    parsed = parse_airing_schedule([sample_entry], current_time=1727003600)
    assert len(parsed) == 1
    assert "Airing in" in parsed[0]["status_str"]
