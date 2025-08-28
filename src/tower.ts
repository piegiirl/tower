import { gsap } from "gsap";
import * as THREE from "three"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getStackColor } from "./utils/color";
const SLAB_HEIGHT = 5;
const SLAB_WIDTH = 5 * SLAB_HEIGHT;
const SLAB_DEPTH = 5 * SLAB_HEIGHT;
let SLAB_INDEX = 1;
export class Tower {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private currentSlab: THREE.Mesh;
    public init() {
        // Canvas
        const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

        // Scene
        this.scene = new THREE.Scene()

        // Green Box
        const geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH)
        const material = new THREE.MeshStandardMaterial({
            color: getStackColor('love',SLAB_INDEX),
            roughness: 0.7,
            metalness: 0.3
        })
        const slab = new THREE.Mesh(geometry, material as unknown as THREE.MeshBasicMaterial)
        this.scene.add(slab)

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        this.scene.add(ambientLight)

        const mainLight = new THREE.DirectionalLight(0xffffff, 1)
        this.scene.add(mainLight)

        // Sizes
        const sizes = {
            width: window.innerWidth,
            height: window.innerHeight
        }

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 1000)
        this.camera.position.set(50, 20, 20)
        this.scene.add(this.camera)

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
        const controls = new OrbitControls(this.camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        // Clock for consistent animations
        const clock = new THREE.Clock()

        // Animate
        function animate() {
            const elapsedTime = clock.getElapsedTime()

            // Update controls
            controls.update()

            renderer.render(this.scene, this.camera)
            requestAnimationFrame(animate.bind(this))
        }

        // Handle Resize
        window.addEventListener("resize", () => {
            // Update sizes
            sizes.width = window.innerWidth
            sizes.height = window.innerHeight

            // Update camera
            this.camera.aspect = sizes.width / sizes.height
            this.camera.updateProjectionMatrix()

            // Update renderer
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            renderer.setSize(sizes.width, sizes.height)
        })

        animate.bind(this)()

    }
    addSlab(){
        SLAB_INDEX++;
        const geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH)
        const material = new THREE.MeshStandardMaterial({
            color: getStackColor('love',SLAB_INDEX),
            roughness: 0.7,
            metalness: 0.3
        })
        const slab = new THREE.Mesh(geometry, material as unknown as THREE.MeshBasicMaterial)
        this.scene.add(slab)
        this.currentSlab = slab;
        slab.translateY(SLAB_INDEX * SLAB_HEIGHT - SLAB_HEIGHT);
        gsap.from(slab.position,{x:-50})
        gsap.to(slab.position, {
            duration: 3,
            x: 50, 
            repeat: -1,
            yoyo: true
        })
    }
    stopSlab(){
        gsap.killTweensOf(this.currentSlab.position)
    }
    constructor() {
    }
}