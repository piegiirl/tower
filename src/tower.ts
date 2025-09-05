import { gsap } from "gsap";
import * as THREE from "three"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getStackColor } from "./utils/color";
import { Sky } from "three/examples/jsm/Addons.js";
import * as CANNON from 'cannon-es';

const SLAB_HEIGHT = 5;
let SLAB_WIDTH = 5 * SLAB_HEIGHT;
let SLAB_DEPTH = 5 * SLAB_HEIGHT;

let TOP_X = 0;
let TOP_Z = 0;
let axis: 'x' | 'z' = 'z';
let seed = 0;
export class Tower {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    private currentSlab: THREE.Mesh;
    private world: CANNON.World;
    private bodies: {mesh: THREE.Mesh, body: CANNON.Body}[] = [];
    public SLAB_INDEX = 1;
    public init() {

        SLAB_WIDTH = 5 * SLAB_HEIGHT;
        SLAB_DEPTH = 5 * SLAB_HEIGHT;
        this.SLAB_INDEX = 1;
        TOP_X = 0;
        TOP_Z = 0;
        axis = 'z';
        seed = Math.floor(Math.random()*1000)
        // Canvas
        const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

        // Scene
        this.scene = new THREE.Scene()
        const sky = new Sky();
        sky.scale.setScalar(3000);

        const phi = THREE.MathUtils.degToRad(90);
        const theta = THREE.MathUtils.degToRad(180);
        const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
        sky.material.uniforms.turbidity.value = 0.9;
        sky.material.uniforms.rayleigh.value = 0.2;
        sky.material.uniforms.mieDirectionalG.value = 0.9;
        sky.material.uniforms.sunPosition.value = sunPosition;

        this.scene.add(sky);

        //Box
        const geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH)
        const material = new THREE.MeshStandardMaterial({
            color: getStackColor(seed, this.SLAB_INDEX),
            roughness: 0.7,
            metalness: 0.3
        })
        const slab = new THREE.Mesh(geometry, material)
        this.scene.add(slab)

