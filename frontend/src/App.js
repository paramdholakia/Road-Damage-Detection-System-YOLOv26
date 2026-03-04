import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { 
  FiUploadCloud, 
  FiX, 
  FiPlay, 
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiDownload,
  FiImage,
  FiVideo,
  FiActivity
} from 'react-icons/fi';
import { 
  MdBrokenImage,
  MdWarning 
} from 'react-icons/md';

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    const fetchModelStats = async () => {
      try {
        setStatsLoading(true);
        const response = await axios.get('/api/stats');
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
      'video/mp4': ['.mp4'],
      'video/avi': ['.avi'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/x-matroska': ['.mkv']
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
    
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // Generate a session ID for progress tracking
    const tempSessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(tempSessionId);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', tempSessionId);
    
    // Start polling for progress if it's a video
    let progressInterval = null;
    if (fileType === 'video') {
      progressInterval = setInterval(async () => {
        try {
          const response = await axios.get(`/api/progress/${tempSessionId}`);
          const progressData = response.data;
          
          if (progressData.status === 'processing') {
            setProgress(progressData.percentage || 0);
          } else if (progressData.status === 'complete') {
            setProgress(100);
            clearInterval(progressInterval);
          }
        } catch (err) {
          // Progress endpoint may not exist yet, ignore errors
          console.debug('Progress not available yet');
        }
      }, 500); // Poll every 500ms
    }

    try {
      const response = await axios.post('/api/predict', formData, {
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
      if (progressInterval) {
        clearInterval(progressInterval);
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
    setSessionId(null);
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

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-icon">
            <MdBrokenImage size={40} />
          </div>
          <div className="header-text">
            <h1>Road Damage Detection System</h1>
            <p className="subtitle">AI-Powered Infrastructure Analysis</p>
          </div>
        </div>
      </header>

      <main className="App-main">
        <div className="container">
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
                    <p className="dropzone-formats">Supports: JPG, PNG, MP4, AVI, MOV</p>
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
                <FiActivity className="spinner-icon" />
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
                <FiCheckCircle className="success-icon" />
                <h2>Detection Complete</h2>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <MdWarning />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{result.detection_count || result.total_detections || 0}</div>
                    <div className="stat-label">Total Detections</div>
                  </div>
                </div>
                
                {result.type === 'video' && (
                  <div className="stat-card">
                    <div className="stat-icon">
                      <FiVideo />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{result.frames_processed}</div>
                      <div className="stat-label">Frames Processed</div>
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
                      className="result-video"
                    />
                    <div className="video-info">
                      <h4>Your video has been processed</h4>
                      <p>{result.frames_processed} frames analyzed with {result.total_detections} detections</p>
                    </div>
                    <a href={result.result_video_url} className="btn btn-download">
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
        </div>
      </main>

      <footer className="App-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Model Performance</h4>
            <div className="footer-metrics">
              <span>mAP50: {formatMetric(overallMetrics?.mAP50)}</span>
              <span>Precision: {formatMetric(overallMetrics?.precision)}</span>
              <span>Recall: {formatMetric(overallMetrics?.recall)}</span>
            </div>
          </div>
          <div className="footer-section">
            <p>{modelStats?.model_name || 'Road Damage Detection Model'} • {modelStats?.framework?.library || 'Ultralytics'} {modelStats?.framework?.version || ''}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
