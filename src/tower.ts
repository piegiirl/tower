import { gsap } from "gsap";
import * as THREE from "three";
import { getStackColor } from "./utils/color";
import * as CANNON from 'cannon-es';
import { Howl } from 'howler';

const SLAB_HEIGHT = 5;
let SLAB_WIDTH = 5 * SLAB_HEIGHT;
let SLAB_DEPTH = 5 * SLAB_HEIGHT;

let TOP_X = 0;
let TOP_Z = 0;
let axis: 'x' | 'z' = 'z';
let seed = 0;

export class Tower {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    clock: THREE.Clock;
    currentSlab: THREE.Mesh;
    world: CANNON.World;
    bodies: { mesh: THREE.Mesh, body: CANNON.Body }[] = [];
    SLAB_INDEX = 1;
    gradientColors: string[] = [
        '#FFF800',
        '#FFB700', 
        '#680BAB',
        '#EAFC71', 
        '#FFD773', 
        '#A767D5', 
        '#FF7100',
        '#FF3900', 
    ];
    private stackSound: Howl;

    constructor() {
        this.stackSound = new Howl({
            src: ['/src/music.ogg'], 
            volume: 0.3,
        });
        this.init();
    }

    init() {
        SLAB_WIDTH = 5 * SLAB_HEIGHT;
        SLAB_DEPTH = 5 * SLAB_HEIGHT;
        this.SLAB_INDEX = 1;
        TOP_X = 0;
        TOP_Z = 0;
        axis = 'z';
        seed = Math.floor(Math.random() * 1000);

        // Canvas
        const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

        // Scene
        this.scene = new THREE.Scene();

        // Установка CSS-градиента как фона
        const randomIndex1 = Math.floor(Math.random() * this.gradientColors.length);
        let randomIndex2 = Math.floor(Math.random() * this.gradientColors.length);
        while (randomIndex2 === randomIndex1) {
            randomIndex2 = Math.floor(Math.random() * this.gradientColors.length);
        }
        const color1 = this.gradientColors[randomIndex1];
        const color2 = this.gradientColors[randomIndex2];
        canvas.style.background = `linear-gradient(90deg, ${color1}, ${color2})`;

        // Box (базовая плита)
        const geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH);
        const material = new THREE.MeshStandardMaterial({
            color: getStackColor(seed, this.SLAB_INDEX),
            roughness: 0.7,
            metalness: 0.3
        });
        const slab = new THREE.Mesh(geometry, material);
        this.scene.add(slab);
        this.currentSlab = slab;

