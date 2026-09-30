import { useState, useRef, useEffect } from 'react'
import './landing.css'
import Navbar from './Navbar.jsx'

export default function Landing() {
  const videoRef = useRef(null)
  const cardRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Ensure autoplay starts smoothly even if browser restricts it
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true
      videoRef.current.muted = true
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
          })
          .catch((error) => {
            console.warn('Autoplay prevented or interrupted:', error)
            setIsPlaying(false)
          })
      }
    }
  }, [])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const nextMuted = !videoRef.current.muted
    videoRef.current.muted = nextMuted
    setIsMuted(nextMuted)
  }

  const toggleFullscreen = () => {
    if (!cardRef.current) return
    if (!document.fullscreenElement) {
      cardRef.current.requestFullscreen?.().catch(console.error)
    } else {
      document.exitFullscreen?.().catch(console.error)
    }
  }

  return (
    <main className="landing-page">
      <Navbar />
      <section className="hero-section" aria-label="Hero Section">
        <div className="hero-copy">
          <h1>Move Smarter. Deliver Faster.</h1>
          <p>
            LogiCraft connects fleets, warehouses, shipments, and transportation
            operations in one intelligent platform—giving you the visibility and
            control to move goods efficiently from pickup to delivery.
          </p>
        </div>
        <div className="hero-video-container">
          <div className="hero-video-card" ref={cardRef}>
            <video
              ref={videoRef}
              className="hero-video"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              {/* Primary file in public directory */}
              <source
                src="/WhatsApp%20Video%202026-09-29%20at%2010.25.29%20AM.mp4"
                type="video/mp4"
              />
              <source
                src="/WhatsApp Video 2026-09-29 at 10.25.29 AM.mp4"
                type="video/mp4"
              />
              {/* Fallback alias */}
              <source src="/hero-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            <div className="video-info-overlay">
              <div className="video-info-copy">
                <p>
                  Reliable freight, transportation, and logistics solutions
                  designed to keep your supply chain moving with efficiency,
                  visibility, and confidence.
                </p>
                <div className="video-info-actions">
                  <a className="video-quote-button" href="#get-started">
                    <span aria-hidden="true">&#9632;</span>
                    Get a Quote
                  </a>
                  <a className="video-about-link" href="#about-us">
                    About Us
                  </a>
                </div>
              </div>

              <div className="video-stats" aria-label="Logistics performance metrics">
                <div className="video-stat">
                  <strong>98<span>%</span></strong>
                  <span>On-time delivery rate</span>
                </div>
                <div className="video-stat">
                  <strong>24/7</strong>
                  <span>Real-time tracking</span>
                </div>
              </div>
            </div>

            {/* Video Controls Overlay */}
            <div
              className={`video-controls-overlay ${!isPlaying ? 'always-visible' : ''}`}
            >
              <div className="video-controls-bar">
                {/* Left side: Live / Status Pill */}
                <div className="control-pill-group">
                  <span className="video-status-badge">
                    <span className="status-dot"></span>
                    {isPlaying ? 'Playing' : 'Paused'}
                  </span>
                </div>

                {/* Right side: Interactive Playback Controls */}
                <div className="control-pill-group">
                  <button
                    type="button"
                    className="control-btn"
                    onClick={togglePlay}
                    title={isPlaying ? 'Pause video' : 'Play video'}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    className="control-btn"
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute video' : 'Mute video'}
                    aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isMuted ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    className="control-btn"
                    onClick={toggleFullscreen}
                    title={
                      isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                    }
                    aria-label={
                      isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                    }
                  >
                    {isFullscreen ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="why-section" aria-label="Why LogiCraft">
        <span className="why-label">why logicraft?</span>
        <p>
          From fleet operations to warehouse workflows and shipment tracking,
          LogiCraft brings every moving part of your logistics operation
          together in one connected platform.
        </p>
      </section>

      <section className="solutions-section" id="solutions" aria-labelledby="solutions-title">
        <h2 id="solutions-title">Solutions</h2>

        <div className="solution-row">
          <article className="solution-details">
            <h3><span>01</span> Fleet management</h3>
            <ul>
              <li>Real-time vehicle tracking</li>
              <li>Route monitoring &amp; optimization</li>
              <li>Vehicle maintenance management</li>
              <li>Driver &amp; trip management</li>
              <li>Fleet performance analytics</li>
            </ul>
          </article>
          <div className="solution-media">
            <video autoPlay loop muted playsInline preload="metadata" aria-label="Fleet management operations">
              <source src="/fleet%20managment.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        <div className="solution-row solution-row-reverse">
          <div className="solution-media">
            <video autoPlay loop muted playsInline preload="metadata" aria-label="Warehouse management operations">
              <source src="/warehouse%20managment.mp4" type="video/mp4" />
            </video>
          </div>
          <article className="solution-details">
            <h3><span>02</span> Warehouse management</h3>
            <ul>
              <li>Real-time inventory tracking</li>
              <li>Barcode &amp; package scanning</li>
              <li>Warehouse workflow management</li>
              <li>Smart picking &amp; dispatching</li>
              <li>Inventory &amp; stock analytics</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  )
}

export { Landing }
