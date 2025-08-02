# Eye-Controlled Dino Game 🦕👁️

*Team Querty - TinkerHub Useless Projects*

[![TinkerHub](https://img.shields.io/badge/TinkerHub-24?color=%23000000&style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)](https://www.tinkerhub.org/)
[![Useless Projects](https://img.shields.io/badge/UselessProjects--25-25?style=for-the-badge&color=%23FF6B6B)](https://www.tinkerhub.org/events/Q2Q1TQKX6Q/Useless%20Projects)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev)

## Team Details

**Team Name:** Querty  
**Team Lead:** Jacob Jiji - Adi Shankara Engineering College

## Overview

An advanced eye and head tracking system that lets you control a Chrome Dino game using only your eye movements and head gestures, because using your hands is apparently too mainstream.

### The Problem (that doesn't exist)
People were getting way too much exercise using their fingers to press spacebar while playing the Chrome Dino game. Also, keyboards were feeling neglected and underutilized during gaming sessions.

### The Solution (that nobody asked for)
We created a sophisticated computer vision system that tracks your face and eye movements in real-time, allowing you to jump, crouch, and slow down the dino using only your gaze and head movements. Now you can play games while looking like you're having an intense staring contest with your screen!

## Screenshots

![Main Interface](https://hebbkx1anhila5yf.public.blob.vercel-storage.com/head%20calibration-0z8d7VW9fd7CMUqygoUN7IfgjbLKJC.png)
*Main interface showing camera feed, eye tracking indicators, calibration controls, sensitivity sliders, and real-time debug information*

![Eye Calibration Process](https://hebbkx1anhila5yf.public.blob.vercel-storage.com/eye%20calibration-SCsFNox6TxuYUaXIXueJuq5ijsIy0V.png)
*Eye calibration screen with 5-point calibration system and real-time eye detection quality feedback*

![Dino Game in Action](https://hebbkx1anhila5yf.public.blob.vercel-storage.com/dino%20game%20-Rk6od517j8l60TXeOoQnOYDIOWewNz.png)
*Eye-controlled dino game with real-time cursor velocity tracking and live performance metrics*

## Tech Stack

- **Frontend:** Next.js 15, React 18, TypeScript
- **Styling:** Tailwind CSS, Shadcn/ui components
- **Computer Vision:** Custom algorithms using HTML5 Canvas API
- **Hardware:** WebRTC camera access, real-time video processing

## Key Features

- 🎯 **Dual Tracking System**: Head movement + eye tracking for precise control
- 📐 **5-Point Calibration**: Advanced calibration with quality validation
- ⚡ **Real-time Processing**: 60fps tracking with minimal latency
- 🎮 **Velocity-based Controls**: Natural gameplay using cursor movement patterns
- 🔧 **Debug Visualization**: Live tracking data and performance metrics

## Installation & Setup

```bash
# Clone the repository
git clone [your-repo-url]
cd eye-controlled-dino-game

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser and navigate to
# http://localhost:3000
