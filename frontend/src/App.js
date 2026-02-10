import React, { useState, useCallback } from 'react';
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during detection');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setFileType(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

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
              <p>Processing frames and detecting damage patterns</p>
              <div className="progress-bar">
                <div className="progress-bar-fill"></div>
              </div>
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
              <span>mAP50: 55.6%</span>
              <span>Precision: 60.8%</span>
              <span>Recall: 52.4%</span>
            </div>
          </div>
          <div className="footer-section">
            <p>YOLOv26n Model • RDD-2022 Dataset</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
