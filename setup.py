from setuptools import setup, find_packages

setup(
    name="anime-cli",
    version="1.0.0",
    description="⚡ Next-Gen Anime Streaming & Browser CLI with AniSkip auto-skipping and zero-config tunneling",
    author="Divyam",
    packages=find_packages(),
    include_package_data=True,
    package_data={
        "anilab": ["static/*", "*"],
    },
    data_files=[
        ("static", ["static/index.html", "static/app.js", "static/style.css"]),
    ],
    py_modules=[
        "cli",
        "main",
        "config",
        "db",
        "proxy",
        "aniskip",
        "user_routes",
    ],
    install_requires=[
        "fastapi>=0.110.0",
        "uvicorn[standard]>=0.28.0",
        "curl_cffi>=0.7.0",
        "httpx>=0.27.0",
        "aiosqlite>=0.20.0",
        "pydantic>=2.6.0",
        "qrcode>=8.0",
    ],
    entry_points={
        "console_scripts": [
            "anime-cli=cli:main",
        ],
    },
    python_requires=">=3.9",
)
