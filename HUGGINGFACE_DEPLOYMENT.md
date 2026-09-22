# Deploying to Hugging Face Spaces (100% Free 24/7 Hosting)

You can host this entire anime streaming app for free on **Hugging Face Spaces**. This means you don't need to leave your PC turned on at home—you can access your private anime streaming service from your phone, tablet, or TV anytime, anywhere.

---

### Step 1: Create a Hugging Face Account
1. If you don't have one, sign up at [huggingface.co](https://huggingface.co/join).

### Step 2: Create a New Space
1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **"Create new Space"**.
2. **Space name**: Choose a name (e.g. `my-anime-stream` or `shinsei-anime`).
3. **License**: Choose `mit` or `apache-2.0`.
4. **Space SDK**: Select **Docker** (Blank).
5. **Space hardware**: Select **CPU basic · 2 vCPU · 16 GB RAM · Free**.
6. **Privacy**:
   - Select **Public** if you don't mind sharing the URL with yourself/friends.
   - Or select **Private** so only your Hugging Face account can open it.
7. Click **"Create Space"**.

---

### Step 3: Upload Your Project Code

Hugging Face Spaces are standard Git repositories. You can upload via Git or via the web interface:

#### Option A: Using Git (Fastest & Recommended)
In your terminal, inside the `anime-app` directory:

```bash
# 1. Initialize git if not already done
git init
git add .
git commit -m "Shinsei Anime App release"

# 2. Add Hugging Face Space as remote (replace with your HF username and space name)
git remote add space https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME

# 3. Push code to Hugging Face (it will prompt for your HF username and Access Token)
git push --force space main
```

*(Note: If prompted for password, generate a Hugging Face User Access Token with `Write` permissions at https://huggingface.co/settings/tokens).*

#### Option B: Using the Web UI
1. In your newly created Space on huggingface.co, go to the **Files** tab.
2. Click **"Add file"** ➔ **"Upload files"**.
3. Upload all project files:
   - `Dockerfile`
   - `requirements.txt`
   - `main.py`
   - `config.py`
   - `db.py`
   - `proxy.py`
   - `aniskip.py`
   - `user_routes.py`
   - The `anilab/` folder
   - The `static/` folder (`index.html`, `app.js`, `style.css`)
4. Click **"Commit changes to main"**.

---

### Step 4: Access Your App
1. Hugging Face will automatically build the Docker container (takes ~1–2 minutes).
2. When the status turns to **Running**, your app will be live directly in your browser!
3. You can click the **"Embed this space"** or open the direct fullscreen link:
   ```
   https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space
   ```
4. Bookmark the link or click **"Add to Home Screen"** on your iPhone/Android to use it just like a native mobile app!
