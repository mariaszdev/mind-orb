import * as THREE from "three";

export function createSphere(scene: THREE.Scene): THREE.Mesh {
  const loader = new THREE.TextureLoader();

  const albedoMap = loader.load("/textures/concrete/albedo.jpg");
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  const normalMap = loader.load("/textures/concrete/normal.jpg");
  const ormMap = loader.load("/textures/concrete/orm.jpg");

  for (const tex of [albedoMap, normalMap, ormMap]) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
  }

  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const material = new THREE.MeshStandardMaterial({
    map: albedoMap,
    normalMap: normalMap,
    roughnessMap: ormMap,
    metalnessMap: ormMap,
    aoMap: ormMap,
    roughness: 1.0,
    metalness: 0.0,
  });

  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  return sphere;
}
