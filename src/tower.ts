import { gsap } from "gsap";
import * as THREE from "three"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getStackColor } from "./utils/color";
const SLAB_HEIGHT = 5;
let SLAB_WIDTH = 5 * SLAB_HEIGHT;
let SLAB_DEPTH = 5 * SLAB_HEIGHT;
let SLAB_INDEX = 1;
let TOP_X = 0;
let TOP_Z = 0;
let axis: 'x' | 'z' = 'z';

export class Tower {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private currentSlab: THREE.Mesh;
    public init() {
        // Canvas
        const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

        // Scene
        this.scene = new THREE.Scene()

        //Box
        const geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH)
        const material = new THREE.MeshStandardMaterial({
            color: getStackColor('love', SLAB_INDEX),
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
        this.camera.position.set(50, 70, 50)
        this.scene.add(this.camera)
        this.camera.lookAt(0, 0, 0)

        // Axis Helper

        const axesHelper = new THREE.AxesHelper(50);
        this.scene.add(axesHelper);

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

        // // Controls
        // const controls = new OrbitControls(this.camera, renderer.domElement)
        // controls.enableDamping = true
        // controls.dampingFactor = 0.05

        // Clock for consistent animations
        const clock = new THREE.Clock()

        // Animate
        function animate() {
            const elapsedTime = clock.getElapsedTime()

            // Update controls
            //controls.update()

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
    cutCurrentSlab() {
        if (axis === "x"){
        let leftSlabX = Math.max(-SLAB_WIDTH / 2 + TOP_X, -SLAB_WIDTH / 2 + this.currentSlab.position.x);
        let rightSlabX = Math.min(SLAB_WIDTH / 2 + TOP_X, SLAB_WIDTH / 2 + this.currentSlab.position.x);
        let middleSlabX = (rightSlabX + leftSlabX) / 2
        let newWidth = rightSlabX - leftSlabX;
        this.currentSlab.geometry = new THREE.BoxGeometry(newWidth, SLAB_HEIGHT, SLAB_DEPTH)
        this.currentSlab.position.x = middleSlabX;
        TOP_X = middleSlabX;
        SLAB_WIDTH = newWidth;
    }else{
        let leftSlabZ = Math.max(-SLAB_DEPTH / 2 + TOP_Z, -SLAB_DEPTH / 2 + this.currentSlab.position.z);
        let rightSlabZ= Math.min(SLAB_DEPTH / 2 + TOP_Z, SLAB_DEPTH / 2 + this.currentSlab.position.z);
        let middleSlabZ = (rightSlabZ + leftSlabZ) / 2
        let newDepth = rightSlabZ - leftSlabZ;
        this.currentSlab.geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, newDepth)
        this.currentSlab.position.z = middleSlabZ;
        TOP_Z = middleSlabZ;
        SLAB_DEPTH = newDepth;
        }
    }
    addSlab() {
        if(axis==='x') axis='z'
        else axis='x';

        SLAB_INDEX++;
        const geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH)
        const material = new THREE.MeshStandardMaterial({
            color: getStackColor('love', SLAB_INDEX),
            roughness: 0.7,
            metalness: 0.3
        })
        const slab = new THREE.Mesh(geometry, material as unknown as THREE.MeshBasicMaterial)
        this.scene.add(slab)
        this.currentSlab = slab;
        slab.translateY(SLAB_INDEX * SLAB_HEIGHT - SLAB_HEIGHT);

        slab.position.x = TOP_X;
        slab.position.z = TOP_Z;
        
        if(axis==='x') gsap.from(slab.position, { x: -50})
        else gsap.from(slab.position, { z: -50});
        gsap.to(slab.position, {
            duration: 3,
            repeat: -1,
            yoyo: true,
            ... (axis === 'x' ? { x: 50 } : { z: 50 })
        })
        gsap.to(this.camera.position, {
            duration: 1,
            y: this.camera.position.y + SLAB_HEIGHT,
            ease: 'power2.out'
        })
    }
    stopSlab() {
        gsap.killTweensOf(this.currentSlab.position)
    }
    constructor() {
    }
}