import THREE from '../third_party/three.js';
import { renderer, getOrthoCamera } from '../modules/three.js';
import Maf from '../modules/maf.js';
import { palette2 as palette } from '../modules/floriandelooij.js';
import OrbitControls from '../third_party/THREE.OrbitControls.js';
import { InstancedGeometry, getInstancedMeshStandardMaterial, getInstancedDepthMaterial } from '../modules/instanced.js';
import { gradientLinear } from '../modules/gradient.js';
import RoundedExtrudedPolygonGeometry from '../modules/three-rounded-extruded-polygon.js';
import easings from '../modules/easings.js';
import getLemniscatePoint from '../modules/lemniscate.js';

import Painted from '../modules/painted.js';

const painted = Painted(renderer, { minLevel: -.1 });

palette.range = ["#FAE9FD", "#DF4952", "#E7AFD9", "#090422", "#B147A0", "#5124A5", "#3F1867", "#8D92C6"];
const canvas = renderer.domElement;
const camera = getOrthoCamera(.5, .5);
const controls = new OrbitControls(camera, canvas);
const scene = new THREE.Scene();
const group = new THREE.Group();

const gradient = new gradientLinear(palette.range);

const geometry = new THREE.CylinderBufferGeometry(.5, .5, .5);
const mRot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
geometry.applyMatrix(mRot);
const material = getInstancedMeshStandardMaterial({ color: 0xffffff, metalness: .4, roughness: .5 }, { colors: true });
const depthMaterial = getInstancedDepthMaterial();
const instancedGeometry = new InstancedGeometry(geometry, { colors: true });
const instancedMesh = new THREE.Mesh(instancedGeometry.geometry, material);
instancedMesh.frustumCulled = false;
instancedMesh.castShadow = true;
instancedMesh.receiveShadow = true;
instancedMesh.customDepthMaterial = depthMaterial;
group.add(instancedMesh);

const posValues = instancedGeometry.positions.values;
const quatValues = instancedGeometry.quaternions.values;
const scaleValues = instancedGeometry.scales.values;
const colorValues = instancedGeometry.colors.values;

const RINGS = 200;
const PARTS = 10;
const OBJECTS = RINGS * PARTS;

const q = new THREE.Quaternion();
const m = new THREE.Matrix4();
const up = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3(0, 0, 0);
const target = new THREE.Vector3(0, 0, 0);
const m2 = new THREE.Matrix4();

let ptr = 0;
for (let j = 0; j < OBJECTS; j++) {
  posValues[ptr * 3] = 0;
  posValues[ptr * 3 + 1] = 0;
  posValues[ptr * 3 + 2] = 0;
  scaleValues[ptr * 3] = 1;
  scaleValues[ptr * 3 + 1] = 1;
  scaleValues[ptr * 3 + 2] = 1;
  quatValues[ptr * 4] = 0;
  quatValues[ptr * 4 + 1] = 0;
  quatValues[ptr * 4 + 2] = 0;
  quatValues[ptr * 4 + 3] = 1;
  colorValues[ptr * 4] = .5;
  colorValues[ptr * 4 + 1] = .5;
  colorValues[ptr * 4 + 2] = .5;
  colorValues[ptr * 4 + 3] = 1;

  //data.push({ r: j, a });
  ptr++;
}

const offsets = [];
for (let j = 0; j < PARTS; j++) {
  offsets.push(Maf.randomInRange(0, .25 * Maf.TAU));
}

instancedGeometry.update(OBJECTS);

group.scale.setScalar(.45);

scene.add(group);

const directionalLight = new THREE.DirectionalLight(0xffffff, .5);
directionalLight.position.set(-2, 2, 2);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = -1;
directionalLight.shadow.camera.far = 10;
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, .5);
directionalLight2.position.set(1, 2, 1);
directionalLight2.castShadow = true;
directionalLight2.shadow.camera.near = -4;
directionalLight2.shadow.camera.far = 10;
scene.add(directionalLight2);

const ambientLight = new THREE.AmbientLight(0x808080, .5);
scene.add(ambientLight);

const light = new THREE.HemisphereLight(palette.range[2], palette.range[1], .5);
scene.add(light);

camera.position.set(1, 1, -1);
camera.lookAt(new THREE.Vector3(0, 0, 0));
renderer.setClearColor(palette.range[0], 1);
scene.fog = new THREE.FogExp2(palette.range[0], .35);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const loopDuration = 3;

const axis = new THREE.Vector3();

function draw(startTime) {

  const time = (.001 * (performance.now() - startTime)) % loopDuration;
  const t = time / loopDuration;

  let ptr = 0;
  for (let ring = 0; ring < RINGS; ring++) {
    const a = t * Maf.TAU - .25 * ring * Maf.TAU / RINGS;
    for (let part = 0; part < PARTS; part++) {
      const a2 = a + offsets[part];
      const p = getLemniscatePoint(a2);
      const p2 = getLemniscatePoint(a2 + .001);
      const b = part * Maf.TAU / PARTS + t * Maf.TAU;

      target.set(p2.x, p2.y, 0);
      axis.set(p.x, p.y, 0).sub(target).normalize();

      const r = .05 + (.15 * ring / RINGS) + .1 * Maf.parabola(t, 1) * (.5 + .5 * Math.sin(2 * t * Maf.TAU)) * easings.OutQuint(ring / RINGS);
      tmp.set(r, 0, r);
      tmp.applyAxisAngle(axis, b);

      const x = p.x + tmp.x;
      const y = p.y + tmp.y;
      const z = 0 + tmp.z;

      posValues[ptr * 3 + 0] = x;
      posValues[ptr * 3 + 1] = y;
      posValues[ptr * 3 + 2] = z;

      tmp.set(p.x, p.y, 0);
      m.lookAt(tmp, target, up);
      q.setFromRotationMatrix(m);

      quatValues[ptr * 4 + 0] = q.x;
      quatValues[ptr * 4 + 1] = q.y;
      quatValues[ptr * 4 + 2] = q.z;
      quatValues[ptr * 4 + 3] = q.w;

      const s = (.05 * Maf.parabola(ring / RINGS, 1)) * 2 * easings.Linear(1 - ring / RINGS);
      scaleValues[ptr * 3 + 0] = s;
      scaleValues[ptr * 3 + 1] = s;
      scaleValues[ptr * 3 + 2] = s;

      const c = gradient.getAt(Maf.mod(part / PARTS, 1));
      colorValues[ptr * 4 + 0] = c.r;
      colorValues[ptr * 4 + 1] = c.g;
      colorValues[ptr * 4 + 2] = c.b;

      ptr++;
    }
  }

  instancedGeometry.positions.update(OBJECTS);
  instancedGeometry.quaternions.update(OBJECTS);
  instancedGeometry.scales.update(OBJECTS);
  instancedGeometry.colors.update(OBJECTS);

  //group.rotation.y = t * Maf.PI;

  painted.render(scene, camera);
}

export { draw, loopDuration, canvas };