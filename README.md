# Mahen Portfolio (GitHub Pages)

This repository is ready to be hosted as a static site on GitHub Pages.

## Project Structure

```
.
|-- index.html
|-- mahen-portfolio.html
|-- assets/
|   `-- reel-thumbnails/
|       |-- thumb-01.jpg
|       |-- thumb-02.jpg
|       |-- thumb-03.jpg
|       |-- thumb-04.jpg
|       |-- thumb-05.jpg
|       |-- thumb-06.jpg
|       |-- thumb-07.jpg
|       `-- thumb-08.jpg
```

## What Was Added

- `index.html` (entry file required by GitHub Pages)
- This `README.md`

## How To Publish

1. Create a GitHub repository and push this folder.
2. Open your repository on GitHub.
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, choose:
   - **Source**: Deploy from a branch
   - **Branch**: `main` (or your default branch)
   - **Folder**: `/ (root)`
5. Save and wait 1-2 minutes.
6. Open the URL shown in Pages settings.

## Notes

- Your asset paths already use relative URLs (`assets/reel-thumbnails/...`), so they are GitHub Pages friendly.
- Keep `index.html` at repository root.
