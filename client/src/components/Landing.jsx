import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Twitter, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../styles/Landing.css'

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <GalaxyBackground />
      <div className="relative z-10 w-full h-full">
        <header className="flex justify-between items-center p-6">
          <Logo />
          <SocialIcons />
        </header>
        <CentralContent onEmbark={() => navigate('/universe')} />
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div className="text-3xl font-bold text-white">
      <span className="text-blue-200">Gal</span>
      <span className="text-indigo-200">ac</span>
      <span className="text-purple-200">tic</span>
    </div>
  )
}

function SocialIcons() {
  return (
    <div className="flex gap-16 justify-end items-center p-2"> 
      {/* Increased gap to 16 for more spacing */}
      <a href="#" className="hover:opacity-80 transition-opacity">
        <img 
          src="https://galactic-production.up.railway.app/textures/TweetX.png" 
          alt="Twitter Icon" 
          style={{ width: '35px', height: '20px' }} // Set to 35px for a smaller size
        />
      </a>
      <a href="#" className="hover:opacity-80 transition-opacity">
        <img 
          src="https://galactic-production.up.railway.app/textures/ndex.png" 
          alt="Dex Icon" 
          style={{ width: '60px', height: '45px' }} // Set to 60px for a smaller size
        />
      </a>
      <a href="#" className="hover:opacity-80 transition-opacity">
        <img 
          src="https://galactic-production.up.railway.app/textures/notess-removebg-preview.png" 
          alt="Notes Icon" 
          style={{ 
            width: '20px', // Set to 35px for a smaller size
            height: '20px', 
            filter: 'brightness(0) invert(1)' 
          }} 
        />
      </a>
    </div>
  );
}

function CentralContent({ onEmbark }) {
  const [isHovered, setIsHovered] = useState(false)
  
   return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
      <motion.h1
        className="text-6xl font-bold mb-4 text-blue-100"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Voyage Through the Cosmos
      </motion.h1>
      <motion.p
        className="text-xl mb-8 text-indigo-200"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Your Portal to the Celestial Realm
      </motion.p>
      <a onClick={onEmbark} className="embark-button">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        Embark
      </a>
    </div>
  )
}

function GalaxyBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Increased speed range for stars
    const stars = Array.from({ length: 300 }, () => {
      const r = 180 + Math.random() * 75;
      const g = 180 + Math.random() * 75;
      const b = 255;
      const a = Math.random();
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        color: `rgba(${r}, ${g}, ${b}, ${a})`,
        speed: Math.random() * 0.8 + 0.3, // Increased base speed and range
        xSpeed: (Math.random() - 0.5) * 0.3 // Added horizontal movement
      }
    })

    // Make nebulas move slowly
    const nebulas = Array.from({ length: 7 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 150 + 100,
      speed: Math.random() * 0.2 + 0.1, // Added movement speed
      color: [
        'rgba(63, 81, 181, 0.1)',
        'rgba(103, 58, 183, 0.1)',
        'rgba(33, 150, 243, 0.1)',
        'rgba(156, 39, 176, 0.1)'
      ][Math.floor(Math.random() * 4)]
    }))

    function drawNebula(nebula) {
      const gradient = ctx.createRadialGradient(
        nebula.x, nebula.y, 0,
        nebula.x, nebula.y, nebula.radius
      )
      gradient.addColorStop(0, nebula.color)
      gradient.addColorStop(1, 'transparent')
      
      ctx.beginPath()
      ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    function drawCosmicDust() {
      for (let i = 0; i < 1000; i++) {
        const r = 180 + Math.random() * 75;
        const g = 180 + Math.random() * 75;
        const b = 255;
        const a = Math.random() * 0.2;
        
        ctx.beginPath()
        ctx.arc(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          Math.random() * 0.5,
          0,
          Math.PI * 2
        )
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
        ctx.fill()
      }
    }

    function animate() {
      ctx.fillStyle = 'rgb(10, 15, 30)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw nebulas
      nebulas.forEach(nebula => {
        nebula.y += nebula.speed
        if (nebula.y > canvas.height + nebula.radius) {
          nebula.y = -nebula.radius
          nebula.x = Math.random() * canvas.width
        }
        drawNebula(nebula)
      })

      drawCosmicDust()

      // Update and draw stars
      stars.forEach(star => {
        star.y += star.speed
        star.x += star.xSpeed

        // Reset position when star goes off screen
        if (star.y > canvas.height) {
          star.y = 0
          star.x = Math.random() * canvas.width
        }
        if (star.x > canvas.width) star.x = 0
        if (star.x < 0) star.x = canvas.width
        
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = star.color
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{ zIndex: 1 }}
    />
  )
}

