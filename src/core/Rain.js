import * as THREE from "three";

// シンプルな雨パーティクル。屋外シーンの空気感に使う。
export class Rain {
  constructor(count = 2200, area = 40, height = 30) {
    this.area = area;
    this.height = height;
    const positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area;
      positions[i * 3 + 1] = Math.random() * height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * area;
      this.velocities[i] = 14 + Math.random() * 14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x9fb0c0,
      size: 0.06,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.count = count;
  }

  update(dt) {
    const pos = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      pos[i * 3 + 1] -= this.velocities[i] * dt;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = this.height;
        pos[i * 3] = (Math.random() - 0.5) * this.area;
        pos[i * 3 + 2] = (Math.random() - 0.5) * this.area;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