        // Физический мир
        this.world = new CANNON.World();
        this.world.gravity.set(0, -100, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();

        // Базовое тело для физики
        const baseShape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
        const baseBody = new CANNON.Body({ mass: 0 });
        baseBody.addShape(baseShape);
        baseBody.position.copy(new CANNON.Vec3(slab.position.x, slab.position.y, slab.position.z));
        this.world.addBody(baseBody);
        this.bodies.push({ mesh: slab, body: baseBody });

        // Освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
        mainLight.position.set(50, 150, 120);
        this.scene.add(mainLight);

        // Камера
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(50, 70, 50);
        this.scene.add(this.camera);
        this.camera.lookAt(0, 0, 0);

        // Оси для отладки
        const axesHelper = new THREE.AxesHelper(50);
        this.scene.add(axesHelper);

        // Рендер
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setClearColor(0x000000, 0); // Прозрачный фон
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Часы для анимации
        this.clock = new THREE.Clock();

        // Анимация
        const animate = () => {
            const delta = this.clock.getDelta();
            this.world.step(1 / 60, delta, 3);

            for (const { mesh, body } of this.bodies) {
                if (body.mass > 0) {
                    mesh.position.copy(body.position);
                    mesh.quaternion.copy(body.quaternion);
                }
            }

            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(animate);
        };
        animate();

        // Обработка изменения размера окна
        window.addEventListener("resize", () => {
            const sizes = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            this.camera.aspect = sizes.width / sizes.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(sizes.width, sizes.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
    }

    cutCurrentSlab(): boolean {
        let success = true;
        // Рассчитываем громкость для каждого размещения
        const volume = Math.min(1.0, 0.3 + this.SLAB_INDEX * 0.02);
        let rate = this.stackSound.rate(); // Сохраняем текущую высоту звука

        if (axis === "x") {
            const prevLeft = -SLAB_WIDTH / 2 + TOP_X;
            const prevRight = SLAB_WIDTH / 2 + TOP_X;
            const currLeft = -SLAB_WIDTH / 2 + this.currentSlab.position.x;
            const currRight = SLAB_WIDTH / 2 + this.currentSlab.position.x;
            const overlapLeft = Math.max(prevLeft, currLeft);
            const overlapRight = Math.min(prevRight, currRight);
            const offsetX = Math.abs(this.currentSlab.position.x - TOP_X);

            if (overlapLeft >= overlapRight) {
                // Воспроизведение звука при проигрыше
                this.stackSound.volume(volume);
                this.stackSound.play();
                console.log('Playing sound, volume:', volume, 'rate:', rate, 'SLAB_INDEX:', this.SLAB_INDEX);
                return false;
            }

            if (offsetX < 0.5) {
                // Snap к точной позиции
                this.currentSlab.position.x = TOP_X;

                // Создаём белый прямоугольник (плоскость)
                const geometry = new THREE.PlaneGeometry(SLAB_WIDTH + 2, SLAB_DEPTH + 2);
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffffff, // Белый цвет
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
                const light = new THREE.Mesh(geometry, material);
                light.position.set(TOP_X, this.currentSlab.position.y - SLAB_HEIGHT / 2 - 0.1, TOP_Z);
                light.rotation.x = -Math.PI / 2; // Ложим плоскость горизонтально
                this.scene.add(light);

                // Анимация появления и исчезновения
                gsap.fromTo(
                    light.material,
                    { opacity: 0 },
                    { opacity: 0.7, duration: 0.5, ease: 'power2.out' }
                );
                gsap.to(light.material, {
                    opacity: 0,
                    duration: 0.5,
                    delay: 0.5,
                    ease: 'power2.in',
                    onComplete: () => {
                        this.scene.remove(light);
                        light.geometry.dispose();
                        light.material.dispose();
                    }
                });

                // Увеличиваем высоту звука при точном совпадении (более плавно)
                rate = Math.min(3.0, 1 + this.SLAB_INDEX * 0.02);
                this.stackSound.volume(volume);
                this.stackSound.rate(rate);
                this.stackSound.play();
                console.log('Playing sound (perfect match), volume:', volume, 'rate:', rate, 'SLAB_INDEX:', this.SLAB_INDEX);

                // Фиксируем плиту как static (без резки)
                const shape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
                const body = new CANNON.Body({ mass: 0 });
                body.addShape(shape);
                body.position.copy(new CANNON.Vec3(this.currentSlab.position.x, this.currentSlab.position.y, this.currentSlab.position.z));
                this.world.addBody(body);
                this.bodies.push({ mesh: this.currentSlab, body });

                return success;
            }
            if (currLeft < overlapLeft) {
                const cutoffWidth = overlapLeft - currLeft;
                const cutoffGeom = new THREE.BoxGeometry(cutoffWidth, SLAB_HEIGHT, SLAB_DEPTH);
                const cutoffMat = (this.currentSlab.material as THREE.Material).clone();
                const cutoffMesh = new THREE.Mesh(cutoffGeom, cutoffMat);
                cutoffMesh.position.set((currLeft + overlapLeft) / 2, this.currentSlab.position.y, this.currentSlab.position.z);
                this.scene.add(cutoffMesh);

                const cutoffShape = new CANNON.Box(new CANNON.Vec3(cutoffWidth / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
                const cutoffBody = new CANNON.Body({ mass: 10 });
                cutoffBody.addShape(cutoffShape);
                cutoffBody.position.copy(new CANNON.Vec3(cutoffMesh.position.x, cutoffMesh.position.y, cutoffMesh.position.z));
                this.world.addBody(cutoffBody);
                this.bodies.push({ mesh: cutoffMesh, body: cutoffBody });
            }

            if (currRight > overlapRight) {
                const cutoffWidth = currRight - overlapRight;
                const cutoffGeom = new THREE.BoxGeometry(cutoffWidth, SLAB_HEIGHT, SLAB_DEPTH);
                const cutoffMat = (this.currentSlab.material as THREE.Material).clone();
                const cutoffMesh = new THREE.Mesh(cutoffGeom, cutoffMat);
                cutoffMesh.position.set((overlapRight + currRight) / 2, this.currentSlab.position.y, this.currentSlab.position.z);
                this.scene.add(cutoffMesh);

                const cutoffShape = new CANNON.Box(new CANNON.Vec3(cutoffWidth / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
                const cutoffBody = new CANNON.Body({ mass: 10 });
                cutoffBody.addShape(cutoffShape);
                cutoffBody.position.copy(new CANNON.Vec3(cutoffMesh.position.x, cutoffMesh.position.y, cutoffMesh.position.z));
                this.world.addBody(cutoffBody);
                this.bodies.push({ mesh: cutoffMesh, body: cutoffBody });
            }

            const newWidth = overlapRight - overlapLeft;
            this.currentSlab.geometry = new THREE.BoxGeometry(newWidth, SLAB_HEIGHT, SLAB_DEPTH);
            this.currentSlab.position.x = (overlapLeft + overlapRight) / 2;
            TOP_X = this.currentSlab.position.x;
            SLAB_WIDTH = newWidth;

            // Воспроизведение звука при резке
            this.stackSound.volume(volume);
            this.stackSound.rate(rate);
            this.stackSound.play();
            console.log('Playing sound (cut), volume:', volume, 'rate:', rate, 'SLAB_INDEX:', this.SLAB_INDEX);
        } else {
            const prevBottom = -SLAB_DEPTH / 2 + TOP_Z;
            const prevTop = SLAB_DEPTH / 2 + TOP_Z;
            const currBottom = -SLAB_DEPTH / 2 + this.currentSlab.position.z;
            const currTop = SLAB_DEPTH / 2 + this.currentSlab.position.z;
            const overlapBottom = Math.max(prevBottom, currBottom);
            const overlapTop = Math.min(prevTop, currTop);
            const offsetZ = Math.abs(this.currentSlab.position.z - TOP_Z);

            if (overlapBottom >= overlapTop) {
                // Воспроизведение звука при проигрыше
                this.stackSound.volume(volume);
                this.stackSound.play();
                console.log('Playing sound, volume:', volume, 'rate:', rate, 'SLAB_INDEX:', this.SLAB_INDEX);
                return false;
            }

            if (offsetZ < 0.5) {
                // Snap к точной позиции
                this.currentSlab.position.z = TOP_Z;

                // Создаём белый прямоугольник (плоскость)
                const geometry = new THREE.PlaneGeometry(SLAB_WIDTH + 2, SLAB_DEPTH + 2);
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffffff, // Белый цвет
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
                const light = new THREE.Mesh(geometry, material);
                light.position.set(TOP_X, this.currentSlab.position.y - SLAB_HEIGHT / 2 - 0.1, TOP_Z);
                light.rotation.x = -Math.PI / 2; // Ложим плоскость горизонтально
                this.scene.add(light);

                // Анимация появления и исчезновения
                gsap.fromTo(
                    light.material,
                    { opacity: 0 },
                    { opacity: 0.7, duration: 0.5, ease: 'power2.out' }
                );
                gsap.to(light.material, {
                    opacity: 0,
                    duration: 0.5,
                    delay: 0.5,
                    ease: 'power2.in',
                    onComplete: () => {
                        this.scene.remove(light);
                        light.geometry.dispose();
                        light.material.dispose();
                    }
                });

                // Увеличиваем высоту звука при точном совпадении (более плавно)
                rate = Math.min(3.0, 1 + this.SLAB_INDEX * 0.02);
                this.stackSound.volume(volume);
                this.stackSound.rate(rate);
                this.stackSound.play();
                console.log('Playing sound (perfect match), volume:', volume, 'rate:', rate, 'SLAB_INDEX:', this.SLAB_INDEX);

                // Фиксируем плиту как static (без резки)
                const shape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
                const body = new CANNON.Body({ mass: 0 });
                body.addShape(shape);
                body.position.copy(new CANNON.Vec3(this.currentSlab.position.x, this.currentSlab.position.y, this.currentSlab.position.z));
                this.world.addBody(body);
                this.bodies.push({ mesh: this.currentSlab, body });

                return success;
            }
            if (currBottom < overlapBottom) {
                const cutoffDepth = overlapBottom - currBottom;
                const cutoffGeom = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, cutoffDepth);
                const cutoffMat = (this.currentSlab.material as THREE.Material).clone();
                const cutoffMesh = new THREE.Mesh(cutoffGeom, cutoffMat);
                cutoffMesh.position.set(this.currentSlab.position.x, this.currentSlab.position.y, (currBottom + overlapBottom) / 2);
                this.scene.add(cutoffMesh);

                const cutoffShape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, cutoffDepth / 2));
                const cutoffBody = new CANNON.Body({ mass: 10 });
                cutoffBody.addShape(cutoffShape);
                cutoffBody.position.copy(new CANNON.Vec3(cutoffMesh.position.x, cutoffMesh.position.y, cutoffMesh.position.z));
                this.world.addBody(cutoffBody);
                this.bodies.push({ mesh: cutoffMesh, body: cutoffBody });
            }

            if (currTop > overlapTop) {
                const cutoffDepth = currTop - overlapTop;
                const cutoffGeom = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, cutoffDepth);
                const cutoffMat = (this.currentSlab.material as THREE.Material).clone();
                const cutoffMesh = new THREE.Mesh(cutoffGeom, cutoffMat);
                cutoffMesh.position.set(this.currentSlab.position.x, this.currentSlab.position.y, (overlapTop + currTop) / 2);
                this.scene.add(cutoffMesh);

                const cutoffShape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, cutoffDepth / 2));
                const cutoffBody = new CANNON.Body({ mass: 10 });
                cutoffBody.addShape(cutoffShape);
                cutoffBody.position.copy(new CANNON.Vec3(cutoffMesh.position.x, cutoffMesh.position.y, cutoffMesh.position.z));
                this.world.addBody(cutoffBody);
                this.bodies.push({ mesh: cutoffMesh, body: cutoffBody });
            }

            const newDepth = overlapTop - overlapBottom;
            this.currentSlab.geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, newDepth);
            this.currentSlab.position.z = (overlapBottom + overlapTop) / 2;
            TOP_Z = this.currentSlab.position.z;
            SLAB_DEPTH = newDepth;

            // Воспроизведение звука при резке
            this.stackSound.volume(volume);
            this.stackSound.rate(rate);
            this.stackSound.play();
            console.log('Playing sound (cut), volume:', volume, 'rate:', rate, 'SLAB_INDEX:', this.SLAB_INDEX);
        }

        const shape = new CANNON.Box(new CANNON.Vec3(SLAB_WIDTH / 2, SLAB_HEIGHT / 2, SLAB_DEPTH / 2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.copy(new CANNON.Vec3(this.currentSlab.position.x, this.currentSlab.position.y, this.currentSlab.position.z));
        this.world.addBody(body);
        this.bodies.push({ mesh: this.currentSlab, body });

        return success;
    }

    addSlab() {
        if (axis === 'x') axis = 'z';
        else axis = 'x';

        this.SLAB_INDEX++;
        const geometry = new THREE.BoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH);
        const material = new THREE.MeshStandardMaterial({
            color: getStackColor(seed, this.SLAB_INDEX),
            roughness: 0.7,
            metalness: 0.3
        });
        const slab = new THREE.Mesh(geometry, material);
        this.scene.add(slab);
        this.currentSlab = slab;
        slab.position.y = this.SLAB_INDEX * SLAB_HEIGHT - SLAB_HEIGHT;
        slab.position.x = TOP_X;
        slab.position.z = TOP_Z;

        if (axis === 'x') gsap.from(slab.position, { x: -50 });
        else gsap.from(slab.position, { z: -50 });
        gsap.to(slab.position, {
            duration: 1.75,
            repeat: -1,
            yoyo: true,
            ease: 'linear',
            ... (axis === 'x' ? { x: 50 } : { z: 50 })
        });
        gsap.to(this.camera.position, {
            duration: 1,
            y: this.camera.position.y + SLAB_HEIGHT,
            ease: 'power2.out'
        });
    }

    stopSlab() {
        gsap.killTweensOf(this.currentSlab.position);
    }

    updateScore() {
        document.getElementById("text")!.innerText = this.SLAB_INDEX.toString();
    }
}