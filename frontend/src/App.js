import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import 'locomotive-scroll/dist/locomotive-scroll.css';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { 
  FiUploadCloud, 
  FiX, 
  FiPlay, 
  FiRefreshCw,
  FiAlertCircle,
  FiDownload,
  FiImage,
  FiVideo,
  FiSearch
} from 'react-icons/fi';
import {
  HiSparkles,
  HiShieldExclamation,
  HiFilm,
  HiHeart,
  HiCpuChip
} from 'react-icons/hi2';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const apiUrl = (path) => `${API_BASE_URL}${path}`;

function App() {
  const scrollContainerRef = useRef(null);
  const locomotiveRef = useRef(null);
  const submitInProgressRef = useRef(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [progress, setProgress] = useState(0);
  const [modelStats, setModelStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    const fetchModelStats = async () => {
      try {
        setStatsLoading(true);
        const response = await axios.get(apiUrl('/api/stats'));
        setModelStats(response.data);
        setStatsError(null);
      } catch (err) {
        setStatsError('Unable to load model technical details');
      } finally {
        setStatsLoading(false);
      }
    };

    fetchModelStats();
  }, []);

  useEffect(() => {
    let mounted = true;
    let scrollInstance = null;

    const initializeScroll = async () => {
      if (!scrollContainerRef.current || window.innerWidth < 768) {
        return;
      }

      const LocomotiveScroll = (await import('locomotive-scroll')).default;
      if (!mounted || !scrollContainerRef.current) {
        return;
      }

      scrollInstance = new LocomotiveScroll({
        el: scrollContainerRef.current,
        smooth: true,
        lerp: 0.075,
        multiplier: 0.85,
        smartphone: { smooth: false },
        tablet: { smooth: false }
      });

      locomotiveRef.current = scrollInstance;
    };

    initializeScroll();

    return () => {
      mounted = false;
      if (scrollInstance) {
        scrollInstance.destroy();
      }
      locomotiveRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!locomotiveRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      const scrollInstance = locomotiveRef.current;
      if (typeof scrollInstance?.update === 'function') {
        scrollInstance.update();
        return;
      }
      if (typeof scrollInstance?.resize === 'function') {
        scrollInstance.resize();
        return;
      }
      if (typeof scrollInstance?.scroll?.update === 'function') {
        scrollInstance.scroll.update();
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [file, preview, loading, result, error, statsLoading, modelStats]);

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  }, []);

  const onDropRejected = useCallback((rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      console.log('File rejected:', rejection);
      console.log('File type:', rejection.file.type);
      console.log('File size:', rejection.file.size);
      console.log('Errors:', rejection.errors);
      setError(`File rejected: ${rejection.errors.map(e => e.message).join(', ')}`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/avif': ['.avif'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp', '.dib'],
      'image/tiff': ['.tif', '.tiff'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
      'image/jfif': ['.jfif', '.jpe'],
      'video/mp4': ['.mp4'],
      'video/avi': ['.avi'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/x-matroska': ['.mkv'],
      'video/webm': ['.webm'],
      'video/x-m4v': ['.m4v']
    },
    multiple: false,
    maxSize: 500 * 1024 * 1024, // Increased to 500MB
    validator: (file) => {
      // Custom validator that accepts both images and videos
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        return {
          code: 'file-invalid-type',
          message: 'File must be an image or video'
        };
      }
      return null;
    }
  });

  const handleFileSelection = (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    
    const type = selectedFile.type.startsWith('video/') ? 'video' : 'image';
    setFileType(type);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitInProgressRef.current) {
      return;
    }
    
    if (!file) {
      setError('Please select a file first');
      return;
    }

    submitInProgressRef.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // Generate a session ID for progress tracking
    const tempSessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', tempSessionId);
    
    // Start polling for progress if it's a video
    let shouldStopPolling = false;
    let progressTimeout = null;

    if (fileType === 'video') {
      const scheduleNextPoll = (delayMs) => {
        if (shouldStopPolling) {
          return;
        }
        progressTimeout = setTimeout(pollProgress, delayMs);
      };

      const pollProgress = async () => {
        if (shouldStopPolling) {
          return;
        }

        try {
          const response = await axios.get(apiUrl(`/api/progress/${tempSessionId}`));
          const progressData = response.data;
          const suggestedDelay = Number(progressData.poll_after_ms);
          const delay = Number.isFinite(suggestedDelay) && suggestedDelay > 0 ? suggestedDelay : 10000;
          
          if (progressData.status === 'processing') {
            setProgress(progressData.percentage || 0);
            scheduleNextPoll(delay);
          } else if (progressData.status === 'initializing' || progressData.status === 'not_found') {
            scheduleNextPoll(delay);
          } else if (progressData.status === 'complete') {
            setProgress(100);
          } else {
            scheduleNextPoll(delay);
          }
        } catch (err) {
          // Progress endpoint may not exist yet, ignore errors
          console.debug('Progress not available yet');
          scheduleNextPoll(12000);
        }
      };

      pollProgress();
    }

    try {
      const response = await axios.post(apiUrl('/api/predict'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      setProgress(100);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during detection');
      console.error('Error:', err);
    } finally {
      setLoading(false);
      submitInProgressRef.current = false;
      shouldStopPolling = true;
      if (progressTimeout) {
        clearTimeout(progressTimeout);
      }
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setFileType(null);
    setProgress(0);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatMetric = (value) => {
    if (typeof value !== 'number') return '—';
    return `${(value * 100).toFixed(1)}%`;
  };

  const overallMetrics = modelStats?.validation_metrics?.overall;
  const architecture = modelStats?.architecture;
  const speed = modelStats?.inference_speed_ms_per_image;
  const classes = modelStats?.dataset?.classes || {};
  const perClassMetrics = modelStats?.validation_metrics?.per_class || {};
  const averageConfidence = result?.detections?.length
    ? result.detections.reduce((sum, det) => sum + det.confidence, 0) / result.detections.length
    : null;

  const map50Score = overallMetrics?.mAP50;
  const precisionScore = overallMetrics?.precision;
  const recallScore = overallMetrics?.recall;
  const inferenceMs = speed?.inference;

  const getQualityLabel = (value) => {
    if (typeof value !== 'number') return 'Not available yet';
    if (value >= 0.85) return 'Excellent';
    if (value >= 0.7) return 'Strong';
    if (value >= 0.55) return 'Good';
    return 'Needs improvement';
  };

  const getSpeedLabel = (value) => {
    if (typeof value !== 'number') return 'Speed data unavailable';
    if (value <= 20) return 'Very fast';
    if (value <= 50) return 'Fast';
    if (value <= 100) return 'Moderate';
    return 'Slower than ideal';
  };

  const plainEnglishInsights = [
    {
      title: 'Overall Detection Quality',
      value: formatMetric(map50Score),
      description:
        typeof map50Score === 'number'
          ? `The model quality is ${getQualityLabel(map50Score).toLowerCase()} based on how consistently it finds and labels road damage correctly.`
          : 'This score will appear once model evaluation data is available.'
    },
    {
      title: 'How Trustworthy Positive Results Are',
      value: formatMetric(precisionScore),
      description:
        typeof precisionScore === 'number'
          ? 'Precision shows how often detected damage is actually real damage. Higher precision means fewer false alarms.'
          : 'Precision data is currently unavailable.'
    },
    {
      title: 'How Much Damage Is Being Missed',
      value: formatMetric(recallScore),
      description:
        typeof recallScore === 'number'
          ? 'Recall shows how much real damage is successfully found. Higher recall means fewer missed defects.'
          : 'Recall data is currently unavailable.'
    },
    {
      title: 'Processing Speed',
      value: typeof inferenceMs === 'number' ? `${inferenceMs} ms` : '—',
      description:
        typeof inferenceMs === 'number'
          ? `${getSpeedLabel(inferenceMs)} for each image, which gives you an idea of how responsive detection feels in real use.`
          : 'Inference speed is currently unavailable.'
    }
  ];

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-left">
            <img
              className="header-brand-logo"
              src={`${process.env.PUBLIC_URL}/logo.png`}
              alt="RoadLens logo"
            />
            <div className="header-text">
              <p className="header-kicker">Smart Infrastructure Intelligence</p>
              <h1>RoadLens</h1>
              <p className="subtitle">Fast detection for cracks, potholes, and road defects from images or video.</p>
              <div className="header-underline"></div>
            </div>
          </div>

          <div className="header-badges">
            <div className="header-badge">
              <span>Model</span>
              <strong>{modelStats?.model_name || 'YOLO Detector'}</strong>
            </div>
            <div className="header-badge">
              <span>mAP50</span>
              <strong>{formatMetric(overallMetrics?.mAP50)}</strong>
            </div>
            <div className="header-badge">
              <span>Precision</span>
              <strong>{formatMetric(overallMetrics?.precision)}</strong>
            </div>
            <div className="header-badge premium-badge">
              <span>Engine</span>
              <strong>YOLOv26 Medium</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="App-main" ref={scrollContainerRef} data-scroll-container>
        <div className="container">
          <section className="model-insights-section">
            <div className="model-details-header">
              <h2>Model Performance Insights</h2>
            </div>

            {statsLoading && <p className="model-state-text">Loading insight summary...</p>}
            {statsError && <p className="model-state-text error">{statsError}</p>}

            {!statsLoading && !statsError && (
              <div className="insights-grid">
                {plainEnglishInsights.map((insight) => (
                  <article className="insight-card" key={insight.title}>
                    <p className="insight-title">{insight.title}</p>
                    <p className="insight-value">{insight.value}</p>
                    <p className="insight-description">{insight.description}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {!result && !loading && (
            <div className="upload-section">
              <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <FiUploadCloud className="upload-icon" />
                {isDragActive ? (
                  <p className="dropzone-text">Drop your file here</p>
                ) : (
                  <>
                    <p className="dropzone-text-primary">Drag & drop your file here</p>
                    <p className="dropzone-text-secondary">or click to browse</p>
                    <p className="dropzone-formats">Supports: JPG, JPEG, PNG, WEBP, JFIF, AVIF, GIF, BMP, TIFF, HEIC, HEIF, MP4, AVI, MOV, MKV, WEBM, M4V</p>
                  </>
                )}
              </div>

              {file && (
                <div className="file-preview-card">
                  <div className="file-info-header">
                    <div className="file-icon">
                      {fileType === 'video' ? <FiVideo size={24} /> : <FiImage size={24} />}
                    </div>
                    <div className="file-details">
                      <h3 className="file-name">{file.name}</h3>
                      <p className="file-meta">
                        {formatFileSize(file.size)} • {fileType === 'video' ? 'Video' : 'Image'}
                      </p>
                    </div>
                    <button onClick={handleReset} className="btn-icon-only" title="Remove file">
                      <FiX size={20} />
                    </button>
                  </div>

                  <div className="file-preview-content">
                    {fileType === 'image' ? (
                      <img src={preview} alt="Preview" className="preview-media" />
                    ) : (
                      <video src={preview} controls className="preview-media" />
                    )}
                  </div>

                  <div className="action-buttons">
                    <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
                      <FiPlay />
                      <span>Start Detection</span>
                    </button>
                    <button onClick={handleReset} className="btn btn-secondary" disabled={loading}>
                      <FiRefreshCw />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="loading-section">
              <div className="spinner-container">
                <FiSearch className="analyzing-icon" />
              </div>
              <h3>Analyzing {fileType}...</h3>
              <p>
                {fileType === 'video' && progress > 0 
                  ? `Processing frames and detecting damage patterns - ${progress}%`
                  : 'Processing frames and detecting damage patterns'
                }
              </p>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              {fileType === 'video' && progress > 0 && (
                <p className="progress-text">{progress}% complete</p>
              )}
            </div>
          )}

          {error && (
            <div className="error-section">
              <FiAlertCircle className="error-icon" />
              <h3>Detection Failed</h3>
              <p>{error}</p>
              <button onClick={handleReset} className="btn btn-secondary">
                <FiRefreshCw />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {result && (
            <div className="results-section">
              <div className="results-header">
                <HiSparkles className="success-icon" />
                <h2>Detection Complete</h2>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon stat-icon-danger">
                    <HiShieldExclamation />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{result.detection_count || result.total_detections || 0}</div>
                    <div className="stat-label">Total Detections</div>
                  </div>
                </div>
                
                {result.type === 'video' && (
                  <div className="stat-card">
                    <div className="stat-icon stat-icon-info">
                      <HiFilm />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{result.frames_processed}</div>
                      <div className="stat-label">Frames Processed</div>
                    </div>
                  </div>
                )}

                {averageConfidence !== null && (
                  <div className="stat-card">
                    <div className="stat-icon stat-icon-accent">
                      <HiCpuChip />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{(averageConfidence * 100).toFixed(0)}%</div>
                      <div className="stat-label">Avg. Confidence</div>
                    </div>
                  </div>
                )}
              </div>

              {result.detection_summary && Object.keys(result.detection_summary).length > 0 && (
                <div className="detection-summary">
                  <h3>Detected Damage Types</h3>
                  <div className="damage-types-grid">
                    {Object.entries(result.detection_summary).map(([className, count]) => (
                      <div key={className} className="damage-type-item">
                        <div className="damage-type-info">
                          <span className="damage-type-name">{className}</span>
                          <span className="damage-type-count">{count}</span>
                        </div>
                        <div className="damage-type-bar">
                          <div 
                            className="damage-type-bar-fill" 
                            style={{
                              width: `${(count / (result.detection_count || result.total_detections || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.type === 'image' && result.result_image && (
                <div className="result-media-section">
                  <h3>Annotated Result</h3>
                  <div className="result-image-container">
                    <img 
                      src={result.result_image} 
                      alt="Detection Result" 
                      className="result-image"
                    />
                  </div>
                  
                  {result.detections && result.detections.length > 0 && (
                    <div className="detections-table-container">
                      <h3>Detection Details</h3>
                      <table className="detections-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Type</th>
                            <th>Confidence</th>
                            <th>Coordinates</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.detections.map((det, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td><span className="badge">{det.class}</span></td>
                              <td>
                                <div className="confidence-bar">
                                  <div 
                                    className="confidence-fill" 
                                    style={{width: `${det.confidence * 100}%`}}
                                  ></div>
                                  <span className="confidence-text">{(det.confidence * 100).toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="coordinates">
                                ({det.bbox.x1.toFixed(0)}, {det.bbox.y1.toFixed(0)}) → 
                                ({det.bbox.x2.toFixed(0)}, {det.bbox.y2.toFixed(0)})
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {result.type === 'video' && result.result_video_url && (
                <div className="result-media-section">
                  <h3>Processed Video</h3>
                  <div className="video-player-card">
                    <video
                      src={result.result_video_url}
                      controls
                      preload="none"
                      className="result-video"
                    />
                    <div className="video-info">
                      <h4>Your video has been processed</h4>
                      <p>{result.frames_processed} frames analyzed with {result.total_detections} detections</p>
                    </div>
                    <a href={result.download_video_url || result.result_video_url} className="btn btn-download">
                      <FiDownload />
                      <span>Download Video</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="result-actions">
                <button onClick={handleReset} className="btn btn-secondary">
                  <FiRefreshCw />
                  <span>Detect Another File</span>
                </button>
              </div>
            </div>
          )}

          <section className="model-details-section">
            <div className="model-details-header">
              <h2>Model Technical Details</h2>
              <p>Live metadata from <code>/api/stats</code></p>
            </div>

            {statsLoading && <p className="model-state-text">Loading model profile...</p>}
            {statsError && <p className="model-state-text error">{statsError}</p>}

            {!statsLoading && !statsError && modelStats && (
              <>
                <div className="model-meta-grid">
                  <div className="model-meta-card">
                    <h4>Identity</h4>
                    <p><strong>{modelStats.model_name}</strong></p>
                    <p>{modelStats.framework?.library} {modelStats.framework?.version}</p>
                    <p>Task: {modelStats.framework?.task}</p>
                    <p>Checkpoint: {modelStats.framework?.checkpoint_path}</p>
                  </div>

                  <div className="model-meta-card">
                    <h4>Architecture</h4>
                    <p>{architecture?.summary_name}</p>
                    <p>Layers: {architecture?.layers?.toLocaleString?.() || architecture?.layers}</p>
                    <p>Params: {architecture?.parameters?.toLocaleString?.() || architecture?.parameters}</p>
                    <p>GFLOPs: {architecture?.gflops}</p>
                  </div>

                  <div className="model-meta-card">
                    <h4>Validation Set</h4>
                    <p>Images: {modelStats.dataset?.validation_images?.toLocaleString?.() || modelStats.dataset?.validation_images}</p>
                    <p>Instances: {modelStats.dataset?.validation_instances?.toLocaleString?.() || modelStats.dataset?.validation_instances}</p>
                    <p>Classes: {Object.keys(classes).length}</p>
                  </div>

                  <div className="model-meta-card">
                    <h4>Inference Profile</h4>
                    <p>Image size: {modelStats.training_configuration?.inference_image_size}</p>
                    <p>Conf / IoU: {modelStats.training_configuration?.inference_thresholds?.conf} / {modelStats.training_configuration?.inference_thresholds?.iou}</p>
                    <p>Inference: {speed?.inference ?? '—'} ms</p>
                    <p>Pre/Post: {speed?.preprocess ?? '—'} / {speed?.postprocess ?? '—'} ms</p>
                  </div>
                </div>

                <div className="model-metrics-strip">
                  <div className="metric-item">
                    <span>Precision</span>
                    <strong>{formatMetric(overallMetrics?.precision)}</strong>
                  </div>
                  <div className="metric-item">
                    <span>Recall</span>
                    <strong>{formatMetric(overallMetrics?.recall)}</strong>
                  </div>
                  <div className="metric-item">
                    <span>mAP@50</span>
                    <strong>{formatMetric(overallMetrics?.mAP50)}</strong>
                  </div>
                  <div className="metric-item">
                    <span>mAP@50:95</span>
                    <strong>{formatMetric(overallMetrics?.mAP50_95)}</strong>
                  </div>
                </div>

                {Object.keys(perClassMetrics).length > 0 && (
                  <div className="class-metrics-panel">
                    <h3>Per-Class Validation Metrics</h3>
                    <div className="class-metrics-table-wrap">
                      <table className="class-metrics-table">
                        <thead>
                          <tr>
                            <th>Class</th>
                            <th>Precision</th>
                            <th>Recall</th>
                            <th>mAP@50</th>
                            <th>mAP@50:95</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(perClassMetrics).map(([className, values]) => (
                            <tr key={className}>
                              <td>{className}</td>
                              <td>{formatMetric(values.precision)}</td>
                              <td>{formatMetric(values.recall)}</td>
                              <td>{formatMetric(values.mAP50)}</td>
                              <td>{formatMetric(values.mAP50_95)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <footer className="App-footer">
        <div className="footer-content">
          <div className="footer-brand-block">
            <p className="footer-kicker">Road Safety Intelligence</p>
            <h4>Model Performance Snapshot</h4>
            <div className="footer-metrics">
              <span>mAP50: {formatMetric(overallMetrics?.mAP50)}</span>
              <span>Precision: {formatMetric(overallMetrics?.precision)}</span>
              <span>Recall: {formatMetric(overallMetrics?.recall)}</span>
            </div>
          </div>
          <div className="footer-model-block">
            <p>{modelStats?.model_name || 'RoadLens Detection Model'} • {modelStats?.framework?.library || 'Ultralytics'} {modelStats?.framework?.version || ''}</p>
            <p className="footer-love">
              Crafted with <HiHeart className="footer-heart" /> by{' '}
              <a
                className="footer-name-link"
                href="https://paramdholakia.vercel.app"
                target="_blank"
                rel="noreferrer"
              >
                Param Dholakia
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
