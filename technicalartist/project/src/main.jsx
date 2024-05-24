import React, { useEffect, useState } from "react";
import ReactDOM from 'react-dom/client';
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GUI } from 'dat.gui';
import './index.css'

const Area = Object.freeze({
  snowyMountain: 'Snowy Mountain',
  jungle: 'Jungle',
})

const gltfLoader = new GLTFLoader();

// Scene
const scene = new THREE.Scene();


function App() {

  const [area, setArea] = useState(Area.snowyMountain)

  const handleAreaChane = (e) => {
    setArea(e.target.value)
  }

  useEffect(() => {
    const canvas = document.querySelector("canvas.webgl");

    // Load Terrain
    gltfLoader.load(`/terrain.glb`, (gltf) => {
      const terrain = gltf.scene.children[0];

      // Apply custom shader material to the terrain
      const terrainMaterial = createTerrainShaderMaterial(area);
      terrain.traverse((child) => {
        if (child.isMesh) {
          child.material = terrainMaterial;
        }
      });

      scene.add(gltf.scene);
    });

    // Lights
    const pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(0, 100, 0);
    scene.add(pointLight);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener("resize", () => {
      // Update sizes
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Update camera
      camera.aspect = canvas.width / canvas.height;
      camera.updateProjectionMatrix();

      // Update renderer
      renderer.setSize(canvas.width, canvas.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });


    addEventListener("keydown", (event) => {
      if (event.key === "w") {
        camera.position.z -= 1;
      } else if (event.key === "s") {
        camera.position.z += 1;
      } else if (event.key === "a") {
        camera.position.x -= 1;
      } else if (event.key === "d") {
        camera.position.x += 1;
      } else if (event.key === "q") {
        camera.position.y += 1;
      } else if (event.key === "e") {
        camera.position.y -= 1;
      }

      camera.updateWorldMatrix();
    });

    /**
     * Camera
     */
    // Base camera
    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      10000
    );
    camera.position.x = 1000;
    camera.position.y = 1000;
    camera.position.z = -1000;
    scene.add(camera);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: false,
    });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Animation Loop
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };

    tick();
  }, [area]);

  return (
    <div>
      <div className="controlbar">
        <h1>{area}</h1>
        <div class="custom-select-container">
          <select
            class="custom-select"
            value={area}
            onChange={handleAreaChane}
          >
            <option value="Snowy Mountain">Snowy Mountain</option>
            <option value="Jungle">Jungle</option>
          </select>
        </div>
      </div>
      <canvas className="webgl"></canvas>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

function createTerrainShaderMaterial(area) {
  const vertexShader = `
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vUv = position.xz * 0.01;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;



const fragmentShader = `
varying vec3 vWorldPosition;
varying vec2 vUv;
  uniform sampler2D snowTexture;
  uniform sampler2D rockTexture;
  uniform float slopeThreshold;

  void main() {
    float dydx = dFdx(vWorldPosition.y);
    float dydy = dFdy(vWorldPosition.y);

    float slope = length(vec2(dydx, dydy));


    float slopeEffect = clamp(slope, 0.0, 1.0); // Adjust the multiplier as needed

    vec4 snowyColor = texture2D(snowTexture, vUv);
    vec4 rockyColor = texture2D(rockTexture, vUv);
    float smoothSlope = smoothstep(slopeThreshold - 0.2, slopeThreshold + 0.2, slopeEffect);

    // Determine the color based on the slope
    vec4 color = mix(rockyColor, snowyColor, 1.0 - smoothSlope);
    gl_FragColor = color;
  }
`;


  let texture1, texture2
  switch (area) {
    case Area.snowyMountain:
      texture1 = new THREE.TextureLoader().load('/images/snow.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10000, 10000);
      });
      texture2 = new THREE.TextureLoader().load('/images/rock.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10000, 10000);
      });
      break;
    case Area.jungle:
      texture1 = new THREE.TextureLoader().load('/images/hedge.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10000, 10000);
      });
      texture2 = new THREE.TextureLoader().load('/images/jungle.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10000, 10000);
      });
  }


  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      snowLine: { value: 10 },
      slopeThreshold: { value: 0.8 },
      snowTexture: { value: texture1 },
      rockTexture: { value: texture2 },
    }
  });
}