        // Create physics body for base slab
        this.world = new CANNON.World();
        this.world.gravity.set(0, -100, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        // this.world.solver.iterations = 10;

        // Optional ground plane
        // const groundShape = new CANNON.Plane();
        // const groundBody = new CANNON.Body({ mass: 0 });
        // groundBody.addShape(groundShape);
        // groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        // groundBody.position.set(0, -SLAB_HEIGHT / 2 - 1, 0); // Slightly below the base
        // this.world.addBody(groundBody);

        const baseShape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
        const baseBody = new CANNON.Body({ mass: 0 });
        baseBody.addShape(baseShape);
        baseBody.position.copy(new CANNON.Vec3(slab.position.x,slab.position.y,slab.position.z));
        baseBody.quaternion.copy(new CANNON.Quaternion(slab.quaternion.x,slab.quaternion.y,slab.quaternion.z));
        this.world.addBody(baseBody);
        this.bodies.push({ mesh: slab, body: baseBody });

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
        this.scene.add(ambientLight)

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.4)
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
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        })
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setSize(sizes.width, sizes.height)
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        //this.renderer.outputEncoding = THREE.sRGBEncoding

        // Add shadow support
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

        // // Controls
        // const controls = new OrbitControls(this.camera, renderer.domElement)
        // controls.enableDamping = true
        // controls.dampingFactor = 0.05

        // Clock for consistent animations
        this.clock = new THREE.Clock()

        // Animate
        const animate = () => {
            const delta = this.clock.getDelta();
            this.world.step(1 / 60, delta, 3);

            for (const { mesh, body } of this.bodies) {
                if (body.mass > 0) {
                    mesh.position.copy(body.position);
                    mesh.quaternion.copy(body.quaternion);
                }
            }

            // Update controls
            //controls.update()

            this.renderer.render(this.scene, this.camera)
            requestAnimationFrame(animate)
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
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            this.renderer.setSize(sizes.width, sizes.height)
        })

        animate()
    }
    cutCurrentSlab(): boolean {
        let success = true;
        if (axis === "x") {
            const prevLeft = -SLAB_WIDTH / 2 + TOP_X;
            const prevRight = SLAB_WIDTH / 2 + TOP_X;
            const currLeft = -SLAB_WIDTH / 2 + this.currentSlab.position.x;
            const currRight = SLAB_WIDTH / 2 + this.currentSlab.position.x;
            const overlapLeft = Math.max(prevLeft, currLeft);
            const overlapRight = Math.min(prevRight, currRight);

            if (overlapLeft >= overlapRight) return false;

            // Create left cutoff if exists
            if (currLeft < overlapLeft) {
                const cutoffWidth = overlapLeft - currLeft;
                const cutoffGeom = new THREE.BoxGeometry(cutoffWidth, SLAB_HEIGHT, SLAB_DEPTH);
                const cutoffMat = (this.currentSlab.material as THREE.Material).clone();
                const cutoffMesh = new THREE.Mesh(cutoffGeom, cutoffMat);
                cutoffMesh.position.set(
                    (currLeft + overlapLeft) / 2,
                    this.currentSlab.position.y,
                    this.currentSlab.position.z
                );
                this.scene.add(cutoffMesh);

                // Physics for cutoff
                const cutoffShape = new CANNON.Box(new CANNON.Vec3(cutoffWidth / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
                const cutoffBody = new CANNON.Body({ mass: 10 });
                cutoffBody.addShape(cutoffShape);
                cutoffBody.position.copy(new CANNON.Vec3(cutoffMesh.position.x,cutoffMesh.position.y,cutoffMesh.position.z));
                cutoffBody.quaternion.copy(new CANNON.Quaternion(cutoffMesh.quaternion.x,cutoffMesh.quaternion.y,cutoffMesh.quaternion.z));
                this.world.addBody(cutoffBody);
                this.bodies.push({ mesh: cutoffMesh, body: cutoffBody });
            }

            // Create right cutoff if exists
            if (currRight > overlapRight) {
                const cutoffWidth = currRight - overlapRight;
                const cutoffGeom = new THREE.BoxGeometry(cutoffWidth, SLAB_HEIGHT, SLAB_DEPTH);
                const cutoffMat = (this.currentSlab.material as THREE.Material).clone();
                const cutoffMesh = new THREE.Mesh(cutoffGeom, cutoffMat);
                cutoffMesh.position.set(
                    (overlapRight + currRight) / 2,
                    this.currentSlab.position.y,
                    this.currentSlab.position.z
                );
                this.scene.add(cutoffMesh);

                // Physics for cutoff
                const cutoffShape = new CANNON.Box(new CANNON.Vec3(cutoffWidth / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
                const cutoffBody = new CANNON.Body({ mass: 10 });
                cutoffBody.addShape(cutoffShape);
                cutoffBody.position.copy(new CANNON.Vec3(cutoffMesh.position.x,cutoffMesh.position.y,cutoffMesh.position.z));
                cutoffBody.quaternion.copy(new CANNON.Quaternion(cutoffMesh.quaternion.x,cutoffMesh.quaternion.y,cutoffMesh.quaternion.z));
                this.world.addBody(cutoffBody);
                this.bodies.push({ mesh: cutoffMesh, body: cutoffBody });
            }

            // Update current slab to overlap
            const newWidth = overlapRight - overlapLeft;
            this.currentSlab.geometry = new THREE.BoxGeometry(newWidth, SLAB_HEIGHT, SLAB_DEPTH)
            this.currentSlab.position.x = (overlapLeft + overlapRight) / 2;
            TOP_X = this.currentSlab.position.x;
            SLAB_WIDTH = newWidth;
        } else {
            const prevBottom = -SLAB_DEPTH / 2 + TOP_Z;
            const prevTop = SLAB_DEPTH / 2 + TOP_Z;
            const currBottom = -SLAB_DEPTH / 2 + this.currentSlab.position.z;
            const currTop = SLAB_DEPTH / 2 + this.currentSlab.position.z;
            const overlapBottom = Math.max(prevBottom, currBottom);
            const overlapTop = Math.min(prevTop, currTop);

            if (overlapBottom >= overlapTop) return false;

            // Create bottom cutoff if exists (analogous to left)
            if (currBottom < overlapBottom) {
                const cutoffDepth = overlapBottom - currBottom;
                const cutoffGeom = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, cutoffDepth);
                const cutoffMat = (this.currentSlab.material as THREE.Material).clone();
                const cutoffMesh = new THREE.Mesh(cutoffGeom, cutoffMat);
                cutoffMesh.position.set(
                    this.currentSlab.position.x,
                    this.currentSlab.position.y,
                    (currBottom + overlapBottom) / 2
                );
                this.scene.add(cutoffMesh);

                // Physics for cutoff
                const cutoffShape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, cutoffDepth / 2));
                const cutoffBody = new CANNON.Body({ mass: 10 });
                cutoffBody.addShape(cutoffShape);
                cutoffBody.position.copy(new CANNON.Vec3(cutoffMesh.position.x,cutoffMesh.position.y,cutoffMesh.position.z));
                cutoffBody.quaternion.copy(new CANNON.Quaternion(cutoffMesh.quaternion.x,cutoffMesh.quaternion.y,cutoffMesh.quaternion.z));
                this.world.addBody(cutoffBody);
                this.bodies.push({ mesh: cutoffMesh, body: cutoffBody });
            }

            // Create top cutoff if exists (analogous to right)
            if (currTop > overlapTop) {
                const cutoffDepth = currTop - overlapTop;
                const cutoffGeom = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, cutoffDepth);
                const cutoffMat = (this.currentSlab.material as THREE.Material).clone();
                const cutoffMesh = new THREE.Mesh(cutoffGeom, cutoffMat);
                cutoffMesh.position.set(
                    this.currentSlab.position.x,
                    this.currentSlab.position.y,
                    (overlapTop + currTop) / 2
                );
                this.scene.add(cutoffMesh);

                // Physics for cutoff
                const cutoffShape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, cutoffDepth / 2));
                const cutoffBody = new CANNON.Body({ mass: 10 });
                cutoffBody.addShape(cutoffShape);
                cutoffBody.position.copy(new CANNON.Vec3(cutoffMesh.position.x,cutoffMesh.position.y,cutoffMesh.position.z));
                cutoffBody.quaternion.copy(new CANNON.Quaternion(cutoffMesh.quaternion.x,cutoffMesh.quaternion.y,cutoffMesh.quaternion.z));
                this.world.addBody(cutoffBody);
                this.bodies.push({ mesh: cutoffMesh, body: cutoffBody });
            }

            // Update current slab to overlap
            const newDepth = overlapTop - overlapBottom;
            this.currentSlab.geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, newDepth)
            this.currentSlab.position.z = (overlapBottom + overlapTop) / 2;
            TOP_Z = this.currentSlab.position.z;
            SLAB_DEPTH = newDepth;
        }

        // Add static body for the placed slab
        const shape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.copy(new CANNON.Vec3(this.currentSlab.position.x,this.currentSlab.position.y,this.currentSlab.position.z));
        body.quaternion.copy(new CANNON.Quaternion(this.currentSlab.quaternion.x,this.currentSlab.quaternion.y,this.currentSlab.quaternion.z));
        this.world.addBody(body);
        this.bodies.push({ mesh: this.currentSlab, body });

        return true;
    }
    addSlab() {
        if (axis === 'x') axis = 'z'
        else axis = 'x';

        this.SLAB_INDEX++;
        const geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH)
        const material = new THREE.MeshStandardMaterial({
            color: getStackColor(seed, this.SLAB_INDEX),
            roughness: 0.7,
            metalness: 0.3
        })
        const slab = new THREE.Mesh(geometry, material)
        this.scene.add(slab)
        this.currentSlab = slab;
        slab.position.y = this.SLAB_INDEX * SLAB_HEIGHT - SLAB_HEIGHT;

        slab.position.x = TOP_X;
        slab.position.z = TOP_Z;

        if (axis === 'x') gsap.from(slab.position, { x: -50 })
        else gsap.from(slab.position, { z: -50 });
        gsap.to(slab.position, {
            duration: 1.75,
            repeat: -1,
            yoyo: true,
            ease: 'linear',
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
    updateScore(){
        document.getElementById("text")!.innerText = this.SLAB_INDEX.toString();
    }
    constructor() {
    }
}