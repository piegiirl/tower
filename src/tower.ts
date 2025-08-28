
import * as THREE from "three"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const SLAB_HEIGHT = 5;
const SLAB_WIDTH = 5 * SLAB_HEIGHT;
const SLAB_DEPTH = 5 * SLAB_HEIGHT;
export class Tower {

    public init() {
        // Canvas
        const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

        // Scene
        const scene = new THREE.Scene()

        // Green Box
        const geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH)
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            roughness: 0.7,
            metalness: 0.3
        })
        const greenBox = new THREE.Mesh(geometry, material as unknown as THREE.MeshBasicMaterial)
        scene.add(greenBox)

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        scene.add(ambientLight)

        const mainLight = new THREE.DirectionalLight(0xffffff, 1)
        scene.add(mainLight)

        // Sizes
        const sizes = {
            width: window.innerWidth,
            height: window.innerHeight
        }

        // Camera
        const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 1000)
        camera.position.set(50, 20, 20)
        scene.add(camera)

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        })
        renderer.setSize(sizes.width, sizes.height)
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        //renderer.outputEncoding = THREE.sRGBEncoding

        // Add shadow support
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        // Clock for consistent animations
        const clock = new THREE.Clock()

        // Animate
        function animate() {
            const elapsedTime = clock.getElapsedTime()


            // Update controls
            controls.update()

            renderer.render(scene, camera)
            requestAnimationFrame(animate)
        }

        // Handle Resize
        window.addEventListener("resize", () => {
            // Update sizes
            sizes.width = window.innerWidth
            sizes.height = window.innerHeight

            // Update camera
            camera.aspect = sizes.width / sizes.height
            camera.updateProjectionMatrix()

            // Update renderer
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            renderer.setSize(sizes.width, sizes.height)
        })


        animate()

    }
    constructor() {
    }
}