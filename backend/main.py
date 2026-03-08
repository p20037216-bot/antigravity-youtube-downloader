from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yt_dlp
import os
import tempfile
import time

app = FastAPI(title="Antigravity YouTube Downloader API")

# Setup CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = tempfile.gettempdir()

# Clean up function to delete the file after it's been downloaded by the user
def delete_file(file_path: str):
    time.sleep(5) # short delay to ensure transmission is complete
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Deleted temp file: {file_path}")
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/info")
async def get_video_info(url: str):
    """Fetches video metadata using yt-dlp without downloading the actual video."""
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            
            # Format duration nicely
            duration_sec = info_dict.get('duration', 0)
            mins, secs = divmod(duration_sec, 60)
            hours, mins = divmod(mins, 60)
            duration_str = f"{hours:02d}:{mins:02d}:{secs:02d}" if hours > 0 else f"{mins:02d}:{secs:02d}"
            
            return {
                "title": info_dict.get('title', 'Unknown Title'),
                "thumbnail": info_dict.get('thumbnail', ''),
                "uploader": info_dict.get('uploader', 'Unknown Creator'),
                "duration_string": duration_str,
                "resolution": info_dict.get('resolution', 'Highest Available'),
            }
    except Exception as e:
        print(f"Error extracting info: {e}")
        raise HTTPException(status_code=400, detail="유효하지 않은 유튜브 링크이거나 정보를 가져올 수 없습니다.")

@app.get("/api/download")
async def download_video(url: str, background_tasks: BackgroundTasks):
    """Downloads the video to a temp folder, merges it, and returns the FileResponse."""
    
    # Render Free Tier Safety: Prevent videos longer than 60 mins to avert server crashes
    try:
        with yt_dlp.YoutubeDL({'skip_download': True, 'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            if info.get('duration', 0) > 3600:
                raise HTTPException(status_code=400, detail="서버 과부하 방지를 위해 1시간 이상의 영상은 다운로드할 수 없습니다.")
            filename_base = info.get('title', 'video').replace("/", "-").replace("\\", "-")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="영상 정보를 확인할 수 없습니다.")

    output_template = os.path.join(TEMP_DIR, f"{filename_base}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': output_template,
        'merge_output_format': 'mp4',
        'quiet': True,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            error_code = ydl.download([url])
            if error_code:
                raise Exception("yt-dlp download failed")
                
        expected_file = os.path.join(TEMP_DIR, f"{filename_base}.mp4")
        
        if not os.path.exists(expected_file):
             raise Exception("Merged file not found. FFmpeg may be missing.")
             
        # Add background task to delete the massive file after serving
        background_tasks.add_task(delete_file, expected_file)
        
        return FileResponse(
            path=expected_file, 
            filename=f"{filename_base}.mp4", 
            media_type='video/mp4'
        )
        
    except Exception as e:
        print(f"Download Error: {e}")
        raise HTTPException(status_code=500, detail="서버 다운로드 생성 중 오류가 발생했습니다. FFmpeg 누락 등 서버 이슈일 수 있습니다.")
