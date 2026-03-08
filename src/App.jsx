import { useState } from 'react';
import { Youtube, Download, Loader2, AlertCircle, FileVideo, Music } from 'lucide-react';

function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle, analyzing, downloading, done, error
  const [videoInfo, setVideoInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Example API base
  const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus('analyzing');
    setErrorMsg('');
    setVideoInfo(null);

    try {
      const res = await fetch(`${API_BASE}/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "정보를 가져오는데 실패했습니다.");

      setVideoInfo(data);
      setStatus('idle');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleDownload = async () => {
    if (!videoInfo) return;
    setStatus('downloading');
    setErrorMsg('');

    try {
      // Trigger download using the browser's download manager via a direct anchor link
      // Or blob fetch. We'll use window.location for simplicity so the browser handles huge files instead of RAM blob.
      const downloadUrl = `${API_BASE}/api/download?url=${encodeURIComponent(url)}`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Wait a bit and set back to idle (can't easily track completion of standard browser downloads)
      setTimeout(() => {
        setStatus('done');
      }, 3000);

    } catch (err) {
      setErrorMsg("다운로드 요청 실패: " + err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white font-sans flex flex-col items-center justify-center p-4">

      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-10 transform transition-all">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-2xl mb-4 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
            <Youtube size={36} className="text-red-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-orange-300">
            Antigravity Downloader
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-sm mx-auto">
            유튜브 최고 화질 영상과 오디오를 병합하여<br />데스크탑과 모바일에 완벽하게 호환되는 MP4로 추출합니다.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-2 sm:p-3 shadow-2xl mb-6 items-center flex relative">
          <form onSubmit={handleAnalyze} className="w-full relative flex gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="유튜브 링크를 붙여넣으세요 (https://youtube.com/...)"
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all placeholder:text-slate-500"
                disabled={status === 'analyzing' || status === 'downloading'}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'analyzing' || status === 'downloading' || !url}
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-2xl px-6 sm:px-8 py-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {status === 'analyzing' ? (
                <><Loader2 size={20} className="animate-spin" /> 분석중...</>
              ) : (
                '검색'
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-bottom-2 mb-6">
            <AlertCircle size={20} className="shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Video Info Card */}
        {videoInfo && (
          <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-500">
            <div className="aspect-video w-full bg-slate-900 relative">
              <img src={videoInfo.thumbnail} alt="Thumbnail" className="w-full h-full object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

              <div className="absolute bottom-0 left-0 p-6 w-full">
                <span className="bg-black/60 backdrop-blur border border-white/10 text-white text-xs px-2 py-1 rounded-md font-medium inline-block mb-2">
                  {videoInfo.duration_string || "Unknown"}
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-white leading-snug line-clamp-2 shadow-black drop-shadow-lg">
                  {videoInfo.title}
                </h3>
                <p className="text-slate-300 mt-1 flex items-center gap-2 text-sm shadow-black drop-shadow-md">
                  <Youtube size={14} className="text-slate-400" />
                  {videoInfo.uploader}
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-800/90 border-t border-slate-700/50">
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400 mb-1">최고 화질</span>
                  <span className="font-bold text-slate-200 flex items-center gap-1"><FileVideo size={14} /> {videoInfo.resolution || '1080p'}</span>
                </div>
                <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400 mb-1">코덱</span>
                  <span className="font-bold text-slate-200">H.264 / AAC</span>
                </div>
                <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400 mb-1">포맷</span>
                  <span className="font-bold text-blue-400 flex items-center gap-1">MP4</span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={status === 'downloading'}
                className="w-full bg-slate-100 hover:bg-white active:bg-slate-200 text-slate-900 font-bold text-lg rounded-2xl py-4 transition-all shadow-xl shadow-white/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-3 relative overflow-hidden group"
              >
                {status === 'downloading' ? (
                  <><Loader2 size={24} className="animate-spin" /> 변환 및 다운로드 준비중...</>
                ) : (
                  <>
                    <Download size={22} className="group-hover:-translate-y-1 transition-transform" />
                    원본 화질로 다운로드
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-slate-500 mt-4 leading-relaxed">
                다운로드 버튼을 누르면 서버에서 고화질 영상과 오디오를 병합하는 작업이 시작됩니다.<br />
                서버 성능에 따라 최대 1~2분가량 소요될 수 있으니 대기해 주세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
