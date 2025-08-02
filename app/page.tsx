"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, CameraOff, RotateCcw, Settings, Eye, Target } from "lucide-react"

interface CursorPosition {
  x: number
  y: number
}

interface EyeData {
  left: { x: number; y: number; detected: boolean }
  right: { x: number; y: number; detected: boolean }
  gazeX: number
  gazeY: number
}

interface CalibrationPoint {
  screen: CursorPosition
  eye: CursorPosition
}

export default function Component() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const debugCanvasRef = useRef<HTMLCanvasElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  const [isTracking, setIsTracking] = useState(false)
  const [isCalibrated, setIsCalibrated] = useState(false)
  const [centerPoint, setCenterPoint] = useState<CursorPosition>({ x: 0, y: 0 })
  const [sensitivity, setSensitivity] = useState(3)
  const [eyeSensitivity, setEyeSensitivity] = useState(5)
  const [faceDetected, setFaceDetected] = useState(false)
  const [eyeData, setEyeData] = useState<EyeData>({
    left: { x: 0, y: 0, detected: false },
    right: { x: 0, y: 0, detected: false },
    gazeX: 0,
    gazeY: 0,
  })
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>([])
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationStep, setCalibrationStep] = useState(0)
  const [eyeTrackingEnabled, setEyeTrackingEnabled] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)

  const calibrationTargets = [
    { x: 0.2, y: 0.2 }, // Top-left
    { x: 0.8, y: 0.2 }, // Top-right
    { x: 0.5, y: 0.5 }, // Center
    { x: 0.2, y: 0.8 }, // Bottom-left
    { x: 0.8, y: 0.8 }, // Bottom-right
  ]

  // Game state
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [dinoY, setDinoY] = useState(200)
  const [dinoState, setDinoState] = useState<"running" | "jumping" | "crouching">("running")
  const [obstacles, setObstacles] = useState<Array<{ x: number; type: "cactus" | "bird" }>>([])
  const [gameSpeed, setGameSpeed] = useState(5)
  const [isJumping, setIsJumping] = useState(false)
  const [jumpVelocity, setJumpVelocity] = useState(0)

  // Cursor movement tracking - using refs to avoid React state issues
  const trackingDataRef = useRef({
    cursorPosition: { x: 0, y: 0 },
    prevCursorPosition: { x: 0, y: 0 },
    cursorVelocity: { x: 0, y: 0 },
    isTracking: false,
    isCalibrated: false,
    isCalibrating: false,
    centerPoint: { x: 0, y: 0 },
    sensitivity: 3,
    eyeSensitivity: 5,
    eyeTrackingEnabled: true,
    calibrationPoints: [] as CalibrationPoint[],
    gameState: "menu" as "menu" | "playing" | "gameOver",
    isJumping: false,
    dinoState: "running" as "running" | "jumping" | "crouching",
    faceDetected: false,
    frameCount: 0,
    lastLogTime: 0,
  })

  const gameLoopRef = useRef<number>()
  const GROUND_Y = 200
  const DINO_WIDTH = 40
  const DINO_HEIGHT = 40
  const OBSTACLE_WIDTH = 20
  const OBSTACLE_HEIGHT = 40

  // Check if component is mounted (client-side)
  useEffect(() => {
    setIsMounted(true)
    // Initialize cursor position safely
    if (typeof window !== "undefined") {
      trackingDataRef.current.cursorPosition = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }
      trackingDataRef.current.prevCursorPosition = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }
    }
  }, [])

  // Update tracking data when React state changes
  useEffect(() => {
    trackingDataRef.current.isTracking = isTracking
    console.log("🎥 Tracking state changed:", isTracking)
  }, [isTracking])

  useEffect(() => {
    trackingDataRef.current.isCalibrated = isCalibrated
    console.log("🎯 Calibration state changed:", isCalibrated)
  }, [isCalibrated])

  useEffect(() => {
    trackingDataRef.current.isCalibrating = isCalibrating
  }, [isCalibrating])

  useEffect(() => {
    trackingDataRef.current.centerPoint = centerPoint
  }, [centerPoint])

  useEffect(() => {
    trackingDataRef.current.sensitivity = sensitivity
  }, [sensitivity])

  useEffect(() => {
    trackingDataRef.current.eyeSensitivity = eyeSensitivity
  }, [eyeSensitivity])

  useEffect(() => {
    trackingDataRef.current.eyeTrackingEnabled = eyeTrackingEnabled
  }, [eyeTrackingEnabled])

  useEffect(() => {
    trackingDataRef.current.calibrationPoints = calibrationPoints
  }, [calibrationPoints])

  useEffect(() => {
    trackingDataRef.current.gameState = gameState
    trackingDataRef.current.isJumping = isJumping
    trackingDataRef.current.dinoState = dinoState
    console.log("🎮 Game state changed:", gameState, "Jumping:", isJumping, "Dino:", dinoState)
  }, [gameState, isJumping, dinoState])

  // Initialize camera
  const startCamera = useCallback(async () => {
    if (typeof window === "undefined") return

    try {
      console.log("📹 Starting camera...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsTracking(true)
        console.log("✅ Camera started successfully")
      }
    } catch (error) {
      console.error("❌ Error accessing camera:", error)
      alert("Camera access denied. Please allow camera access to use head tracking.")
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log("🛑 Stopping camera...")
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsTracking(false)
    setFaceDetected(false)
    setIsCalibrating(false)
  }, [])

  // Enhanced face and eye detection
  const detectFaceAndEyes = (canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Face detection using skin tone
    const faceRegions: { x: number; y: number; count: number }[] = []
    const gridSize = 15

    for (let y = 0; y < canvas.height; y += gridSize) {
      for (let x = 0; x < canvas.width; x += gridSize) {
        let skinPixels = 0
        let totalPixels = 0

        for (let dy = 0; dy < gridSize && y + dy < canvas.height; dy++) {
          for (let dx = 0; dx < gridSize && x + dx < canvas.width; dx++) {
            const i = ((y + dy) * canvas.width + (x + dx)) * 4
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]

            // Enhanced skin tone detection
            if (
              r > 95 &&
              g > 40 &&
              b > 20 &&
              Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
              Math.abs(r - g) > 15 &&
              r > g &&
              r > b
            ) {
              skinPixels++
            }
            totalPixels++
          }
        }

        if (totalPixels > 0 && skinPixels / totalPixels > 0.4) {
          faceRegions.push({ x: x + gridSize / 2, y: y + gridSize / 2, count: skinPixels })
        }
      }
    }

    if (faceRegions.length > 0) {
      // Calculate face center
      const totalWeight = faceRegions.reduce((sum, region) => sum + region.count, 0)
      const faceX = faceRegions.reduce((sum, region) => sum + region.x * region.count, 0) / totalWeight
      const faceY = faceRegions.reduce((sum, region) => sum + region.y * region.count, 0) / totalWeight

      // Estimate face bounds
      const minX = Math.min(...faceRegions.map((r) => r.x)) - gridSize
      const maxX = Math.max(...faceRegions.map((r) => r.x)) + gridSize
      const minY = Math.min(...faceRegions.map((r) => r.y)) - gridSize
      const maxY = Math.max(...faceRegions.map((r) => r.y)) + gridSize

      // Eye detection within face region
      const eyeRegionHeight = (maxY - minY) * 0.4
      const eyeRegionY = minY + (maxY - minY) * 0.3
      const faceWidth = maxX - minX
      const leftEyeX = faceX - faceWidth * 0.2
      const rightEyeX = faceX + faceWidth * 0.2

      // Detect eyes using dark pixel detection
      const leftEye = detectEye(data, canvas.width, leftEyeX, eyeRegionY, faceWidth * 0.15, eyeRegionHeight)
      const rightEye = detectEye(data, canvas.width, rightEyeX, eyeRegionY, faceWidth * 0.15, eyeRegionHeight)

      // Calculate gaze direction - Fix inverted X axis for mirrored camera
      let gazeX = 0,
        gazeY = 0
      if (leftEye.detected && rightEye.detected) {
        gazeX = canvas.width - (leftEye.x + rightEye.x) / 2 // Invert X coordinate
        gazeY = (leftEye.y + rightEye.y) / 2
      } else if (leftEye.detected) {
        gazeX = canvas.width - leftEye.x // Invert X coordinate
        gazeY = leftEye.y
      } else if (rightEye.detected) {
        gazeX = canvas.width - rightEye.x // Invert X coordinate
        gazeY = rightEye.y
      }

      return {
        face: { x: faceX, y: faceY },
        eyes: {
          left: leftEye,
          right: rightEye,
          gazeX,
          gazeY,
        },
      }
    }

    return null
  }

  // Eye detection helper function
  const detectEye = (
    data: Uint8ClampedArray,
    width: number,
    centerX: number,
    centerY: number,
    eyeWidth: number,
    eyeHeight: number,
  ) => {
    let darkestX = centerX
    let darkestY = centerY
    let minBrightness = 255

    const startX = Math.max(0, centerX - eyeWidth / 2)
    const endX = Math.min(width, centerX + eyeWidth / 2)
    const startY = Math.max(0, centerY - eyeHeight / 2)
    const endY = Math.min(data.length / (width * 4), centerY + eyeHeight / 2)

    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        const i = (Math.floor(y) * width + Math.floor(x)) * 4
        if (i < data.length - 3) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
          if (brightness < minBrightness) {
            minBrightness = brightness
            darkestX = x
            darkestY = y
          }
        }
      }
    }

    // Eye detected if we found significantly dark pixels
    const detected = minBrightness < 80
    return { x: darkestX, y: darkestY, detected }
  }

  // Draw debug visualization
  const drawDebugInfo = (detectionResult: any) => {
    const debugCanvas = debugCanvasRef.current
    if (!debugCanvas || !detectionResult) return

    const ctx = debugCanvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, debugCanvas.width, debugCanvas.height)

    // Draw face center
    ctx.fillStyle = "red"
    ctx.beginPath()
    ctx.arc(detectionResult.face.x, detectionResult.face.y, 5, 0, 2 * Math.PI)
    ctx.fill()

    // Draw eyes
    if (detectionResult.eyes.left.detected) {
      ctx.fillStyle = "blue"
      ctx.beginPath()
      ctx.arc(detectionResult.eyes.left.x, detectionResult.eyes.left.y, 3, 0, 2 * Math.PI)
      ctx.fill()
    }

    if (detectionResult.eyes.right.detected) {
      ctx.fillStyle = "green"
      ctx.beginPath()
      ctx.arc(detectionResult.eyes.right.x, detectionResult.eyes.right.y, 3, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Draw gaze point
    if (detectionResult.eyes.gazeX && detectionResult.eyes.gazeY) {
      ctx.fillStyle = "purple"
      ctx.beginPath()
      ctx.arc(detectionResult.eyes.gazeX, detectionResult.eyes.gazeY, 4, 0, 2 * Math.PI)
      ctx.fill()
    }
  }

  // Interpolate gaze to screen coordinates using calibration points
  const interpolateGaze = (
    gazeX: number,
    gazeY: number,
    calibrationPoints: CalibrationPoint[],
    eyeSensitivity: number,
  ) => {
    if (calibrationPoints.length < 3) return null

    // Use Inverse Distance Weighting (IDW) for better interpolation
    let totalWeight = 0
    let weightedX = 0
    let weightedY = 0

    calibrationPoints.forEach((point) => {
      const distance = Math.sqrt(Math.pow(gazeX - point.eye.x, 2) + Math.pow(gazeY - point.eye.y, 2))
      // Use a power parameter for better weighting and apply eye sensitivity
      const weight = (1 / Math.pow(distance + 1, 2)) * eyeSensitivity
      totalWeight += weight
      weightedX += point.screen.x * weight
      weightedY += point.screen.y * weight
    })

    if (totalWeight === 0) return null

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
    }
  }

  // Update cursor position using direct DOM manipulation
  const updateCursorPosition = (x: number, y: number) => {
    if (cursorRef.current) {
      cursorRef.current.style.left = `${x - 12}px`
      cursorRef.current.style.top = `${y - 12}px`
    }

    // Update tracking data
    const data = trackingDataRef.current
    data.prevCursorPosition = { ...data.cursorPosition }
    data.cursorPosition = { x, y }

    // Calculate velocity
    data.cursorVelocity = {
      x: x - data.prevCursorPosition.x,
      y: y - data.prevCursorPosition.y,
    }
  }

  // Main animation loop - completely independent
  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return

    let animationId: number
    let isRunning = true

    const processFrame = () => {
      if (!isRunning) return

      const data = trackingDataRef.current
      data.frameCount++

      // Log every 60 frames (about once per second at 60fps)
      const now = Date.now()
      if (now - data.lastLogTime > 1000) {
        console.log(
          `🔄 Processing frame ${data.frameCount}, Tracking: ${data.isTracking}, Calibrated: ${data.isCalibrated}, Game: ${data.gameState}`,
        )
        data.lastLogTime = now
      }

      if (!videoRef.current || !canvasRef.current || !data.isTracking) {
        animationId = requestAnimationFrame(processFrame)
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const detectionResult = detectFaceAndEyes(canvas, video)

        if (detectionResult) {
          data.faceDetected = true
          setFaceDetected(true)
          setEyeData(detectionResult.eyes)

          // Draw debug info
          drawDebugInfo(detectionResult)

          if (data.isCalibrated && !data.isCalibrating) {
            // Calculate cursor movement
            let screenX = window.innerWidth / 2
            let screenY = window.innerHeight / 2

            // Head movement (coarse control) - Fix inverted X axis due to mirrored camera
            const headDeltaX = (data.centerPoint.x - detectionResult.face.x) * data.sensitivity // Inverted X
            const headDeltaY = (detectionResult.face.y - data.centerPoint.y) * data.sensitivity // Y stays the same

            screenX += headDeltaX
            screenY += headDeltaY

            // Eye tracking (fine control)
            if (data.eyeTrackingEnabled && data.calibrationPoints.length >= 3) {
              const eyeScreenPos = interpolateGaze(
                detectionResult.eyes.gazeX,
                detectionResult.eyes.gazeY,
                data.calibrationPoints,
                data.eyeSensitivity,
              )
              if (eyeScreenPos) {
                // Apply eye sensitivity scaling
                const eyeDeltaX = (eyeScreenPos.x - window.innerWidth / 2) * (data.eyeSensitivity / 5)
                const eyeDeltaY = (eyeScreenPos.y - window.innerHeight / 2) * (data.eyeSensitivity / 5)

                // Blend head and eye tracking with better weighting
                screenX = screenX * 0.4 + (window.innerWidth / 2 + eyeDeltaX) * 0.6
                screenY = screenY * 0.4 + (window.innerHeight / 2 + eyeDeltaY) * 0.6
              }
            }

            // Constrain to screen bounds
            screenX = Math.max(0, Math.min(window.innerWidth, screenX))
            screenY = Math.max(0, Math.min(window.innerHeight, screenY))

            // Update cursor position using direct DOM manipulation
            updateCursorPosition(screenX, screenY)

            // Only apply game controls when game is playing
            if (data.gameState === "playing") {
              const velocity = data.cursorVelocity

              // Jump when cursor moves up significantly
              if (velocity.y < -15 && !data.isJumping && data.dinoState !== "crouching") {
                console.log("🦘 JUMP triggered! Velocity Y:", velocity.y)
                setIsJumping(true)
                setJumpVelocity(-15)
                setDinoState("jumping")
              }

              // Crouch when cursor moves down significantly
              else if (velocity.y > 10 && !data.isJumping) {
                console.log("🦆 CROUCH triggered! Velocity Y:", velocity.y)
                setDinoState("crouching")
              }

              // Return to running when cursor is stable
              else if (Math.abs(velocity.y) < 5 && !data.isJumping) {
                if (data.dinoState !== "running") {
                  console.log("🏃 RUNNING restored! Velocity Y:", velocity.y)
                  setDinoState("running")
                }
              }

              // Slow down when cursor moves left
              if (velocity.x < -10) {
                console.log("🐌 SLOW triggered! Velocity X:", velocity.x)
                setGameSpeed((prev) => Math.max(2, prev - 0.5))
              } else {
                setGameSpeed((prev) => Math.min(8, prev + 0.1))
              }
            }
          }
        } else {
          if (data.faceDetected) {
            console.log("😞 Face lost")
            data.faceDetected = false
            setFaceDetected(false)
            setEyeData({
              left: { x: 0, y: 0, detected: false },
              right: { x: 0, y: 0, detected: false },
              gazeX: 0,
              gazeY: 0,
            })
          }
        }
      }

      animationId = requestAnimationFrame(processFrame)
    }

    // Start the animation loop
    console.log("🚀 Starting animation loop")
    animationId = requestAnimationFrame(processFrame)

    // Cleanup
    return () => {
      console.log("🛑 Stopping animation loop")
      isRunning = false
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isMounted]) // Depend on isMounted

  // Start eye tracking calibration
  const startEyeCalibration = useCallback(() => {
    setIsCalibrating(true)
    setCalibrationStep(0)
    setCalibrationPoints([])
  }, [])

  // Handle calibration point
  const handleCalibrationPoint = useCallback(() => {
    if (!faceDetected || calibrationStep >= calibrationTargets.length || typeof window === "undefined") return

    // Validate that we have good eye data
    if (!eyeData.gazeX || !eyeData.gazeY || (!eyeData.left.detected && !eyeData.right.detected)) {
      console.log("⚠️ Poor eye detection quality, please look directly at the target")
      return
    }

    const target = calibrationTargets[calibrationStep]
    const screenPoint = {
      x: target.x * window.innerWidth,
      y: target.y * window.innerHeight,
    }

    const eyePoint = {
      x: eyeData.gazeX,
      y: eyeData.gazeY,
    }

    console.log(`📍 Calibration point ${calibrationStep + 1}:`, { screenPoint, eyePoint })

    setCalibrationPoints((prev) => [...prev, { screen: screenPoint, eye: eyePoint }])
    setCalibrationStep((prev) => prev + 1)

    if (calibrationStep + 1 >= calibrationTargets.length) {
      setIsCalibrating(false)
      setEyeTrackingEnabled(true)
      console.log("✅ Eye calibration completed with", calibrationStep + 1, "points")
    }
  }, [faceDetected, calibrationStep, calibrationTargets, eyeData])

  // Calibrate head center position
  const calibrateHead = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    console.log("🎯 Calibrating head position...")
    const detectionResult = detectFaceAndEyes(canvasRef.current, videoRef.current)
    if (detectionResult) {
      // Fix center point for mirrored camera
      const newCenterPoint = {
        x: canvasRef.current.width - detectionResult.face.x, // Invert X
        y: detectionResult.face.y,
      }
      setCenterPoint(newCenterPoint)
      setIsCalibrated(true)

      if (typeof window !== "undefined") {
        const initialPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        updateCursorPosition(initialPosition.x, initialPosition.y)
      }
      console.log("✅ Head calibrated successfully", newCenterPoint)
    } else {
      console.log("❌ No face detected for calibration")
    }
  }, [])

  // Game functions
  const startGame = useCallback(() => {
    console.log("🎮 Starting game...")
    setGameState("playing")
    setScore(0)
    setDinoY(GROUND_Y)
    setDinoState("running")
    setObstacles([])
    setGameSpeed(5)
    setIsJumping(false)
    setJumpVelocity(0)
  }, [])

  const endGame = useCallback(() => {
    console.log("💀 Game over!")
    setGameState("gameOver")
    if (score > highScore) {
      setHighScore(score)
    }
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
    }
  }, [score, highScore])

  const resetGame = useCallback(() => {
    console.log("🔄 Resetting game...")
    setGameState("menu")
    setScore(0)
    setDinoY(GROUND_Y)
    setDinoState("running")
    setObstacles([])
    setGameSpeed(5)
    setIsJumping(false)
    setJumpVelocity(0)
  }, [])

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return

    // Update dino physics
    if (isJumping) {
      setDinoY((prev) => {
        const newY = prev + jumpVelocity
        if (newY >= GROUND_Y) {
          setIsJumping(false)
          setJumpVelocity(0)
          setDinoState("running")
          return GROUND_Y
        }
        return newY
      })
      setJumpVelocity((prev) => prev + 0.8) // gravity
    }

    // Update obstacles
    setObstacles((prev) => {
      const newObstacles = prev
        .map((obstacle) => ({
          ...obstacle,
          x: obstacle.x - gameSpeed,
        }))
        .filter((obstacle) => obstacle.x > -OBSTACLE_WIDTH)

      // Add new obstacles
      if (newObstacles.length === 0 || newObstacles[newObstacles.length - 1].x < 600) {
        if (Math.random() < 0.02) {
          newObstacles.push({
            x: 800,
            type: Math.random() < 0.7 ? "cactus" : "bird",
          })
        }
      }
      return newObstacles
    })

    // Check collisions
    obstacles.forEach((obstacle) => {
      const dinoLeft = 100
      const dinoRight = dinoLeft + DINO_WIDTH
      const dinoTop = dinoY
      const dinoBottom = dinoY + DINO_HEIGHT

      const obstacleLeft = obstacle.x
      const obstacleRight = obstacle.x + OBSTACLE_WIDTH
      const obstacleTop = obstacle.type === "bird" ? GROUND_Y - 60 : GROUND_Y
      const obstacleBottom = obstacleTop + OBSTACLE_HEIGHT

      if (
        dinoRight > obstacleLeft &&
        dinoLeft < obstacleRight &&
        dinoBottom > obstacleTop &&
        dinoTop < obstacleBottom
      ) {
        if (!(dinoState === "crouching" && obstacle.type === "bird")) {
          endGame()
          return
        }
      }
    })

    // Update score
    setScore((prev) => prev + 1)

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, isJumping, jumpVelocity, gameSpeed, obstacles, dinoY, dinoState, endGame])

  // Start game loop when playing
  useEffect(() => {
    if (gameState === "playing") {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, gameLoop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Don't render until mounted to avoid hydration issues
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading Eye Tracking System...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Custom Cursor - using ref for direct DOM manipulation */}
      {isTracking && isCalibrated && (
        <div
          ref={cursorRef}
          className="fixed pointer-events-none z-50 transition-all duration-75"
          style={{
            left: `${typeof window !== "undefined" ? window.innerWidth / 2 - 12 : 0}px`,
            top: `${typeof window !== "undefined" ? window.innerHeight / 2 - 12 : 0}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 ${
              faceDetected
                ? eyeTrackingEnabled && calibrationPoints.length >= 3
                  ? "bg-purple-400 border-purple-600"
                  : "bg-green-400 border-green-600"
                : "bg-red-400 border-red-600"
            } shadow-lg`}
          >
            <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        </div>
      )}

      {/* Enhanced calibration overlay */}
      {isCalibrating && typeof window !== "undefined" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg text-center">
            <h3 className="text-xl font-bold mb-4">Eye Tracking Calibration</h3>
            <p className="mb-4">Look directly at the red target and keep your head still</p>
            <p className="text-sm text-gray-600 mb-4">
              Step {calibrationStep + 1} of {calibrationTargets.length}
            </p>

            {/* Eye detection quality indicator */}
            <div
              className="mb-4 p-2 rounded"
              style={{
                backgroundColor:
                  (eyeData.left.detected || eyeData.right.detected) && eyeData.gazeX && eyeData.gazeY
                    ? "#dcfce7"
                    : "#fef2f2",
              }}
            >
              <p className="text-sm">
                {(eyeData.left.detected || eyeData.right.detected) && eyeData.gazeX && eyeData.gazeY
                  ? "✅ Good eye detection"
                  : "⚠️ Please look directly at the target"}
              </p>
            </div>

            <Button onClick={handleCalibrationPoint} disabled={!faceDetected || !eyeData.gazeX || !eyeData.gazeY}>
              Calibrate Point
            </Button>
          </div>
          {/* Calibration target with pulsing animation */}
          <div
            className="fixed w-6 h-6 bg-red-500 rounded-full border-4 border-white shadow-lg animate-pulse"
            style={{
              left: calibrationTargets[calibrationStep]?.x * window.innerWidth - 12,
              top: calibrationTargets[calibrationStep]?.y * window.innerHeight - 12,
            }}
          />
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-6 h-6" />
              Advanced Eye & Head Tracking Cursor
            </CardTitle>
            <CardDescription>
              Enhanced precision cursor control using both head movement and eye tracking. Purple cursor indicates eye
              tracking is active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <Button
                onClick={isTracking ? stopCamera : startCamera}
                variant={isTracking ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {isTracking ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                {isTracking ? "Stop Tracking" : "Start Tracking"}
              </Button>

              {isTracking && (
                <>
                  <Button
                    onClick={calibrateHead}
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                    disabled={!faceDetected}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Calibrate Head
                  </Button>

                  <Button
                    onClick={startEyeCalibration}
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                    disabled={!faceDetected || isCalibrating}
                  >
                    <Target className="w-4 h-4" />
                    Calibrate Eyes
                  </Button>

                  <Button
                    onClick={() => {
                      setCalibrationPoints([])
                      setEyeTrackingEnabled(false)
                      console.log("🔄 Eye calibration reset")
                    }}
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                    disabled={!isTracking}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Eye Calibration
                  </Button>
                </>
              )}

              <div className="flex items-center gap-2">
                <Badge variant={faceDetected ? "default" : "secondary"}>
                  {faceDetected ? "Face Detected" : "No Face"}
                </Badge>
                <Badge variant={isCalibrated ? "default" : "outline"}>
                  {isCalibrated ? "Head Calibrated" : "Head Not Calibrated"}
                </Badge>
                <Badge variant={eyeTrackingEnabled && calibrationPoints.length >= 3 ? "default" : "outline"}>
                  {eyeTrackingEnabled && calibrationPoints.length >= 3
                    ? "Eye Tracking Active"
                    : "Eye Tracking Inactive"}
                </Badge>
              </div>
            </div>

            {isTracking && (
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Head Sensitivity: {sensitivity}x</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Eye Sensitivity: {eyeSensitivity}x</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={eyeSensitivity}
                    onChange={(e) => setEyeSensitivity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Eye tracking status */}
            {isTracking && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div
                    className={`w-3 h-3 rounded-full mx-auto mb-1 ${eyeData.left.detected ? "bg-blue-500" : "bg-gray-300"}`}
                  ></div>
                  <span>Left Eye</span>
                </div>
                <div className="text-center">
                  <div
                    className={`w-3 h-3 rounded-full mx-auto mb-1 ${eyeData.right.detected ? "bg-green-500" : "bg-gray-300"}`}
                  ></div>
                  <span>Right Eye</span>
                </div>
                <div className="text-center">
                  <div
                    className={`w-3 h-3 rounded-full mx-auto mb-1 ${eyeData.gazeX && eyeData.gazeY ? "bg-purple-500" : "bg-gray-300"}`}
                  ></div>
                  <span>Gaze Detected</span>
                </div>
                <div className="text-center">
                  <div
                    className={`w-3 h-3 rounded-full mx-auto mb-1 ${calibrationPoints.length >= 3 ? "bg-orange-500" : "bg-gray-300"}`}
                  ></div>
                  <span>Calibrated ({calibrationPoints.length}/5)</span>
                </div>
              </div>
            )}

            {/* Debug Info with Real-time Data */}
            <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Cursor Position:</strong> ({trackingDataRef.current.cursorPosition.x.toFixed(0)},{" "}
                  {trackingDataRef.current.cursorPosition.y.toFixed(0)})
                </div>
                <div>
                  <strong>Cursor Velocity:</strong> ({trackingDataRef.current.cursorVelocity.x.toFixed(1)},{" "}
                  {trackingDataRef.current.cursorVelocity.y.toFixed(1)})
                </div>
                <div>
                  <strong>Game State:</strong> {gameState}
                </div>
                <div>
                  <strong>Frame Count:</strong> {trackingDataRef.current.frameCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Camera Feed & Debug
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg bg-gray-900"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas
                  ref={debugCanvasRef}
                  width={640}
                  height={480}
                  className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas ref={canvasRef} width={640} height={480} className="hidden" />
                {!isTracking && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg">
                    <div className="text-center text-white">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Camera not active</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Setup Process:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Click "Start Tracking" to enable camera</li>
                  <li>Click "Calibrate Head" while looking straight</li>
                  <li>Click "Calibrate Eyes" and follow the targets</li>
                  <li>Look at each red dot and click "Calibrate Point"</li>
                  <li>Use combined head + eye movement for control</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Debug Indicators:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    <span className="text-red-500">●</span> Red dot: Face center
                  </li>
                  <li>
                    <span className="text-blue-500">●</span> Blue dot: Left eye
                  </li>
                  <li>
                    <span className="text-green-500">●</span> Green dot: Right eye
                  </li>
                  <li>
                    <span className="text-purple-500">●</span> Purple dot: Gaze point
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Cursor Colors:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    <span className="text-red-500">●</span> Red: No face detected
                  </li>
                  <li>
                    <span className="text-green-500">●</span> Green: Head tracking only
                  </li>
                  <li>
                    <span className="text-purple-500">●</span> Purple: Eye tracking active
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-orange-600">Important Note:</h4>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-800">
                    <strong>Virtual Cursor:</strong> The colored dot that moves with your head/eyes is a virtual cursor
                    created by this app. Your system's mouse cursor (arrow) remains controlled by your physical
                    mouse/trackpad due to browser security restrictions.
                  </p>
                </div>
              </div>

              {calibrationPoints.length >= 3 && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800">
                    ✨ Eye tracking calibrated! Use subtle eye movements for precise control.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dino Game */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🦕 Eye-Controlled Dino Game</span>
              <div className="flex items-center gap-4 text-sm">
                <span>Score: {score}</span>
                <span>High Score: {highScore}</span>
                <span>Speed: {gameSpeed.toFixed(1)}x</span>
              </div>
            </CardTitle>
            <CardDescription>
              Move cursor UP to jump, DOWN to crouch, LEFT to slow down. Check console for debug logs!
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Game Controls */}
            <div className="flex gap-2 mb-4">
              {gameState === "menu" && (
                <Button onClick={startGame} disabled={!isCalibrated}>
                  {isCalibrated ? "Start Game" : "Calibrate Head First"}
                </Button>
              )}
              {gameState === "playing" && (
                <Button onClick={resetGame} variant="outline">
                  Reset Game
                </Button>
              )}
              {gameState === "gameOver" && (
                <>
                  <Button onClick={startGame}>Play Again</Button>
                  <Button onClick={resetGame} variant="outline">
                    Back to Menu
                  </Button>
                </>
              )}
            </div>

            {/* Game Area */}
            <div className="h-80 bg-gradient-to-b from-sky-200 to-yellow-100 rounded-lg relative overflow-hidden border-2 border-gray-300">
              {/* Ground */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-yellow-200 border-t-2 border-yellow-600"></div>

              {/* Game Over Overlay */}
              {gameState === "gameOver" && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                  <div className="bg-white p-6 rounded-lg text-center">
                    <h3 className="text-2xl font-bold mb-2">Game Over!</h3>
                    <p className="text-lg mb-2">Score: {score}</p>
                    {score === highScore && score > 0 && (
                      <p className="text-sm text-green-600 mb-4">🎉 New High Score!</p>
                    )}
                  </div>
                </div>
              )}

              {/* Menu Overlay */}
              {gameState === "menu" && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-10">
                  <div className="bg-white p-6 rounded-lg text-center">
                    <h3 className="text-2xl font-bold mb-4">🦕 Dino Game</h3>
                    <div className="text-sm text-gray-600 mb-4 space-y-1">
                      <p>👆 Move cursor UP to jump</p>
                      <p>👇 Move cursor DOWN to crouch</p>
                      <p>👈 Move cursor LEFT to slow down</p>
                    </div>
                    {!isCalibrated && <p className="text-orange-600 text-sm">Please calibrate head tracking first!</p>}
                  </div>
                </div>
              )}

              {/* Dino */}
              {gameState !== "menu" && (
                <div
                  className={`absolute transition-all duration-100 ${
                    dinoState === "crouching" ? "w-12 h-6" : "w-10 h-10"
                  } ${
                    dinoState === "jumping"
                      ? "bg-green-500"
                      : dinoState === "crouching"
                        ? "bg-orange-500"
                        : "bg-green-600"
                  } rounded-lg border-2 border-gray-800 flex items-center justify-center text-white font-bold`}
                  style={{
                    left: "100px",
                    bottom: `${320 - dinoY - (dinoState === "crouching" ? 24 : 40)}px`,
                  }}
                >
                  🦕
                </div>
              )}

              {/* Obstacles */}
              {obstacles.map((obstacle, index) => (
                <div
                  key={index}
                  className={`absolute ${
                    obstacle.type === "cactus" ? "bg-green-800" : "bg-gray-600"
                  } rounded border-2 border-gray-900 flex items-center justify-center text-white`}
                  style={{
                    left: `${obstacle.x}px`,
                    bottom: obstacle.type === "bird" ? "140px" : "80px",
                    width: `${OBSTACLE_WIDTH}px`,
                    height: `${OBSTACLE_HEIGHT}px`,
                  }}
                >
                  {obstacle.type === "cactus" ? "🌵" : "🦅"}
                </div>
              ))}

              {/* Real-time cursor velocity display */}
              {isTracking && gameState === "playing" && (
                <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded text-xs font-mono">
                  <div className="font-bold mb-2">Live Cursor Data:</div>
                  <div>X: {trackingDataRef.current.cursorPosition.x.toFixed(0)}</div>
                  <div>Y: {trackingDataRef.current.cursorPosition.y.toFixed(0)}</div>
                  <div
                    className={`${trackingDataRef.current.cursorVelocity.y < -10 ? "text-green-600 font-bold" : ""}`}
                  >
                    ↑ Vel: {trackingDataRef.current.cursorVelocity.y.toFixed(1)}{" "}
                    {trackingDataRef.current.cursorVelocity.y < -10 ? "(JUMP!)" : ""}
                  </div>
                  <div
                    className={`${trackingDataRef.current.cursorVelocity.y > 10 ? "text-orange-600 font-bold" : ""}`}
                  >
                    ↓ Vel: {trackingDataRef.current.cursorVelocity.y.toFixed(1)}{" "}
                    {trackingDataRef.current.cursorVelocity.y > 10 ? "(CROUCH!)" : ""}
                  </div>
                  <div className={`${trackingDataRef.current.cursorVelocity.x < -10 ? "text-blue-600 font-bold" : ""}`}>
                    ← Vel: {trackingDataRef.current.cursorVelocity.x.toFixed(1)}{" "}
                    {trackingDataRef.current.cursorVelocity.x < -10 ? "(SLOW!)" : ""}
                  </div>
                  <div className="mt-2 text-gray-600">Frames: {trackingDataRef.current.frameCount}</div>
                </div>
              )}

              {/* Game instructions */}
              {gameState === "playing" && (
                <div className="absolute top-4 left-4 bg-white bg-opacity-80 p-2 rounded text-xs">
                  <div className="font-bold mb-1">Controls:</div>
                  <div className="text-green-600">👆 UP = Jump</div>
                  <div className="text-orange-600">👇 DOWN = Crouch</div>
                  <div className="text-blue-600">👈 LEFT = Slow</div>
                  <div className="mt-2 text-gray-600 text-xs">Check browser console for debug logs</div>
                </div>
              )}

              {/* Speed indicator */}
              {gameState === "playing" && (
                <div className="absolute bottom-4 right-4 bg-white bg-opacity-80 p-2 rounded text-xs">
                  <div>Speed: {gameSpeed.toFixed(1)}x</div>
                  <div className="w-20 h-2 bg-gray-200 rounded mt-1">
                    <div
                      className="h-full bg-blue-500 rounded transition-all duration-200"
                      style={{ width: `${(gameSpeed / 8) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Game Stats */}
            {gameState !== "menu" && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{score}</div>
                  <div className="text-gray-600">Current Score</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{highScore}</div>
                  <div className="text-gray-600">High Score</div>
                </div>
                <div className="text-center">
                  <div
                    className={`font-bold text-lg ${
                      dinoState === "jumping"
                        ? "text-green-600"
                        : dinoState === "crouching"
                          ? "text-orange-600"
                          : "text-gray-800"
                    }`}
                  >
                    {dinoState.toUpperCase()}
                  </div>
                  <div className="text-gray-600">Dino State</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{obstacles.length}</div>
                  <div className="text-gray-600">Obstacles</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
