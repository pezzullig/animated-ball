import * as THREE from "https://cdn.skypack.dev/three@0.124.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/loaders/FBXLoader";
import Stats from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/libs/stats.module";
import * as dat from "https://cdn.skypack.dev/dat.gui@0.7.7";
const calcAspect = (el) => el.clientWidth / el.clientHeight;

const twistedColorfulSphereVertexShader = `

vec4 permute(vec4 x){return mod(((x*34.)+1.)*x,289.);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
vec3 fade(vec3 t){return t*t*t*(t*(t*6.-15.)+10.);}

float cnoise(vec3 P){
    vec3 Pi0=floor(P);// Integer part for indexing
    vec3 Pi1=Pi0+vec3(1.);// Integer part + 1
    Pi0=mod(Pi0,289.);
    Pi1=mod(Pi1,289.);
    vec3 Pf0=fract(P);// Fractional part for interpolation
    vec3 Pf1=Pf0-vec3(1.);// Fractional part - 1.0
    vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
    vec4 iy=vec4(Pi0.yy,Pi1.yy);
    vec4 iz0=Pi0.zzzz;
    vec4 iz1=Pi1.zzzz;
    
    vec4 ixy=permute(permute(ix)+iy);
    vec4 ixy0=permute(ixy+iz0);
    vec4 ixy1=permute(ixy+iz1);
    
    vec4 gx0=ixy0/7.;
    vec4 gy0=fract(floor(gx0)/7.)-.5;
    gx0=fract(gx0);
    vec4 gz0=vec4(.5)-abs(gx0)-abs(gy0);
    vec4 sz0=step(gz0,vec4(0.));
    gx0-=sz0*(step(0.,gx0)-.5);
    gy0-=sz0*(step(0.,gy0)-.5);
    
    vec4 gx1=ixy1/7.;
    vec4 gy1=fract(floor(gx1)/7.)-.5;
    gx1=fract(gx1);
    vec4 gz1=vec4(.5)-abs(gx1)-abs(gy1);
    vec4 sz1=step(gz1,vec4(0.));
    gx1-=sz1*(step(0.,gx1)-.5);
    gy1-=sz1*(step(0.,gy1)-.5);
    
    vec3 g000=vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100=vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010=vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001=vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101=vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011=vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111=vec3(gx1.w,gy1.w,gz1.w);
    
    vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
    g000*=norm0.x;
    g010*=norm0.y;
    g100*=norm0.z;
    g110*=norm0.w;
    vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
    g001*=norm1.x;
    g011*=norm1.y;
    g101*=norm1.z;
    g111*=norm1.w;
    
    float n000=dot(g000,Pf0);
    float n100=dot(g100,vec3(Pf1.x,Pf0.yz));
    float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));
    float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
    float n001=dot(g001,vec3(Pf0.xy,Pf1.z));
    float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
    float n011=dot(g011,vec3(Pf0.x,Pf1.yz));
    float n111=dot(g111,Pf1);
    
    vec3 fade_xyz=fade(Pf0);
    vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
    vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);
    float n_xyz=mix(n_yz.x,n_yz.y,fade_xyz.x);
    return 2.2*n_xyz;
}

mat3 rotation3dY(float angle){
    float s=sin(angle);
    float c=cos(angle);
    
    return mat3(
        c,0.,-s,
        0.,1.,0.,   
        s,0.,c      //c = 6 for full size
    );
}

vec3 rotateY(vec3 v,float angle){
    return rotation3dY(angle)*v;
}

uniform float uTime;
uniform float uSpeed;
uniform float uNoiseStrength;
uniform float uNoiseDensity;
uniform float uAmplitude;
uniform float uFrequency;

varying vec2 vUv;
varying vec3 vNormal;
varying float vNoise;

void main(){
    float displacement=uTime*uSpeed;
    float noise=cnoise((normal+displacement)*uNoiseDensity)*uNoiseStrength;
    vec3 newPos=position+(normal*noise);
    float angle=uAmplitude*sin(uFrequency*uv.y+uTime);
    newPos=rotateY(newPos,angle);
    vec4 modelPosition=modelMatrix*vec4(newPos,1.);
    vec4 viewPosition=viewMatrix*modelPosition;
    vec4 projectedPosition=projectionMatrix*viewPosition;
    gl_Position=projectedPosition;
    
    vUv=uv;
    vNormal=normal;
    vNoise=noise;
}
`;
const twistedColorfulSphereFragmentShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uIntensity;
uniform vec3 uBrightness;
uniform vec3 uContrast;
uniform vec3 uOscilation;
uniform vec3 uPhase;

varying vec2 vUv;
varying vec3 vNormal;
varying float vNoise;

// https://iquilezles.org/www/articles/palettes/palettes.htm
vec3 cosPalette(in float t,in vec3 a,in vec3 b,in vec3 c,in vec3 d)
{
    return a+b*cos(6.28318*(c*t+d));
}

