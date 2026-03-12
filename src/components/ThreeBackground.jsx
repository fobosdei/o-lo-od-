import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Three.js animated background:
 * - Particle field with network connections
 * - Floating geometric shapes (icosahedra = encrypted data metaphor)
 * - Pulsing hexagonal grid
 * - Color shifts based on vault lock state
 */
export default function ThreeBackground({ isLocked = true }) {
  const mountRef = useRef(null)
  const stateRef = useRef({ isLocked })

  useEffect(() => {
    stateRef.current.isLocked = isLocked
  }, [isLocked])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ─── Scene Setup ────────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000)
    camera.position.z = 60

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // ─── Particles ──────────────────────────────────────────────
    const PARTICLE_COUNT = 180
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = []
    const particleData = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      positions[i3]     = (Math.random() - 0.5) * 150
      positions[i3 + 1] = (Math.random() - 0.5) * 100
      positions[i3 + 2] = (Math.random() - 0.5) * 80

      velocities.push({
        x: (Math.random() - 0.5) * 0.04,
        y: (Math.random() - 0.5) * 0.04,
        z: (Math.random() - 0.5) * 0.02,
      })
      particleData.push({ numConnections: 0 })
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ff88,
      size: 0.6,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    })

    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    // ─── Connection Lines ────────────────────────────────────────
    const MAX_CONNECTIONS = 200
    const linePositions = new Float32Array(MAX_CONNECTIONS * 6)
    const lineColors = new Float32Array(MAX_CONNECTIONS * 6)

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))

    const lineMaterial = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
      })
    )
    scene.add(lineMaterial)

    // ─── Floating Geometric Shapes ───────────────────────────────
    const shapes = []
    const SHAPE_COUNT = 8

    for (let i = 0; i < SHAPE_COUNT; i++) {
      const geo = new THREE.IcosahedronGeometry(Math.random() * 2 + 1, 0)
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00ff88 : 0x7c3aed,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40 - 20,
      )
      mesh.userData = {
        rotSpeed: { x: (Math.random() - 0.5) * 0.008, y: (Math.random() - 0.5) * 0.008 },
        floatSpeed: Math.random() * 0.003 + 0.001,
        floatOffset: Math.random() * Math.PI * 2,
        baseY: mesh.position.y,
      }
      scene.add(mesh)
      shapes.push(mesh)
    }

    // ─── Ring / Grid ─────────────────────────────────────────────
    const ringGeo = new THREE.RingGeometry(20, 20.3, 64)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.z = -30
    scene.add(ring)

    // ─── Mouse Interaction ───────────────────────────────────────
    const mouse = { x: 0, y: 0 }
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 0.3
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 0.2
    }
    window.addEventListener('mousemove', onMouseMove)

    // ─── Resize Handler ──────────────────────────────────────────
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // ─── Animation Loop ──────────────────────────────────────────
    let frameId
    let time = 0

    const CONNECTION_DISTANCE = 25
    const lockedColor = new THREE.Color(0x4444aa)
    const unlockedColor = new THREE.Color(0x00ff88)

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      time += 0.01

      const locked = stateRef.current.isLocked
      const targetColor = locked ? lockedColor : unlockedColor

      // Lerp particle color
      particleMaterial.color.lerp(targetColor, 0.02)

      // Smooth camera to mouse
      camera.position.x += (mouse.x * 8 - camera.position.x) * 0.03
      camera.position.y += (-mouse.y * 5 - camera.position.y) * 0.03
      camera.lookAt(scene.position)

      // Update particles
      const pos = particleGeometry.attributes.position.array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3
        pos[i3]     += velocities[i].x
        pos[i3 + 1] += velocities[i].y
        pos[i3 + 2] += velocities[i].z

        // Boundary wrap
        if (Math.abs(pos[i3]) > 75) velocities[i].x *= -1
        if (Math.abs(pos[i3 + 1]) > 50) velocities[i].y *= -1
        if (Math.abs(pos[i3 + 2]) > 40) velocities[i].z *= -1

        particleData[i].numConnections = 0
      }
      particleGeometry.attributes.position.needsUpdate = true

      // Draw connections
      let lineIdx = 0
      const lPos = lineGeometry.attributes.position.array
      const lCol = lineGeometry.attributes.color.array

      for (let i = 0; i < PARTICLE_COUNT && lineIdx < MAX_CONNECTIONS; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT && lineIdx < MAX_CONNECTIONS; j++) {
          const dx = pos[i * 3] - pos[j * 3]
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < CONNECTION_DISTANCE) {
            const alpha = 1 - dist / CONNECTION_DISTANCE
            const base6 = lineIdx * 6
            lPos[base6]     = pos[i * 3]; lPos[base6 + 1] = pos[i * 3 + 1]; lPos[base6 + 2] = pos[i * 3 + 2]
            lPos[base6 + 3] = pos[j * 3]; lPos[base6 + 4] = pos[j * 3 + 1]; lPos[base6 + 5] = pos[j * 3 + 2]

            const c = locked ? [0.2 * alpha, 0.2 * alpha, 0.6 * alpha] : [0, alpha, 0.5 * alpha]
            lCol[base6]     = c[0]; lCol[base6 + 1] = c[1]; lCol[base6 + 2] = c[2]
            lCol[base6 + 3] = c[0]; lCol[base6 + 4] = c[1]; lCol[base6 + 5] = c[2]
            lineIdx++
          }
        }
      }

      lineGeometry.setDrawRange(0, lineIdx * 2)
      lineGeometry.attributes.position.needsUpdate = true
      lineGeometry.attributes.color.needsUpdate = true

      // Animate shapes
      shapes.forEach((shape) => {
        const d = shape.userData
        shape.rotation.x += d.rotSpeed.x
        shape.rotation.y += d.rotSpeed.y
        shape.position.y = d.baseY + Math.sin(time * d.floatSpeed * 100 + d.floatOffset) * 3
      })

      // Ring pulse
      ring.rotation.z += 0.001
      const ringOpacity = locked ? 0.03 : 0.07 + Math.sin(time * 2) * 0.03
      ringMat.opacity = ringOpacity

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
      particleGeometry.dispose()
      lineGeometry.dispose()
      particleMaterial.dispose()
      shapes.forEach(s => { s.geometry.dispose(); s.material.dispose() })
    }
  }, [])

  return (
    <div
      ref={mountRef}
      id="three-bg"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
