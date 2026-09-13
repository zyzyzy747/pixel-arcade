/* ============================================================================
 * 呼吸系统与肺泡气体交换 · 3D 互动课件   —— main.js
 * ----------------------------------------------------------------------------
 * three.js r160.1 ｜ 无构建工具 ｜ 无后端 ｜ 双击 index.html 或本地服务器均可运行
 *
 * 代码分区：
 *   0. 常量与配色
 *   1. 通用工具（插值 / 发光贴图 / 粒子系统 / 材质）
 *   2. 渲染器 · 相机 · 三个场景
 *   3. 程序化模型工厂（glb 缺失时的降级方案）
 *   4. ===== 场景A：呼吸系统整体结构 =====
 *   5. ===== 场景B：吸气 / 呼气运动 =====
 *   6. ===== 场景C：肺泡气体交换 =====
 *   7. 场景切换与相机运动
 *   8. 随堂选择题（共 6 题）
 *   9. 演示模式（25 秒时间轴）
 *  10. 主循环与事件绑定
 * ==========================================================================*/

(function () {
  'use strict';

  /* three 及插件由 index.html 的引导脚本挂到 window.THREE（ESM / 打包版二选一） */
  const THREE = window.THREE;
  if (!THREE) return;
  const { GLTFLoader, OrbitControls, CSS2DRenderer, CSS2DObject } = THREE;

  const $ = (sel) => document.querySelector(sel);

  /* ==========================================================================
   * 0. 常量与配色
   * ========================================================================*/
  const COLOR = {
    primary: 0x4fd1c5,   // 主色 青蓝
    highlight: 0xff9f43, // 高亮 橙
    o2: 0x4da3ff,        // 蓝 = O₂
    co2: 0xff4d4d,       // 红 = CO₂
    tissue: 0xf58ea0,    // 肺组织
    airway: 0xbfe9ff,    // 气道
    bone: 0xe8eef7,      // 骨
    muscle: 0xff8a65,    // 膈肌
    vessel: 0xb03a4a,    // 血管
    sac: 0xffd6e0        // 肺泡囊
  };

  /* glb 模型约定路径：文件不存在时自动降级为程序化几何体 */
  const MODEL_PATHS = {
    A: 'models/respiratory-system.glb',
    B: 'models/lung-motion.glb',
    C: 'models/alveolus.glb'
  };

  /* 每个场景的相机初始位姿（双击画布可平滑复位） */
  const CAM_HOME = {
    A: { p: new THREE.Vector3(0.2, 0.55, 5.6), t: new THREE.Vector3(0, 0.30, 0) },
    B: { p: new THREE.Vector3(0.3, 0.30, 4.9), t: new THREE.Vector3(0, 0.05, 0) },
    C: { p: new THREE.Vector3(0.2, 0.60, 5.0), t: new THREE.Vector3(0, 0.15, 0) }
  };

  /* ==========================================================================
   * 1. 通用工具
   * ========================================================================*/
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /** 生成一张径向渐变的发光贴图，供粒子使用 */
  function makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0.0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1.0, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const GLOW = makeGlowTexture();

  /* ---- 粒子着色器：支持逐粒子大小 + 逐粒子颜色（叠加混合做拖尾光效） ---- */
  const PARTICLE_VS = `
    attribute float aSize;
    attribute vec3 aColor;
    varying vec3 vColor;
    void main() {
      vColor = aColor;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (320.0 / max(-mv.z, 0.001));
      gl_Position = projectionMatrix * mv;
    }`;
  const PARTICLE_FS = `
    uniform sampler2D uMap;
    varying vec3 vColor;
    void main() {
      vec4 tex = texture2D(uMap, gl_PointCoord);
      gl_FragColor = vec4(vColor, 1.0) * tex;
    }`;

  /** 创建一个粒子场（Points） */
  function createParticleField(count, texture) {
    const geo = new THREE.BufferGeometry();
    const position = new Float32Array(count * 3);
    const aColor = new Float32Array(count * 3);
    const aSize = new Float32Array(count);
    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: texture || GLOW } },
      vertexShader: PARTICLE_VS,
      fragmentShader: PARTICLE_FS,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: true
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.visible = false;
    return {
      points, position, aColor, aSize, count,
      /** 写入缓冲区 */
      commit() {
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aColor.needsUpdate = true;
        geo.attributes.aSize.needsUpdate = true;
      },
      /** 隐藏第 i 个粒子 */
      hide(i) {
        this.aSize[i] = 0;
        this.aColor[i * 3] = 0;
        this.aColor[i * 3 + 1] = 0;
        this.aColor[i * 3 + 2] = 0;
      },
      /** 设置第 i 个粒子 */
      set(i, x, y, z, color, intensity, size) {
        this.position[i * 3] = x;
        this.position[i * 3 + 1] = y;
        this.position[i * 3 + 2] = z;
        this.aColor[i * 3] = color.r * intensity;
        this.aColor[i * 3 + 1] = color.g * intensity;
        this.aColor[i * 3 + 2] = color.b * intensity;
        this.aSize[i] = size;
      }
    };
  }

  /* ---- 常用材质 ---- */
  const matTissue = () => new THREE.MeshStandardMaterial({
    color: COLOR.tissue, roughness: 0.62, metalness: 0.03,
    transparent: true, opacity: 0.96, emissive: 0x000000
  });
  const matAirway = () => new THREE.MeshStandardMaterial({
    color: COLOR.airway, roughness: 0.35, metalness: 0.08,
    transparent: true, opacity: 0.92, emissive: 0x000000
  });
  const matBone = () => new THREE.MeshStandardMaterial({
    color: COLOR.bone, roughness: 0.65, metalness: 0.05, emissive: 0x000000
  });
  const matMuscle = () => new THREE.MeshStandardMaterial({
    color: COLOR.muscle, roughness: 0.75, side: THREE.DoubleSide, emissive: 0x000000
  });
  const matVessel = () => new THREE.MeshStandardMaterial({
    color: COLOR.vessel, roughness: 0.45, metalness: 0.05, emissive: 0x1a0308
  });
  const matSac = (opacity) => new THREE.MeshStandardMaterial({
    color: COLOR.sac, roughness: 0.2, metalness: 0.0,
    transparent: true, opacity: opacity, side: THREE.DoubleSide,
    depthWrite: false, emissive: 0x2a0d16
  });

  /** 在 a、b 两点之间生成一根圆柱（用于气管 / 支气管 / 骨架） */
  function makeTube(a, b, radius, mat, seg) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, len, seg || 16, 1, false), mat
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
    return mesh;
  }

  /** 生成一支箭头（圆柱 + 圆锥），用于强化气体交换方向 */
  function makeArrow(from, to, color) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    dir.normalize();
    const shaft = makeTube(V(0, 0, 0), dir.clone().multiplyScalar(len - 0.2), 0.028, mat, 10);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.22, 18), mat);
    cone.position.copy(dir.clone().multiplyScalar(len - 0.1));
    cone.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    g.add(shaft, cone);
    g.userData.mat = mat;
    return g;
  }

  /** 标准三点布光 */
  function addLights(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(3, 4.5, 5);
    const fill = new THREE.DirectionalLight(0x8fc4ff, 0.75);
    fill.position.set(-4.5, 1, 3.5);
    const rim = new THREE.DirectionalLight(COLOR.primary, 0.7);
    rim.position.set(0, -2.5, -5.5);
    scene.add(key, fill, rim);
  }

  /* ==========================================================================
   * 2. 渲染器 · 相机 · 三个场景
   * ========================================================================*/
  const canvasWrap = $('#canvasWrap');

  /* 三个场景共用一个 WebGL 渲染器，切换时只换 Scene 内容 */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  canvasWrap.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'label-layer';
  canvasWrap.appendChild(labelRenderer.domElement);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.copy(CAM_HOME.A.p);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2.2;
  controls.maxDistance = 12;
  controls.target.copy(CAM_HOME.A.t);

  const scenes = { A: new THREE.Scene(), B: new THREE.Scene(), C: new THREE.Scene() };
  Object.keys(scenes).forEach((k) => addLights(scenes[k]));

  let current = 'A';   // 当前场景

  function resize() {
    const w = canvasWrap.clientWidth || window.innerWidth;
    const h = canvasWrap.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  /* ==========================================================================
   * 3. 模型加载 + 程序化降级
   * ========================================================================*/
  /**
   * 加载 glb；失败时调用 fallbackBuilder 生成程序化几何体。
   * onReady(group, animations)
   */
  function loadModelOrFallback(key, targetHeight, fallbackBuilder, onReady) {
    const url = MODEL_PATHS[key];
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const wrap = new THREE.Group();
        wrap.add(gltf.scene);
        // 归一化：缩放到统一高度并居中
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const s = targetHeight / (size.y || 1);
        gltf.scene.scale.setScalar(s);
        gltf.scene.position.sub(center.multiplyScalar(s));
        wrap.userData.fromModel = true;
        console.log('%c[课件] 已加载模型 ' + url, 'color:#4fd1c5');
        onReady(wrap, gltf.animations || []);
      },
      undefined,
      () => {
        console.warn(
          '[课件] 未找到或无法加载模型：' + url + '，已自动改用程序化几何体顶替（不影响使用）。'
        );
        onReady(fallbackBuilder(), []);
      }
    );
  }

  /** 按名称关键字在 glb 中查找部位节点 */
  function findNodeByName(root, keywords) {
    let hit = null;
    root.traverse((o) => {
      if (hit || !o.name) return;
      const n = o.name.toLowerCase();
      if (keywords.some((k) => n.includes(k))) hit = o;
    });
    return hit;
  }

  /** 包围盒启发式：为未知模型生成 6 个标注锚点 */
  function guessAnchor(box, rel) {
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    return new THREE.Vector3(
      c.x + s.x * rel[0], c.y + s.y * rel[1], c.z + s.z * rel[2]
    );
  }

  /* ==========================================================================
   * 4. ===== 场景A：呼吸系统整体结构 =====
   * ========================================================================*/
  const A = {
    parts: {},        // key -> { obj, labelEl, labelObj, mats, highlighted }
    defs: [],         // 部位定义
    curves: [],       // 空气路径
    flow: null,       // 粒子场
    flowTubes: [],
    flowActive: false
  };

  const CARD_A = {
    nose: { title: '鼻 / 口', text: '呼吸道的起点。鼻腔内的鼻毛能阻挡灰尘，黏液能温暖、湿润并清洁吸入的空气。' },
    trachea: { title: '气管', text: '空气进出肺部的通道，由 C 形软骨环支撑，保持气道畅通；内壁的纤毛和黏液能进一步清洁空气。' },
    bronchus: { title: '支气管', text: '气管下端分成左右两支，分别通向左、右肺，并在肺内不断分支成细支气管，末端连接肺泡。' },
    lungR: { title: '右肺', text: '位于胸腔右侧（画面左侧），分三叶，是气体交换的主要场所之一。' },
    lungL: { title: '左肺', text: '位于胸腔左侧（画面右侧），因心脏占位略小于右肺，分两叶。' },
    alveoli: { title: '肺泡', text: '肺的基本功能单位，数量极多、壁极薄（仅一层细胞），外缠丰富毛细血管，是气体交换的场所。' }
  };

  /** 程序化构建呼吸系统（glb 缺失时的兜底） */
  function buildFallbackA() {
    const g = new THREE.Group();

    /* --- 鼻 / 口 --- */
    const nose = new THREE.Group();
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), matTissue());
    noseMesh.scale.set(0.95, 0.85, 1.05);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.14), matTissue());
    mouth.position.set(0, -0.24, 0.2);
    nose.add(noseMesh, mouth);
    nose.position.set(0, 1.62, 0.06);
    g.add(nose);

    /* --- 咽 / 喉 --- */
    const pharynx = makeTube(V(0, 1.36, 0.02), V(0, 1.14, 0), 0.105, matAirway());

    /* --- 气管（含 C 形软骨环） --- */
    const trachea = new THREE.Group();
    trachea.add(makeTube(V(0, 1.14, 0), V(0, 0.12, 0), 0.105, matAirway(), 24));
    for (let i = 0; i < 7; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.017, 8, 20), matAirway());
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.05 - i * 0.145;
      trachea.add(ring);
    }

    /* --- 支气管 + 细支气管 --- */
    const bronchi = new THREE.Group();
    [-1, 1].forEach((sign) => {
      bronchi.add(makeTube(V(0, 0.14, 0), V(sign * 0.44, -0.22, 0), 0.075, matAirway(), 16));
      bronchi.add(makeTube(V(sign * 0.44, -0.22, 0), V(sign * 0.62, -0.5, 0.02), 0.05, matAirway(), 12));
    });

    /* --- 左肺 / 右肺（正面观：右肺在画面左侧） --- */
    const lungR = new THREE.Mesh(new THREE.SphereGeometry(0.5, 36, 26), matTissue());
    lungR.scale.set(0.82, 1.42, 0.62);
    lungR.position.set(-0.66, -0.34, 0);
    lungR.rotation.z = 0.07;

    const lungL = new THREE.Mesh(new THREE.SphereGeometry(0.5, 36, 26), matTissue());
    lungL.scale.set(0.76, 1.42, 0.60);
    lungL.position.set(0.64, -0.34, 0);
    lungL.rotation.z = -0.07;

    /* --- 肺泡簇（概念引出） --- */
    const alveoli = new THREE.Group();
    const alveoliMat = matSac(0.55);
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399963;               // 黄金角，形成葡萄串
      const r = 0.16 * Math.sqrt(i);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), alveoliMat);
      s.position.set(Math.cos(a) * r, Math.sin(a) * r * 1.1, Math.sin(a * 1.7) * r * 0.6);
      alveoli.add(s);
    }
    alveoli.position.set(1.15, -0.82, 0.45);
    alveoli.scale.setScalar(1.15);
    // 连接细支气管与肺泡簇的细杆
    const stalk = makeTube(V(0.66, -0.52, 0.05), V(1.1, -0.78, 0.42), 0.022, matAirway(), 8);

    g.add(pharynx, trachea, bronchi, lungR, lungL, alveoli, stalk);
    g.userData.nodes = { nose, trachea, bronchi, lungR, lungL, alveoli };
    return g;
  }

  /** 场景A 的 6 个标注定义（锚点为世界坐标） */
  const DEF_A = [
    { key: 'nose', text: '鼻 / 口', anchor: V(0.0, 2.05, 0.12), card: CARD_A.nose },
    { key: 'trachea', text: '气管', anchor: V(-0.48, 0.76, 0.12), card: CARD_A.trachea },
    { key: 'bronchus', text: '支气管', anchor: V(0.64, 0.10, 0.12), card: CARD_A.bronchus },
    { key: 'lungR', text: '右肺', anchor: V(-1.36, -0.12, 0.15), card: CARD_A.lungR },
    { key: 'lungL', text: '左肺', anchor: V(1.32, -0.12, 0.15), card: CARD_A.lungL },
    { key: 'alveoli', text: '肺泡（概念引出）', anchor: V(1.34, -1.16, 0.45), card: CARD_A.alveoli }
  ];

  /** 空气流动路径：鼻/口 → 咽 → 气管 → 支气管 → 肺（左右各一条） */
  function buildAirCurves() {
    const common = [V(0, 1.95, 0.26), V(0, 1.62, 0.12), V(0, 1.32, 0.03), V(0, 0.95, 0), V(0, 0.55, 0), V(0, 0.16, 0)];
    const left = common.concat([
      V(-0.14, 0.04, 0), V(-0.32, -0.12, 0), V(-0.5, -0.36, 0.01), V(-0.62, -0.62, 0.03), V(-0.66, -0.92, 0.05)
    ]);
    const right = common.concat([
      V(0.14, 0.04, 0), V(0.32, -0.12, 0), V(0.5, -0.36, 0.01), V(0.62, -0.62, 0.03), V(0.66, -0.92, 0.05)
    ]);
    return [new THREE.CatmullRomCurve3(left), new THREE.CatmullRomCurve3(right)];
  }

  function initSceneA() {
    loadModelOrFallback('A', 3.4, buildFallbackA, (group, animations) => {
      const fromModel = !!group.userData.fromModel;
      scenes.A.add(group);
      A.root = group;

      /* --- 若用原生模型动画，挂 AnimationMixer --- */
      if (animations && animations.length) {
        A.mixer = new THREE.AnimationMixer(group);
        animations.forEach((clip) => A.mixer.clipAction(clip).play());
        console.log('[课件] 场景A 原生动画：' + animations.map((c) => c.name).join(', '));
      }

      /* --- 生成 6 个中文标签 --- */
      const box = new THREE.Box3().setFromObject(group);
      const nodes = group.userData.nodes || {};
      DEF_A.forEach((def) => {
        let obj = null;
        if (fromModel) {
          const kw = {
            nose: ['nose', 'nasal', 'head', 'mouth', '鼻'],
            trachea: ['trachea', 'windpipe', '气管'],
            bronchus: ['bronch', '支气管'],
            lungR: ['lung_r', 'rightlung', 'lungr', '右肺'],
            lungL: ['lung_l', 'leftlung', 'lungl', '左肺'],
            alveoli: ['alveol', '肺泡']
          }[def.key];
          obj = findNodeByName(group, kw);
        } else {
          obj = nodes[def.key];
        }
        // 模型自带节点 → 用它的包围盒中心做锚点；否则用预设锚点
        let anchor = def.anchor.clone();
        if (fromModel) {
          if (obj) {
            const b = new THREE.Box3().setFromObject(obj);
            if (!b.isEmpty()) anchor = b.getCenter(new THREE.Vector3());
          } else {
            const rel = { nose: [0, 0.92, 0.3], trachea: [-0.32, 0.18, 0.2], bronchus: [0.34, -0.02, 0.2],
              lungR: [-0.8, -0.05, 0.2], lungL: [0.8, -0.05, 0.2], alveoli: [0.85, -0.72, 0.45] }[def.key];
            anchor = guessAnchor(box, rel);
          }
        }
        const label = createLabel(def.text, def.card, anchor, (on) => focusParts([def.key], on));
        scenes.A.add(label.obj);
        // 注意：node 是三维部位对象，labelObj 是 CSS2D 标签对象，两者分开存
        A.parts[def.key] = { node: obj, el: label.el, labelObj: label.obj, highlighted: false };
      });

      /* --- 空气路径：发光的路径线 + 拖尾粒子 --- */
      A.curves = buildAirCurves();
      A.curves.forEach((curve) => {
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 90, 0.016, 8, false),
          new THREE.MeshBasicMaterial({
            color: COLOR.primary, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
          })
        );
        scenes.A.add(tube);
        A.flowTubes.push(tube);
      });

      const HEADS = 7, TRAIL = 10;
      A.flow = createParticleField(A.curves.length * HEADS * TRAIL, GLOW);
      scenes.A.add(A.flow.points);
      A.flowHeads = HEADS;
      A.flowTrail = TRAIL;
      A.flowColor = new THREE.Color(COLOR.primary);
    });
  }

  /** 场景A：更新气流粒子 */
  function updateAirFlow(dt) {
    if (!A.flowActive || !A.flow) return;
    A.flowT += dt;
    const DUR = 4.0;                 // 全程约 4 秒
    const f = A.flow;
    let idx = 0;
    for (let c = 0; c < A.curves.length; c++) {
      const curve = A.curves[c];
      for (let h = 0; h < A.flowHeads; h++) {
        const head = (A.flowT / DUR) * 1.14 - h * 0.026;
        for (let k = 0; k < A.flowTrail; k++) {
          const u = head - k * 0.0055;
          if (u < 0 || u > 1) { f.hide(idx++); continue; }
          const p = curve.getPointAt(clamp(u, 0, 1));
          const fade = 1 - k / A.flowTrail;
          f.set(idx++, p.x, p.y, p.z, A.flowColor, fade * fade * 1.25, 0.16 + 0.22 * fade);
        }
      }
    }
    f.commit();
    f.points.visible = true;

    // 路径线淡入淡出
    const op = clamp(Math.sin(Math.PI * clamp(A.flowT / (DUR + 0.8), 0, 1)), 0, 1) * 0.35;
    A.flowTubes.forEach((t) => { t.material.opacity = op; });

    if (A.flowT > DUR + 0.9) {        // 一次演示结束
      A.flowActive = false;
      f.points.visible = false;
      $('#btnAirflow').classList.remove('is-on');
      maybeAutoQuiz('A');
    }
  }

  /** 触发「空气路径演示」 */
  function playAirFlow() {
    if (!A.flow) return;
    A.flowT = 0;
    A.flowActive = true;
    $('#btnAirflow').classList.add('is-on');
    setFocusKeys([]);
  }

  /* ==========================================================================
   * 5. ===== 场景B：吸气 / 呼气运动 =====
   * ========================================================================*/
  const B = {
    breath: 0.15,      // 0 = 呼气末，1 = 吸气末
    target: 0.15,
    auto: false,
    parts: null,
    mixer: null
  };

  function buildFallbackB() {
    const g = new THREE.Group();

    /* --- 脊柱 --- */
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.3, 14), matBone());
    spine.position.set(0, 0.05, -0.55);

    /* --- 肋骨（7 对半环） --- */
    const ribs = new THREE.Group();
    const ribsList = [];
    for (let i = 0; i < 7; i++) {
      const r = 0.92 - i * 0.042;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.032, 8, 30, Math.PI * 1.02), matBone());
      rib.rotation.x = Math.PI / 2 + 0.2;     // 平放并让前端略微下倾
      rib.position.y = 0.88 - i * 0.29;
      ribs.add(rib);
      ribsList.push(rib);
    }

    /* --- 胸骨 --- */
    const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.05, 0.1), matBone());
    sternum.position.set(0, 0.12, 0.9);
    sternum.rotation.x = -0.14;

    /* --- 膈肌（穹隆状，吸气时下降变平） --- */
    const diaphragm = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 44, 22, 0, Math.PI * 2, 0, Math.PI / 2),
      matMuscle()
    );
    diaphragm.scale.set(0.95, 0.55, 0.82);
    diaphragm.position.set(0, -0.92, 0);

    /* --- 肺（左右各一） --- */
    const lungs = new THREE.Group();
    const lungR = new THREE.Mesh(new THREE.SphereGeometry(0.5, 34, 24), matTissue());
    lungR.scale.set(0.62, 1.12, 0.52);
    lungR.position.set(-0.42, 0.1, 0);
    lungR.rotation.z = 0.08;
    const lungL = new THREE.Mesh(new THREE.SphereGeometry(0.5, 34, 24), matTissue());
    lungL.scale.set(0.58, 1.12, 0.50);
    lungL.position.set(0.42, 0.1, 0);
    lungL.rotation.z = -0.08;
    lungs.add(lungR, lungL);

    /* --- 气管与支气管（不随肺缩放） --- */
    const airway = new THREE.Group();
    airway.add(makeTube(V(0, 1.42, 0), V(0, 0.62, 0), 0.085, matAirway(), 18));
    [-1, 1].forEach((s) => airway.add(makeTube(V(0, 0.64, 0), V(s * 0.36, 0.3, 0), 0.058, matAirway(), 14)));

    g.add(spine, ribs, sternum, diaphragm, lungs, airway);
    g.userData.parts = { ribs: ribsList, sternum, diaphragm, lungs, lungR, lungL };
    return g;
  }

  function initSceneB() {
    loadModelOrFallback('B', 3.0, buildFallbackB, (group, animations) => {
      scenes.B.add(group);
      B.root = group;
      B.parts = group.userData.parts || null;

      /* 若模型自带骨骼/节点动画，优先用 AnimationMixer 调用原生动画 */
      if (animations && animations.length) {
        B.mixer = new THREE.AnimationMixer(group);
        B.clips = animations;
        B.action = B.mixer.clipAction(animations[0]);
        B.action.play();
        B.action.paused = true;
        console.log('[课件] 场景B 原生动画：' + animations.map((c) => c.name).join(', '));
      }

      if (B.parts) {
        B.parts.baseLungScale = B.parts.lungR.scale.clone();
        B.parts.baseDiaY = B.parts.diaphragm.position.y;
        B.parts.baseDiaSy = B.parts.diaphragm.scale.y;
        B.parts.baseRibRot = B.parts.ribs.map((r) => r.rotation.x);
        B.parts.baseSternumZ = B.parts.sternum.position.z;
        B.parts.baseSternumY = B.parts.sternum.position.y;
      }
      applyBreath(B.breath);
    });
  }

  /** 把 breath(0~1) 应用到模型：肺放大 + 膈肌下降 + 肋骨上提 */
  function applyBreath(v) {
    if (B.mixer && B.action) {          // 原生动画优先
      const clip = B.action.getClip();
      B.action.time = clip.duration * v;
      B.mixer.update(0);
    }
    const p = B.parts;
    if (!p) return;
    const k = 1 + 0.25 * v;             // 肺 group scale 1.0 → 1.25
    p.lungs.scale.setScalar(k);
    p.diaphragm.position.y = p.baseDiaY - 0.34 * v;   // 膈肌下降
    p.diaphragm.scale.y = p.baseDiaSy * (1 - 0.42 * v); // 并变平
    p.ribs.forEach((rib, i) => {
      rib.rotation.x = p.baseRibRot[i] - 0.11 * v;    // 肋骨上提
      rib.scale.set(1 + 0.055 * v, 1 + 0.055 * v, 1); // 胸廓前后左右扩大
    });
    p.sternum.position.z = p.baseSternumZ + 0.12 * v;
    p.sternum.position.y = p.baseSternumY + 0.07 * v;
  }

  /** 呼吸状态机推进 */
  function updateBreath(dt) {
    const speed = 0.5;                  // 2 秒走完 0↔1
    const diff = B.target - B.breath;
    if (Math.abs(diff) > 0.001) {
      const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
      B.breath += step;
      applyBreath(B.breath);
      if (Math.abs(B.target - B.breath) <= 0.001) {
        B.breath = B.target;
        applyBreath(B.breath);
        if (B.auto) {
          B.autoTimer = 0.25;           // 到位后短暂停顿再换向
        } else {
          maybeAutoQuiz('B');
        }
      }
    } else if (B.auto) {
      B.autoTimer = (B.autoTimer || 0) - dt;
      if (B.autoTimer <= 0) B.target = B.target > 0.5 ? 0.05 : 1;
    }
    updateStatusBig();
  }

  /** 场景B 大字状态提示 */
  function updateStatusBig() {
    const el = $('#statusBig');
    if (current !== 'B' || demo.on) { el.classList.remove('show'); return; }
    const moving = Math.abs(B.target - B.breath) > 0.01;
    if (!moving && !B.auto) {
      el.textContent = B.breath > 0.5 ? '吸气状态' : '呼气状态';
      el.classList.add('show');
      el.classList.toggle('inhale', B.breath > 0.5);
      return;
    }
    const inhaling = B.target > B.breath;
    el.textContent = inhaling ? '吸气中…' : '呼气中…';
    el.classList.add('show');
    el.classList.toggle('inhale', inhaling);
  }

  const doInhale = () => { B.target = 1; B.auto = false; $('#btnAuto').classList.remove('is-on'); };
  const doExhale = () => { B.target = 0.05; B.auto = false; $('#btnAuto').classList.remove('is-on'); };
  function toggleAuto() {
    B.auto = !B.auto;
    $('#btnAuto').classList.toggle('is-on', B.auto);
    if (B.auto) { B.target = B.target > 0.5 ? 0.05 : 1; B.autoTimer = 0; }
  }

  /* ==========================================================================
   * 6. ===== 场景C：肺泡气体交换 =====
   * ========================================================================*/
  const C = { gasOn: false, sites: [], arrows: [], o2: null, co2: null };

  function buildFallbackC() {
    const g = new THREE.Group();

    /* --- 半透明肺泡囊（外膜） --- */
    const sac = new THREE.Mesh(new THREE.SphereGeometry(1.0, 52, 36), matSac(0.2));
    /* --- 内部葡萄串状的肺泡小囊 --- */
    const inner = new THREE.Group();
    const innerMat = matSac(0.3);
    const spots = [
      [0, 0.18, 0, 0.42], [0.42, -0.1, 0.18, 0.34], [-0.4, -0.05, 0.2, 0.33],
      [0.12, -0.42, -0.28, 0.3], [-0.2, 0.08, -0.42, 0.31], [0.3, 0.42, -0.2, 0.26]
    ];
    spots.forEach(([x, y, z, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), innerMat);
      s.position.set(x, y, z);
      inner.add(s);
    });
    /* --- 进入肺泡的细支气管 --- */
    const airway = new THREE.Group();
    airway.add(makeTube(V(0, 1.58, 0), V(0, 1.02, 0), 0.085, matAirway(), 18));
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 10, 22), matAirway());
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.0;

    /* --- 缠绕在肺泡外的毛细血管 --- */
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const u = i / 160;
      const theta = 0.24 * Math.PI + u * 0.60 * Math.PI;   // 从上绕到下
      const phi = u * Math.PI * 5.4;                        // 绕约 2.7 圈
      const r = 1.3 + Math.sin(u * Math.PI * 3) * 0.05;
      pts.push(V(r * Math.sin(theta) * Math.cos(phi), r * Math.cos(theta), r * Math.sin(theta) * Math.sin(phi)));
    }
    const vessel = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.075, 14, false),
      matVessel()
    );
    // 血管两端的进出段
    const inSeg = makeTube(V(-1.72, 1.12, -0.32), V(-1.22, 0.86, -0.26), 0.07, matVessel(), 12);
    const outSeg = makeTube(V(1.22, -0.86, 0.26), V(1.72, -1.12, 0.32), 0.07, matVessel(), 12);

    g.add(sac, inner, airway, collar, vessel, inSeg, outSeg);
    // 供粒子穿膜使用：肺泡半径与中心（换成真实模型时按包围盒估算）
    g.userData.sacRadius = 1.0;
    g.userData.sacCenter = new THREE.Vector3(0, 0, 0);
    return g;
  }

  function initSceneC() {
    loadModelOrFallback('C', 2.6, buildFallbackC, (group) => {
      scenes.C.add(group);
      C.root = group;

      /* --- 肺泡半径与中心：程序化模型用约定值，真实模型用包围盒估算 --- */
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      C.center = group.userData.sacCenter
        ? group.userData.sacCenter.clone()
        : box.getCenter(new THREE.Vector3());
      C.radius = group.userData.sacRadius
        ? group.userData.sacRadius
        : Math.max(size.x, size.y, size.z) * 0.42;

      /* --- 16 个交换位点（斐波那契球面分布） --- */
      const N = 16;
      C.sites = [];
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const r = Math.sqrt(Math.max(1 - y * y, 0));
        const th = i * 2.399963;
        C.sites.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize());
      }

      /* --- O₂（蓝）与 CO₂（红）粒子场 --- */
      const PER = 5;
      const cnt = N * PER;
      C.o2 = createParticleField(cnt, GLOW);
      C.co2 = createParticleField(cnt, GLOW);
      C.o2.points.renderOrder = 3;
      C.co2.points.renderOrder = 3;
      scenes.C.add(C.o2.points, C.co2.points);
      C.o2Color = new THREE.Color(COLOR.o2);
      C.co2Color = new THREE.Color(COLOR.co2);
      C.jitter = [];
      for (let i = 0; i < cnt; i++) {
        C.jitter.push(new THREE.Vector3(
          (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16
        ));
      }
      C.per = PER;

      /* --- 方向箭头：蓝色向外（O₂ 出肺泡），红色向内（CO₂ 进肺泡） --- */
      const mkArrow = (siteIdx, outward, color) => {
        const d = C.sites[siteIdx].clone().multiplyScalar(C.radius);
        const a = outward ? d.clone().multiplyScalar(1.25) : d.clone().multiplyScalar(2.05);
        const b = outward ? d.clone().multiplyScalar(2.05) : d.clone().multiplyScalar(1.25);
        const arrow = makeArrow(a, b, color);
        scenes.C.add(arrow);
        C.arrows.push(arrow);
        return arrow;
      };
      mkArrow(2, true, COLOR.o2);
      mkArrow(10, true, COLOR.o2);
      mkArrow(6, false, COLOR.co2);
      mkArrow(14, false, COLOR.co2);

      /* --- 气体方向标签 --- */
      const l1 = createGasLabel('O₂ 肺泡 → 血液', C.sites[2].clone().multiplyScalar(C.radius * 2.35), 'o2');
      const l2 = createGasLabel('CO₂ 血液 → 肺泡', C.sites[6].clone().multiplyScalar(C.radius * 2.35), 'co2');
      scenes.C.add(l1, l2);
    });
  }

  function createGasLabel(text, pos, kind) {
    const el = document.createElement('div');
    el.className = 'label3d gas';
    el.innerHTML = `<div class="pill ${kind}"><span class="p-dot"></span><span>${text}</span></div>`;
    const obj = new CSS2DObject(el);
    obj.position.copy(pos);
    el.style.pointerEvents = 'none';
    return obj;
  }

  /** 场景C：更新 O₂ / CO₂ 粒子 */
  function updateGas(t) {
    if (!C.o2 || !C.co2) return;      // 场景 C 还在加载时直接跳过
    const on = C.gasOn;
    C.o2.points.visible = on;
    C.co2.points.visible = on;
    if (!on) return;

    const R0 = C.radius * 0.42, R1 = C.radius * 1.55;
    const speed = 0.36;
    const jitterScale = 0.9 + 0.35 * Math.sin(t * 2.2);

    for (let i = 0; i < C.o2.count; i++) {
      const site = C.sites[i % C.sites.length];
      const k = Math.floor(i / C.sites.length);
      const phase = k / C.per + (i % C.sites.length) * 0.037;
      const u = (t * speed + phase) % 1;
      const j = C.jitter[i];

      // O₂：肺泡 → 血液（由内向外）
      let r = lerp(R0, R1, u);
      let a = Math.sin(Math.PI * u);
      C.o2.set(i,
        C.center.x + site.x * r + j.x * jitterScale,
        C.center.y + site.y * r + j.y * jitterScale,
        C.center.z + site.z * r + j.z * jitterScale,
        C.o2Color, 0.35 + 0.9 * a, 0.18 + 0.20 * a);

      // CO₂：血液 → 肺泡（由外向内）
      r = lerp(R1, R0, u);
      a = Math.sin(Math.PI * u);
      C.co2.set(i,
        C.center.x + site.x * r + j.x * jitterScale,
        C.center.y + site.y * r + j.y * jitterScale,
        C.center.z + site.z * r + j.z * jitterScale,
        C.co2Color, 0.35 + 0.9 * a, 0.18 + 0.20 * a);
    }
    C.o2.commit();
    C.co2.commit();

    /* 箭头脉冲，强化方向感 */
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 3));
    C.arrows.forEach((a) => { a.userData.mat.opacity = pulse; a.scale.setScalar(0.95 + 0.08 * pulse); });
  }

  function setGas(on) {
    C.gasOn = on;
    $('#btnGas').classList.toggle('is-on', on);
    if (on) { C.gasStart = C.gasStart || performance.now() / 1000; }
    if (on) setTimeout(() => maybeAutoQuiz('C'), 4000);
  }

  /* ==========================================================================
   * 标签系统（CSS2DRenderer）
   * ========================================================================*/
  /**
   * 创建一个中文 3D 标签：点击 → 部位高亮 + 弹出知识卡
   */
  function createLabel(text, card, anchor, onToggle) {
    const el = document.createElement('div');
    el.className = 'label3d';
    el.innerHTML =
      `<div class="pill"><span class="p-dot"></span><span>${text}</span></div>` +
      `<div class="kb-card"><h4>${card.title}</h4><p>${card.text}</p></div>`;
    const obj = new CSS2DObject(el);
    obj.position.copy(anchor);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = !el.classList.contains('is-on');
      onToggle(on);
    });
    return { el, obj };
  }

  /** 高亮准备：克隆材质，避免污染共享材质 */
  function prepareHighlight(part) {
    if (part.mats || !part.obj) return;
    part.mats = [];
    part.obj.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (!o.userData.__cloned) {
        o.material = o.material.clone();
        o.userData.__cloned = true;
      }
      const m = o.material;
      if (!m.emissive) return;
      part.mats.push({ m, base: m.emissive.clone(), baseInt: m.emissiveIntensity });
    });
  }

  /** 设置某部位高亮（emissive 变色 + 循环里做脉冲） */
  function setHighlight(key, on) {
    const part = A.parts[key];
    if (!part) return;
    prepareHighlight(part);
    (part.mats || []).forEach((rec) => {
      if (on) {
        rec.m.emissive.setHex(COLOR.highlight);
        rec.m.emissiveIntensity = 0.45;
      } else {
        rec.m.emissive.copy(rec.base);
        rec.m.emissiveIntensity = rec.baseInt;
      }
    });
    part.highlighted = on;
    if (part.el) part.el.classList.toggle('is-on', on);
  }

  /** 聚焦若干部位（清空其它） */
  function setFocusKeys(keys) {
    Object.keys(A.parts).forEach((k) => {
      const on = keys.includes(k);
      setHighlight(k, on);
      if (A.parts[k].el) {
        const card = A.parts[k].el.querySelector('.kb-card');
        if (card) card.classList.toggle('show', on);
      }
    });
  }

  /** 点击标签时的回调 */
  function focusParts(keys, on) {
    setFocusKeys(on ? keys : []);
  }

  /* ==========================================================================
   * 7. 场景切换与相机运动
   * ========================================================================*/
  const PANEL = {
    A: {
      title: '呼吸系统整体结构',
      body:
        '<div class="sec"><span class="sec-t">呼吸系统组成</span>' +
        '<ul><li><b>呼吸道</b>：鼻 → 咽 → 喉 → 气管 → 支气管</li>' +
        '<li><b>肺</b>：气体交换的主要场所</li></ul></div>' +
        '<div class="sec"><span class="sec-t orange">结构要点</span>' +
        '<ul><li>鼻腔：鼻毛挡灰、黏液湿润温暖空气</li>' +
        '<li>气管：C 形软骨环支撑，保持气道畅通</li>' +
        '<li>肺泡：数量多、壁极薄、毛细血管丰富</li></ul></div>',
      tip: '点击模型上的中文标签查看知识卡；点「空气路径演示」看一次完整的气流走向。'
    },
    B: {
      title: '吸气与呼气运动',
      body:
        '<div class="sec"><span class="sec-t">吸气</span>' +
        '<p class="kv">胸腔扩大（膈肌<span class="flow">下降</span>、肋骨上提）→ 肺扩张 → ' +
        '肺内气压 <span class="flow">&lt; 大气压</span> → 外界空气进入肺。</p></div>' +
        '<div class="sec"><span class="sec-t orange">呼气</span>' +
        '<p class="kv">胸腔缩小（膈肌<span class="flow">上升</span>、肋骨下降）→ 肺回缩 → ' +
        '肺内气压 <span class="flow">&gt; 大气压</span> → 气体排出体外。</p></div>',
      tip: '呼吸运动靠呼吸肌（肋间肌、膈肌）的收缩与舒张完成，肺本身不主动收缩。'
    },
    C: {
      title: '肺泡气体交换',
      body:
        '<div class="sec"><span class="sec-t">O₂（蓝）</span>' +
        '<p class="kv">肺泡 → 血液：穿过肺泡壁与毛细血管壁进入血液，与血红蛋白结合，运往全身。</p></div>' +
        '<div class="sec"><span class="sec-t orange">CO₂（红）</span>' +
        '<p class="kv">血液 → 肺泡：细胞代谢产生的废物，经血液运到肺泡，随呼气排出体外。</p></div>' +
        '<div class="sec"><span class="sec-t">原理</span>' +
        '<p class="kv">气体总是由浓度高的地方向浓度低的地方扩散，直到平衡。</p></div>',
      tip: '肺泡壁与毛细血管壁都只有一层细胞，总厚度极薄，有利于气体快速扩散。'
    }
  };

  let camTween = null;

  function tweenCamera(home, dur) {
    camTween = {
      t: 0, dur: dur || 0.5,
      p0: camera.position.clone(), p1: home.p.clone(),
      t0: controls.target.clone(), t1: home.t.clone()
    };
  }

  function updateCamTween(dt) {
    if (!camTween) return;
    camTween.t += dt;
    const k = easeInOut(clamp(camTween.t / camTween.dur, 0, 1));
    camera.position.lerpVectors(camTween.p0, camTween.p1, k);
    controls.target.lerpVectors(camTween.t0, camTween.t1, k);
    if (k >= 1) camTween = null;
    controls.update();
  }

  /** 切换到指定场景 */
  function goScene(key) {
    current = key;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-active', b.dataset.scene === key));
    $('#toolsA').hidden = key !== 'A';
    $('#toolsB').hidden = key !== 'B';
    $('#toolsC').hidden = key !== 'C';
    $('#legendGas').hidden = key !== 'C';
    $('#sceneTag').textContent = { A: '场景 A · 呼吸系统结构', B: '场景 B · 呼吸运动', C: '场景 C · 肺泡气体交换' }[key];
    $('#panelTitle').textContent = PANEL[key].title;
    $('#panelBody').innerHTML = PANEL[key].body;
    $('#panelTip').textContent = PANEL[key].tip;
    if (key !== 'B') $('#statusBig').classList.remove('show');
    tweenCamera(CAM_HOME[key], 0.5);
  }

  /* ==========================================================================
   * 8. 随堂选择题（每个场景 2 题，共 6 题）
   * ========================================================================*/
  const QUESTIONS = [
    {
      id: 'A1', scene: 'A',
      q: '气管壁上「C」形软骨环的主要作用是？',
      options: ['进行气体交换', '支撑气管，保持气道畅通', '分泌黏液溶解细菌', '推动气流快速进出'],
      answer: 1,
      explain: 'C 形软骨环像一圈圈"支架"，保证气管在呼吸时不会被压瘪，从而保持气道畅通。'
    },
    {
      id: 'A2', scene: 'A',
      q: '外界空气进入肺泡，依次经过的结构是？',
      options: ['鼻 → 咽 → 喉 → 气管 → 支气管 → 肺', '鼻 → 气管 → 喉 → 支气管 → 肺',
        '口 → 气管 → 支气管 → 肺泡 → 喉', '气管 → 支气管 → 咽 → 鼻 → 肺'],
      answer: 0,
      explain: '呼吸道顺序为：鼻 → 咽 → 喉 → 气管 → 支气管 → 肺（肺泡）。'
    },
    {
      id: 'B1', scene: 'B',
      q: '吸气时，肺内气压与大气压的关系是？',
      options: ['肺内气压大于大气压', '肺内气压小于大气压', '两者始终相等', '与气压无关'],
      answer: 1,
      explain: '吸气时胸腔扩大、肺扩张，肺内气压低于大气压，外界空气顺压力差进入肺。'
    },
    {
      id: 'B2', scene: 'B',
      q: '吸气时，膈肌的状态是？',
      options: ['舒张并上升', '收缩并下降', '保持不变', '先上升后下降'],
      answer: 1,
      explain: '吸气时膈肌收缩，穹隆顶部下降、变得平坦，使胸腔上下径增大。'
    },
    {
      id: 'C1', scene: 'C',
      q: '肺泡中 O₂（氧气）的扩散方向是？',
      options: ['血液 → 肺泡', '肺泡 → 血液', '肺泡 → 气管', '血液 → 心脏'],
      answer: 1,
      explain: '肺泡中氧浓度高于血液，O₂ 由肺泡扩散进入血液，与血红蛋白结合运往全身。'
    },
    {
      id: 'C2', scene: 'C',
      q: '下列哪一项不是肺泡适于气体交换的特点？',
      options: ['肺泡数量多，总面积大', '肺泡壁和毛细血管壁都很薄',
        '肺泡外缠绕丰富的毛细血管', '肺泡壁由多层上皮细胞构成'],
      answer: 3,
      explain: '肺泡壁只由一层上皮细胞构成，壁薄才有利于气体快速扩散；"多层细胞"会阻碍交换。'
    }
  ];

  const answered = new Set();
  const autoQuizDone = { A: false, B: false, C: false };
  let curQ = null;

  function updateProgress() {
    $('#quizProgress').textContent = `随堂练习进度 ${answered.size} / 6`;
  }

  /** 讲解完一个知识点后自动弹题（只弹一次，且不阻塞流程） */
  function maybeAutoQuiz(sceneKey) {
    if (demo.on || autoQuizDone[sceneKey]) return;
    if (!$('#quizModal').hidden) return;
    autoQuizDone[sceneKey] = true;
    setTimeout(() => openQuiz(sceneKey), 500);
  }

  function openQuiz(sceneKey) {
    if (demo.on) return;
    const pending = QUESTIONS.filter((q) => q.scene === sceneKey && !answered.has(q.id));
    if (!pending.length) {
      $('#panelTip').textContent = '本场景的随堂练习已全部完成，可继续探索模型或切换场景。';
      return;
    }
    showQuestion(pending[0]);
  }

  function showQuestion(q) {
    curQ = q;
    $('#quizModal').hidden = false;
    $('#quizTag').textContent = '场景 ' + q.scene;
    $('#quizCount').textContent = `第 ${answered.size + 1} / 6 题`;
    $('#quizQuestion').textContent = q.q;
    $('#quizFeedback').textContent = '';
    $('#quizFeedback').className = 'quiz-feedback';
    const box = $('#quizOptions');
    box.innerHTML = '';
    q.options.forEach((text, i) => {
      const b = document.createElement('button');
      b.className = 'q-opt';
      b.innerHTML = `<span class="q-key">${'ABCD'[i]}</span>${text}`;
      b.addEventListener('click', () => onAnswer(q, i, b));
      box.appendChild(b);
    });
  }

  function onAnswer(q, i, btn) {
    const opts = Array.from($('#quizOptions').children);
    const fb = $('#quizFeedback');
    if (i === q.answer) {
      btn.classList.add('right');
      opts.forEach((b) => { b.disabled = true; });
      fb.className = 'quiz-feedback ok';
      fb.textContent = '回答正确！' + q.explain;
      answered.add(q.id);
      updateProgress();
      setTimeout(() => {
        if (answered.size === QUESTIONS.length) {
          $('#quizModal').hidden = true;
          $('#finishModal').hidden = false;
          return;
        }
        const next = QUESTIONS.filter((x) => x.scene === q.scene && !answered.has(x.id));
        if (next.length) showQuestion(next[0]);
        else $('#quizModal').hidden = true;
      }, 1700);
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      fb.className = 'quiz-feedback no';
      fb.textContent = '再想一想～ 解析：' + q.explain + '（可以重新选择其它选项）';
    }
  }

  /* ==========================================================================
   * 9. 演示模式（25 秒时间轴，用于录制短视频）
   * ========================================================================*/
  const DEMO_TL = [
    { t: 0.0, fn: () => { goScene('A'); } },
    { t: 0.4, fn: () => setFocusKeys(['nose']) },
    { t: 2.0, fn: () => setFocusKeys(['trachea']) },
    { t: 4.0, fn: () => setFocusKeys(['bronchus']) },
    { t: 6.0, fn: () => setFocusKeys(['lungR', 'lungL']) },
    { t: 8.0, fn: () => { setFocusKeys([]); goScene('B'); } },
    { t: 8.6, fn: () => doInhale() },
    { t: 10.8, fn: () => doExhale() },
    { t: 13.0, fn: () => { if (!B.auto) toggleAuto(); } },
    { t: 15.0, fn: () => { goScene('C'); setGas(true); } },
    { t: 23.0, fn: () => showEnding() },
    { t: 25.0, fn: () => stopDemo() }
  ];

  const demo = { on: false, t0: 0, fired: null, exitBound: false };

  function startDemo() {
    if (demo.on) return;
    demo.on = true;
    demo.fired = new Set();
    demo.t0 = performance.now();
    $('#quizModal').hidden = true;
    $('#demoOverlay').hidden = false;
    document.body.classList.add('demo-mode');
    B.auto = false;
    $('#btnAuto').classList.remove('is-on');
    // 避免"点击开始"这一下立刻被当成退出
    setTimeout(() => {
      demo.exitBound = true;
      window.addEventListener('pointerdown', stopDemo);
    }, 400);
  }

  function showEnding() {
    const el = $('#demoEnd');
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
  }

  function stopDemo() {
    if (!demo.on) return;
    demo.on = false;
    if (demo.exitBound) window.removeEventListener('pointerdown', stopDemo);
    demo.exitBound = false;
    document.body.classList.remove('demo-mode');
    $('#demoOverlay').hidden = true;
    const el = $('#demoEnd');
    el.classList.remove('show');
    el.hidden = true;
    B.auto = false;
    $('#btnAuto').classList.remove('is-on');
    setGas(false);
    setFocusKeys([]);
    goScene('A');
    updateStatusBig();
  }

  function tickDemo() {
    if (!demo.on) return;
    const t = (performance.now() - demo.t0) / 1000;
    DEMO_TL.forEach((item, i) => {
      if (t >= item.t && !demo.fired.has(i)) {
        demo.fired.add(i);
        try { item.fn(); } catch (e) { console.warn('[演示模式] 步骤执行出错', e); }
      }
    });
  }

  /* ==========================================================================
   * 10. 主循环与事件绑定
   * ========================================================================*/
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    updateCamTween(dt);
    if (!camTween) controls.update();

    /* 高亮脉冲 */
    Object.keys(A.parts).forEach((k) => {
      const p = A.parts[k];
      if (p.highlighted && p.mats) {
        const v = 0.35 + 0.32 * Math.sin(t * 5);
        p.mats.forEach((rec) => { rec.m.emissiveIntensity = v; });
      }
    });

    updateAirFlow(dt);
    if (current === 'B') updateBreath(dt);
    updateGas(t);
    if (A.mixer) A.mixer.update(dt);

    tickDemo();

    const s = scenes[current];
    renderer.render(s, camera);
    labelRenderer.render(s, camera);
  }

  /* ---- 事件绑定 ---- */
  document.querySelectorAll('.tab').forEach((b) => {
    b.addEventListener('click', () => goScene(b.dataset.scene));
  });
  $('#btnDemo').addEventListener('click', startDemo);

  $('#btnAirflow').addEventListener('click', playAirFlow);
  $('#btnResetA').addEventListener('click', () => tweenCamera(CAM_HOME.A, 0.5));

  $('#btnInhale').addEventListener('click', doInhale);
  $('#btnExhale').addEventListener('click', doExhale);
  $('#btnAuto').addEventListener('click', toggleAuto);
  $('#btnResetB').addEventListener('click', () => tweenCamera(CAM_HOME.B, 0.5));

  $('#btnGas').addEventListener('click', () => setGas(!C.gasOn));
  $('#btnResetC').addEventListener('click', () => tweenCamera(CAM_HOME.C, 0.5));

  $('#btnQuizA').addEventListener('click', () => openQuiz('A'));
  $('#btnQuizB').addEventListener('click', () => openQuiz('B'));
  $('#btnQuizC').addEventListener('click', () => openQuiz('C'));
  $('#btnQuizClose').addEventListener('click', () => { $('#quizModal').hidden = true; });
  $('#btnFinishClose').addEventListener('click', () => { $('#finishModal').hidden = true; });

  /* 双击画布：相机在 0.5s 内平滑回到初始位姿 */
  renderer.domElement.addEventListener('dblclick', () => tweenCamera(CAM_HOME[current], 0.5));

  /* ---- 启动 ---- */
  initSceneA();
  initSceneB();
  initSceneC();
  updateProgress();
  resize();
  animate();

  // 支持 ?scene=A/B/C 深链接到指定场景
  const _urlP = new URLSearchParams(location.search);
  const _initialScene = ['A', 'B', 'C'].includes(_urlP.get('scene')) ? _urlP.get('scene') : 'A';
  goScene(_initialScene);

  console.log('%c[课件] 初始化完成，three.js r' + THREE.REVISION, 'color:#4fd1c5');
  // 触发就绪事件，便于 index.html 的引导区接收并处理其它 URL 参数
  window.dispatchEvent(new CustomEvent('app-ready'));
})();