void main(){
    float noise=vNoise*uIntensity;
    vec3 color=cosPalette(noise,uBrightness,uContrast,uOscilation,uPhase);
    gl_FragColor=vec4(color,1.);
}
`;
class Base {
    constructor(sel, debug = false) {
        this.debug = debug;
        this.container = document.querySelector(sel);
        this.perspectiveCameraParams = {
            fov: 75,
            near: 0.1,
            far: 100
        };
        this.orthographicCameraParams = {
            zoom: 2,
            near: -100,
            far: 1000
        };
        this.cameraPosition = new THREE.Vector3(0, 3, 10);
        this.lookAtPosition = new THREE.Vector3(0, 0, 0);
        this.rendererParams = {
            outputEncoding: THREE.LinearEncoding,
            config: {
                alpha: true,
                antialias: true
            }
        };

    }

    init() {
        this.createScene();
        this.createPerspectiveCamera();
        this.createRenderer();
        this.createMesh({});
        this.createLight();
        //this.createOrbitControls();
        this.addListeners();
        this.setLoop();
    }

    createScene() {
        const scene = new THREE.Scene();
        if (this.debug) {
            scene.add(new THREE.AxesHelper());
            const stats = Stats();
            this.container.appendChild(stats.dom);
            this.stats = stats;
        }
        this.scene = scene;
    }

    createPerspectiveCamera() {
        const { perspectiveCameraParams, cameraPosition, lookAtPosition } = this;
        const { fov, near, far } = perspectiveCameraParams;
        const aspect = calcAspect(this.container);
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.copy(cameraPosition);
        camera.lookAt(lookAtPosition);
        this.camera = camera;

        this.tl = new TimelineMax({ repeat: -1, repeatDelay: .5, yoyo: true });
        this.tl.fromTo(camera.position, 5, { y: -.17 }, { y: .17, ease: "none" }, 0)
        //this.tl.reverse;
    }

    createOrthographicCamera() {
        const { orthographicCameraParams, cameraPosition, lookAtPosition } = this;
        const { left, right, top, bottom, near, far } = orthographicCameraParams;
        const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
        camera.position.copy(cameraPosition);
        camera.lookAt(lookAtPosition);
        this.camera = camera;
    }



    createRenderer(useWebGL1 = false) {
        var _a;
        const { rendererParams } = this;
        const { outputEncoding, config } = rendererParams;
        const renderer = !useWebGL1
            ? new THREE.WebGLRenderer(config)
            : new THREE.WebGL1Renderer(config);
        renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        renderer.outputEncoding = outputEncoding;
        this.resizeRendererToDisplaySize();
        (_a = this.container) === null || _a === void 0 ? void 0 : _a.appendChild(renderer.domElement);
        this.renderer = renderer;
        this.renderer.setClearColor(0x000000, 0);
    }

    enableShadow() {
        this.renderer.shadowMap.enabled = true;
    }

    resizeRendererToDisplaySize() {
        const { renderer } = this;
        if (!renderer) {
            return;
        }
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio;
        const { clientWidth, clientHeight } = canvas;
        const width = (clientWidth * pixelRatio) | 0;
        const height = (clientHeight * pixelRatio) | 0;
        const isResizeNeeded = canvas.width !== width || canvas.height !== height;
        if (isResizeNeeded) {
            renderer.setSize(width, height, false);
        }
        return isResizeNeeded;
    }

    createMesh(meshObject, container = this.scene) {
        const { geometry = new THREE.BoxGeometry(1, 1, 1),
            material = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#000000")
            }), position = new THREE.Vector3(0, 0, 0) } = meshObject;

        // MESH , one object
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position); //new position - set(1, 0, 0)
        container.add(mesh);



        return mesh;
    }

    createLight() {
        const dirLight = new THREE.DirectionalLight(new THREE.Color("#000000"), 0.5);
        dirLight.position.set(0, 40, 0);
        this.scene.add(dirLight);
        const ambiLight = new THREE.AmbientLight(new THREE.Color("#ffffff"), 0.4);
        // ambiLight.position.set(0, 50, 0);, can set
        this.scene.add(ambiLight);
    }

    createOrbitControls() {
    }

    addListeners() {
        this.onResize();
    }

    onResize() {
        window.addEventListener("resize", (e) => {
            if (this.camera instanceof THREE.PerspectiveCamera) {
                const aspect = calcAspect(this.container);
                const camera = this.camera;
                camera.aspect = aspect;
                camera.updateProjectionMatrix();
            }
            else if (this.camera instanceof THREE.OrthographicCamera) {
                this.updateOrthographicCameraParams();
                const camera = this.camera;
                const { left, right, top, bottom } = this.orthographicCameraParams;
                camera.left = left;
                camera.right = right;
                camera.top = top;
                camera.bottom = bottom;

                camera.updateProjectionMatrix();
            }
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
    }

    update() {
        console.log("animation");
    }

    setLoop() {
        this.renderer.setAnimationLoop(() => {
            this.resizeRendererToDisplaySize();
            this.update();
            if (this.controls) {
                this.controls.update();
            }
            if (this.stats) {
                this.stats.update();
            }
            if (this.composer) {
                this.composer.render();
            }
            else {
                this.renderer.render(this.scene, this.camera);
            }
        });
    }


    loadModel(url) {
        const loader = new GLTFLoader();
        return new Promise((resolve, reject) => {
            loader.load(url, (gltf) => {
                const model = gltf.scene;
                resolve(model);
            }, undefined, (err) => {
                console.log(err);
                reject();
            });
        });
    }

    loadFBXModel(url) {
        const loader = new FBXLoader();
        return new Promise((resolve, reject) => {
            loader.load(url, (obj) => {
                resolve(obj);
            }, undefined, (err) => {
                console.log(err);
                reject();
            });
        });
    }

    getInterSects() {
        this.raycaster.setFromCamera(this.mousePos, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        return intersects;
    }

    onChooseIntersect(target) {
        const intersects = this.getInterSects();
        const intersect = intersects[0];
        if (!intersect || !intersect.face) {
            return null;
        }
        const { object } = intersect;
        return target === object ? intersect : null;
    }
}
class TwistedColorfulSphere extends Base {
    constructor(sel, debug) {
        super(sel, debug);
        this.clock = new THREE.Clock();
        this.cameraPosition = new THREE.Vector3(0, 0, 1.5);

        this.colorParams = {
            brightness: "#8b3bff",
            contrast: "rgb(65%,48%, 59%)",
            oscilation: "#fff",
            phase: "rgb(55%, 98%, 0%)"

        };



    }

    init() {
        this.createScene();
        this.createPerspectiveCamera();
        this.createRenderer();
        this.createTwistedColorfulSphereMaterial();
        this.createSphere();
        this.createLight();
        //this.trackMousePos();
        this.createOrbitControls();
        // this.createDebugPanel();
        this.addListeners();
        this.setLoop();
    }

    createTwistedColorfulSphereMaterial() {
        const twistedColorfulSphereMaterial = new THREE.ShaderMaterial({
            vertexShader: twistedColorfulSphereVertexShader,
            fragmentShader: twistedColorfulSphereFragmentShader,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: {
                    value: 0
                },

                uResolution: {
                    value: new THREE.Vector2(window.innerWidth, window.innerHeight)
                },
                uSpeed: {
                    value: 0.01
                },
                uNoiseStrength: {
                    value: 0.1
                },
                uNoiseDensity: {
                    value: .7
                },
                uFrequency: {
                    value: 1.6
                },
                uAmplitude: {
                    value: 5
                },
                uIntensity: {
                    value: 8
                },
                uBrightness: {
                    value: new THREE.Color(this.colorParams.brightness)
                },
                uContrast: {
                    value: new THREE.Color(this.colorParams.contrast)
                },
                uOscilation: {
                    value: new THREE.Color(this.colorParams.oscilation)
                },
                uPhase: {
                    value: new THREE.Color(this.colorParams.phase)
                }
            }
        });
        this.twistedColorfulSphereMaterial = twistedColorfulSphereMaterial;
    }

    createSphere() {
        const geometry = new THREE.SphereBufferGeometry(0.6, 64, 64);
        const material = this.twistedColorfulSphereMaterial;
        this.createMesh({
            geometry,
            material
        });
    }

    update() {
        const elapsedTime = this.clock.getElapsedTime();
        //const mousePos = this.mousePos;
        if (this.twistedColorfulSphereMaterial) {
            this.twistedColorfulSphereMaterial.uniforms.uTime.value = elapsedTime;
            //this.twistedColorfulSphereMaterial.uniforms.uMouse.value = mousePos;
        }
    }

    createDebugPanel() {
        const gui = new dat.GUI();
        const uniforms = this.twistedColorfulSphereMaterial.uniforms;
        gui.add(uniforms.uSpeed, "value").min(0).max(5).step(0.01).name("speed");
        gui
            .add(uniforms.uNoiseDensity, "value")
            .min(0)
            .max(5)
            .step(0.01)
            .name("noiseDensity");
        gui
            .add(uniforms.uNoiseStrength, "value")
            .min(0)
            .max(5)
            .step(0.01)
            .name("noiseStrength");
        gui
            .add(uniforms.uAmplitude, "value")
            .min(0)
            .max(10)
            .step(0.01)
            .name("amplitude");
        gui
            .add(uniforms.uFrequency, "value")
            .min(0)
            .max(10)
            .step(0.01)
            .name("frequency");
        gui
            .add(uniforms.uIntensity, "value")
            .min(0)
            .max(10)
            .step(0.01)
            .name("intensity");
        gui.addColor(this.colorParams, "brightness").onFinishChange((value) => {
            uniforms.uBrightness.value.set(value);
        });
        gui.addColor(this.colorParams, "contrast").onFinishChange((value) => {
            uniforms.uContrast.value.set(value);
        });
        gui.addColor(this.colorParams, "oscilation").onFinishChange((value) => {
            uniforms.uOscilation.value.set(value);
        });
        gui.addColor(this.colorParams, "phase").onFinishChange((value) => {
            uniforms.uPhase.value.set(value);
        });
    }
}
const start = () => {
    const twistedColorfulSphere = new TwistedColorfulSphere(".twisted-colorful-sphere", false);
    twistedColorfulSphere.init();
};
start();