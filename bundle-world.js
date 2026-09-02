// 9th Wall v4.54
(() => {
  var e = {
    574() {
      const e = () => {
        XR8.addCameraPipelineModule(LandingPage.pipelineModule()),

        // Registro del módulo de puntos condicionado de forma estricta por el estado debug
        DEBUG_VISUALS.slamPointCloud && XR8.addCameraPipelineModule({
          name: 'pointcloud-debugger-inner',
          onStart: () => {
            if (window.XR8) {
              // Habilitamos la extracción de características de puntos únicamente si la depuración está activa
              window.XR8.XrController.configure({ enableWorldPoints: true });
            }
          },
          onUpdate: (e) => {
            if (e.processCpuResult && e.processCpuResult.reality) {
              // Exponemos las coordenadas del SLAM globalmente para el componente 3D
              window.latestWorldPoints = e.processCpuResult.reality.worldPoints;
            }
          }
        }),

        LandingPage.configure({
          mediaSrc: "./assets/preview.jpg"
        })
      };
      window.XR8 ? e() : window.addEventListener("xrloaded", e)
    }
  },
  t = {};

  // Leemos el estado del interruptor debug persistido de forma transitoria
  const IS_DEBUG = sessionStorage.getItem("debug_features") === "true";

  // Nube de puntos SLAM activa en Debug
  const DEBUG_VISUALS = Object.freeze({
    slamPointCloud: IS_DEBUG
  });

  // Limpieza inmediata para garantizar que futuros refrescos arranquen siempre limpios
  sessionStorage.setItem("debug_features", "false");

  // Controles del modelo: rotación desacoplada y escala con umbral blindado (Scene Viewer / Quick Look spec)
  const MODEL_GESTURES = Object.freeze({
    minimumScale: 0.90,
    maximumScale: 1.20,
    rotationSensitivity: 6.0,
    scaleDeadzone: 0.085
  });

  // v4.54: retícula adaptativa ceñida a dimensión real (+1.2cm holgura) y fijada a Y=0 de suelo
  const DRAG_RETICLE_CONFIG = Object.freeze({
    liftHeight: 0.05,
    liftSmoothingRate: 8.0,
    dragActivationThreshold: 0.012,
    baseSize: 0.260,
    thickness: 0.016,
    cornerRadius: 0.035,
    color: 0x66ffff
  });

  // v4.47: Generación geométrica analítica determinista de marco plano (BufferGeometry directa sin booleanas ni Earcut)
  function crearGeometriaMarcoReticula(THREE_INSTANCE, sizeX, sizeZ, thickness, radius) {
    const sx = sizeX / 2;
    const sz = sizeZ / 2;
    const r = Math.min(radius, Math.min(sx, sz) * 0.45);
    const inSx = Math.max(0.01, sx - thickness);
    const inSz = Math.max(0.01, sz - thickness);
    const inR = Math.max(0.001, r - thickness);

    const segmentsPerCorner = 8;
    const outerPts = [];
    const innerPts = [];

    const cornersOuter = [
      { cx: sx - r, cz: -sz + r, startAngle: -Math.PI / 2, endAngle: 0 },
      { cx: sx - r, cz: sz - r, startAngle: 0, endAngle: Math.PI / 2 },
      { cx: -sx + r, cz: sz - r, startAngle: Math.PI / 2, endAngle: Math.PI },
      { cx: -sx + r, cz: -sz + r, startAngle: Math.PI, endAngle: (3 * Math.PI) / 2 }
    ];

    const cornersInner = [
      { cx: inSx - inR, cz: -inSz + inR, startAngle: -Math.PI / 2, endAngle: 0 },
      { cx: inSx - inR, cz: inSz - inR, startAngle: 0, endAngle: Math.PI / 2 },
      { cx: -inSx + inR, cz: inSz - inR, startAngle: Math.PI / 2, endAngle: Math.PI },
      { cx: -inSx + inR, cz: -inSz + inR, startAngle: Math.PI, endAngle: (3 * Math.PI) / 2 }
    ];

    for (let c = 0; c < 4; c++) {
      const co = cornersOuter[c];
      const ci = cornersInner[c];
      for (let i = 0; i <= segmentsPerCorner; i++) {
        if (i === 0 && c > 0) continue;
        const tVal = i / segmentsPerCorner;
        const angle = co.startAngle + tVal * (co.endAngle - co.startAngle);
        outerPts.push(co.cx + Math.cos(angle) * r, co.cz + Math.sin(angle) * r);
        innerPts.push(ci.cx + Math.cos(angle) * inR, ci.cz + Math.sin(angle) * inR);
      }
    }

    const count = outerPts.length / 2;
    const positions = new Float32Array(count * 2 * 3);
    const indices = [];

    for (let i = 0; i < count; i++) {
      positions[i * 6 + 0] = outerPts[i * 2 + 0];
      positions[i * 6 + 1] = outerPts[i * 2 + 1];
      positions[i * 6 + 2] = 0;

      positions[i * 6 + 3] = innerPts[i * 2 + 0];
      positions[i * 6 + 4] = innerPts[i * 2 + 1];
      positions[i * 6 + 5] = 0;

      const next = (i + 1) % count;
      const oCurr = i * 2;
      const iCurr = i * 2 + 1;
      const oNext = next * 2;
      const iNext = next * 2 + 1;

      indices.push(oCurr, oNext, iNext);
      indices.push(oCurr, iNext, iCurr);
    }

    const geom = new THREE_INSTANCE.BufferGeometry();
    geom.setAttribute('position', new THREE_INSTANCE.BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  function a(o) {
    var n = t[o];
    if (void 0 !== n) return n.exports;
    var i = t[o] = { exports: {} };
    return e[o](i, i.exports, a), i.exports
  }(() => {
    "use strict";
    a(574);
    const e = window.ecs;

    // v4.54: Spawner con soporte de animación de hundimiento, reemplazo en caliente y destrucción profunda de VRAM
    e.registerComponent({
      name: "dish-spawner",
      schema: { prefab: "eid" },
      stateMachine: ({ world: t, eid: a, schemaAttribute: schemaAttr, defineState: i }) => {
        let isPlaced = false;
        let spawnedEid = null;
        let currentDishMesh = null;

        const scaleDuration = 2000;    // 2000ms Escala (EaseOut Quadratic)
        const rotDuration = 3000;      // 3000ms Rotación total (EaseOut Quintic)
        const opacityDuration = 800;   // 800ms Opacidad rápida
        const totalSpinAngle = -Math.PI * 3;

        // Función de destrucción profunda de mallas y texturas (VRAM = 0)
        const destruirMallaProfunda = (meshNode) => {
          if (!meshNode) return;
          meshNode.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => {
                  for (const key in m) {
                    if (m[key] && m[key].isTexture) {
                      m[key].dispose();
                    }
                  }
                  m.dispose();
                });
              }
            }
          });
          if (meshNode.parent) {
            meshNode.parent.remove(meshNode);
          }
        };

        const dispararCinematicaSpawn = (rootTarget, baseRotY = 0) => {
          const spawnMaterials = [];

          if (t.three && t.three.scene) {
            t.three.scene.traverse((child) => {
              if (child.isMesh && child.material) {
                if (child.material.type === 'ShadowMaterial' || child.name === "Ground") {
                  child.material.opacity = 0.40;
                } else if (child.name !== "Ground" && child.name !== "Hider") {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach(m => {
                    if (m.type !== 'ShadowMaterial') {
                      m.transparent = true;
                      m.opacity = 0.0;
                      spawnMaterials.push(m);
                    }
                  });
                }
              }
            });
          }

          if (window.notificarSpawnIniciado) {
            window.notificarSpawnIniciado();
          }

          let spawnStartTime = performance.now();

          const animarSpawnCompleto = () => {
            const elapsed = performance.now() - spawnStartTime;

            const progressScale = Math.min(1.0, elapsed / scaleDuration);
            const easeScale = 1.0 - Math.pow(1.0 - progressScale, 2);
            const currentScaleVal = Math.max(0.001, easeScale);

            const progressRot = Math.min(1.0, elapsed / rotDuration);
            const easeRot = 1.0 - Math.pow(1.0 - progressRot, 5);
            const currentAngle = baseRotY + (totalSpinAngle * easeRot);

            const progressOpacity = Math.min(1.0, elapsed / opacityDuration);
            const easeOpacity = 1.0 - Math.pow(1.0 - progressOpacity, 2);
            spawnMaterials.forEach(m => {
              m.opacity = easeOpacity;
            });

            e.Scale.set(t, rootTarget, { x: currentScaleVal, y: currentScaleVal, z: currentScaleVal });
            t.getEntity(rootTarget).set(e.Quaternion, e.math.quat.yRadians(currentAngle));

            if (elapsed < rotDuration) {
              requestAnimationFrame(animarSpawnCompleto);
            } else {
              e.Scale.set(t, rootTarget, { x: 1.0, y: 1.0, z: 1.0 });
              t.getEntity(rootTarget).set(e.Quaternion, e.math.quat.yRadians(baseRotY + totalSpinAngle));
              spawnMaterials.forEach(m => {
                m.opacity = 1.0;
                m.transparent = false;
                m.depthWrite = true;
                m.needsUpdate = true;
              });
            }
          };
          requestAnimationFrame(animarSpawnCompleto);
        };

        i("initial").initial()
          .listen(t.events.globalId, "auto-place-dish", ev => {
            if (isPlaced) return;
            if (!ev.data || !ev.data.worldPosition) return;
            isPlaced = true;
            const prefabEid = schemaAttr.get(a).prefab;
            spawnedEid = t.createEntity(prefabEid);
            const d = t.getEntity(spawnedEid);

            const targetX = ev.data.worldPosition.x;
            const targetY = ev.data.worldPosition.y;
            const targetZ = ev.data.worldPosition.z;

            const baseRotY = Math.random() < 0.5 ? 0 : Math.PI;

            d.setLocalPosition({ x: targetX, y: targetY + 0.001, z: targetZ });
            e.Scale.set(t, spawnedEid, { x: 0.001, y: 0.001, z: 0.001 });
            d.set(e.Quaternion, e.math.quat.yRadians(baseRotY));

            let animationStarted = false;
            const comprobarMallaLista = () => {
              if (animationStarted) return;
              let encontrada = false;

              if (t.three && t.three.scene) {
                t.three.scene.traverse((child) => {
                  if (child.isMesh && child.geometry && child.geometry.attributes && child.geometry.attributes.position && child.geometry.attributes.position.count > 0 && child.name !== "Ground" && child.name !== "Hider" && (!child.material || child.material.type !== 'ShadowMaterial')) {
                    encontrada = true;
                    currentDishMesh = child;
                  }
                });
              }

              if (encontrada) {
                animationStarted = true;
                if (window.aplicarAjustesSceneViewer) {
                  window.aplicarAjustesSceneViewer(t.three.scene);
                }
                dispararCinematicaSpawn(spawnedEid, baseRotY);
              } else {
                requestAnimationFrame(comprobarMallaLista);
              }
            };
            requestAnimationFrame(comprobarMallaLista);
          })
          // v4.54: Cambio de modelo en caliente con hundimiento hacia el Hider y sustitución en VRAM
          .listen(t.events.globalId, "switch-dish-model", ev => {
            if (!isPlaced || !spawnedEid || !ev.data || !ev.data.modelSrc || !window.THREE) return;

            const rInstance = window.THREE;
            const dishPos = t.transform.getWorldPosition(spawnedEid);

            // 1. Medición de la altura del bounding box para el hundimiento
            let dishHeight = 0.15;
            if (t.three && t.three.scene) {
              const bBox = new rInstance.Box3();
              t.three.scene.traverse((child) => {
                if (child.isMesh && child.name !== "Ground" && child.name !== "Hider" && (!child.material || child.material.type !== 'ShadowMaterial')) {
                  bBox.expandByObject(child);
                }
              });
              const sz = new rInstance.Vector3();
              bBox.getSize(sz);
              if (sz.y > 0.02) dishHeight = sz.y;
            }

            // 2. Cinemática de Hundimiento (1.000 ms: Y -> -H, Opacidad 1.0 -> 0.5)
            const sinkStartTime = performance.now();
            const sinkDuration = 1000;
            const startY = dishPos.y;
            const targetSinkY = startY - dishHeight - 0.02;

            const activeMats = [];
            if (t.three && t.three.scene) {
              t.three.scene.traverse((child) => {
                if (child.isMesh && child.name !== "Ground" && child.name !== "Hider" && child.material && child.material.type !== 'ShadowMaterial') {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach(m => { m.transparent = true; activeMats.push(m); });
                }
              });
            }

            const animarHundimiento = () => {
              const elapsed = performance.now() - sinkStartTime;
              const progress = Math.min(1.0, elapsed / sinkDuration);

              const currentY = rInstance.MathUtils.lerp(startY, targetSinkY, progress);
              const currentOpacity = rInstance.MathUtils.lerp(1.0, 0.5, progress);

              t.transform.setWorldPosition(spawnedEid, { x: dishPos.x, y: currentY, z: dishPos.z });
              activeMats.forEach(m => { m.opacity = currentOpacity; });

              if (progress < 1.0) {
                requestAnimationFrame(animarHundimiento);
              } else {
                // 3. Destrucción profunda del modelo saliente (VRAM limpia)
                if (t.three && t.three.scene) {
                  const nodosBorrar = [];
                  t.three.scene.traverse((child) => {
                    if (child.name === "Model" || (child.isMesh && child.name !== "Ground" && child.name !== "Hider" && (!child.material || child.material.type !== 'ShadowMaterial'))) {
                      nodosBorrar.push(child);
                    }
                  });
                  nodosBorrar.forEach(n => destruirMallaProfunda(n));
                }

                // 4. Carga del nuevo GLTF en la posición de la mesa
                const loader = (window.THREE.GLTFLoader) ? new window.THREE.GLTFLoader() : null;
                if (loader && t.three && t.three.scene) {
                  loader.load(ev.data.modelSrc, (gltf) => {
                    const newModel = gltf.scene;
                    newModel.name = "Model";

                    t.transform.setWorldPosition(spawnedEid, { x: dishPos.x, y: 0.001, z: dishPos.z });
                    e.Scale.set(t, spawnedEid, { x: 0.001, y: 0.001, z: 0.001 });

                    t.three.scene.add(newModel);

                    if (window.aplicarAjustesSceneViewer) {
                      window.aplicarAjustesSceneViewer(t.three.scene);
                    }

                    dispararCinematicaSpawn(spawnedEid, 0);
                  });
                }
              }
            };
            requestAnimationFrame(animarHundimiento);
          });
      }
    });

    e.registerComponent({
      name: "model-gesture-controls",
      stateMachine: ({ world: t, eid: a, defineState: o }) => {
        let isTwoFingerGesture = !1,
        isModelTouchActive = !1,
        dragPointerId = null,
        dragPlaneY = 0.001,
        dragOffsetX = 0,
        dragOffsetZ = 0,
        activePointerIds = new Set(),
        waitForAllTouchesToEnd = !1,
        currentScale = 1,
        scaleAtGestureStart = 1,
        isDragActive = !1,
        reticleMesh = null,
        currentLift = 0,
        planarX = 0,
        planarZ = 0,
        lastLiftFrameTime = performance.now(),
        bboxSizeX = DRAG_RETICLE_CONFIG.baseSize,
        bboxSizeZ = DRAG_RETICLE_CONFIG.baseSize,
        reticleLocalCenterX = 0,
        reticleLocalCenterZ = 0,
        bboxCalculated = false;

        // v4.54: Medición de dimensiones por muestreo de vértices cacheada tras el primer cálculo (+1.2cm holgura)
        const actualizarBoundingBox = (THREE_INSTANCE) => {
          if (bboxCalculated || !t.three || !t.three.scene) return;

          t.three.scene.updateMatrixWorld(true);

          const nPos = t.transform.getWorldPosition(a);
          const dishWorldPos = new THREE_INSTANCE.Vector3(nPos.x, nPos.y, nPos.z);
          let qWorld = new THREE_INSTANCE.Quaternion(0, 0, 0, 1);
          if (e.Quaternion && e.Quaternion.has(t, a)) {
            const qData = e.Quaternion.get(t, a);
            qWorld.set(qData.x, qData.y, qData.z, qData.w);
          }
          const invQuat = qWorld.clone().invert();
          const invScale = 1.0 / Math.max(0.0001, currentScale);

          const unifiedBox = new THREE_INSTANCE.Box3();
          let hasGeom = false;
          const vTemp = new THREE_INSTANCE.Vector3();

          t.three.scene.traverse((child) => {
            if (
              child.isMesh &&
              child.geometry &&
              child.geometry.attributes &&
              child.geometry.attributes.position &&
              child.name !== "Ground" &&
              child.name !== "Hider" &&
              child !== reticleMesh &&
              (!child.material || child.material.type !== 'ShadowMaterial')
            ) {
              const posAttr = child.geometry.attributes.position;
              const stride = Math.max(1, Math.floor(posAttr.count / 300));
              const meshLocalBox = new THREE_INSTANCE.Box3();

              for (let i = 0; i < posAttr.count; i += stride) {
                vTemp
                  .fromBufferAttribute(posAttr, i)
                  .applyMatrix4(child.matrixWorld)
                  .sub(dishWorldPos)
                  .applyQuaternion(invQuat)
                  .multiplyScalar(invScale);

                unifiedBox.expandByPoint(vTemp);
                meshLocalBox.expandByPoint(vTemp);
              }
              hasGeom = true;
            }
          });

          if (hasGeom) {
            const sz = new THREE_INSTANCE.Vector3();
            const ctr = new THREE_INSTANCE.Vector3();
            unifiedBox.getSize(sz);
            unifiedBox.getCenter(ctr);

            if (sz.x > 0.05 && sz.z > 0.05 && sz.x < 2.5 && sz.z < 2.5) {
              // v4.54: Ajuste ceñido exacto (+1.2cm holgura periférica real)
              bboxSizeX = sz.x + 0.012;
              bboxSizeZ = sz.z + 0.012;
              reticleLocalCenterX = ctr.x;
              reticleLocalCenterZ = ctr.z;
              bboxCalculated = true;
            }
          }
        };

        // v4.54: Sincronización ultraligera 60 FPS en GPU (posición Y=0, escala dinámica y rotación en vivo)
        const sincronizarTransformReticula = (ret, THREE_INSTANCE) => {
          if (!ret || !THREE_INSTANCE) return;

          let yawAngle = 0;
          if (e.Quaternion && e.Quaternion.has(t, a)) {
            const qData = e.Quaternion.get(t, a);
            const q = new THREE_INSTANCE.Quaternion(qData.x, qData.y, qData.z, qData.w);
            const euler = new THREE_INSTANCE.Euler().setFromQuaternion(q, 'YXZ');
            yawAngle = euler.y;
          }

          const qPitch = new THREE_INSTANCE.Quaternion().setFromAxisAngle(new THREE_INSTANCE.Vector3(1, 0, 0), -Math.PI / 2);
          const qYaw = new THREE_INSTANCE.Quaternion().setFromAxisAngle(new THREE_INSTANCE.Vector3(0, 1, 0), yawAngle);
          ret.quaternion.copy(qYaw).multiply(qPitch);

          const offsetRotated = new THREE_INSTANCE.Vector3(reticleLocalCenterX * currentScale, 0, reticleLocalCenterZ * currentScale).applyAxisAngle(new THREE_INSTANCE.Vector3(0, 1, 0), yawAngle);

          ret.position.set(planarX + offsetRotated.x, 0.0015, planarZ + offsetRotated.z);
          ret.scale.set(currentScale, currentScale, currentScale);
        };

        // v4.54: Obtención con caché estable: creación única por gesto y actualización por matrices continuas
        const obtenerReticula = (THREE_INSTANCE, scene) => {
          if (reticleMesh) {
            sincronizarTransformReticula(reticleMesh, THREE_INSTANCE);
            return reticleMesh;
          }
          actualizarBoundingBox(THREE_INSTANCE);
          const geometry = crearGeometriaMarcoReticula(
            THREE_INSTANCE,
            bboxSizeX,
            bboxSizeZ,
            DRAG_RETICLE_CONFIG.thickness,
            DRAG_RETICLE_CONFIG.cornerRadius
          );
          const material = new THREE_INSTANCE.MeshBasicMaterial({
            color: DRAG_RETICLE_CONFIG.color,
            transparent: true,
            opacity: 0.85,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1.0,
            polygonOffsetUnits: -1.0,
            side: THREE_INSTANCE.DoubleSide
          });
          reticleMesh = new THREE_INSTANCE.Mesh(geometry, material);
          sincronizarTransformReticula(reticleMesh, THREE_INSTANCE);
          reticleMesh.visible = false;
          reticleMesh.renderOrder = 990;
          scene.add(reticleMesh);
          return reticleMesh;
        };

        // Elevación suave e independiente del evento
        const actualizarElevacion = () => {
          const now = performance.now();
          const deltaSec = Math.max(0.001, (now - lastLiftFrameTime) / 1000);
          lastLiftFrameTime = now;

          const targetLift = isDragActive ? DRAG_RETICLE_CONFIG.liftHeight : 0;
          const lerpStep = 1.0 - Math.exp(-DRAG_RETICLE_CONFIG.liftSmoothingRate * deltaSec);
          currentLift += (targetLift - currentLift) * lerpStep;

          if (isModelTouchActive && !isTwoFingerGesture) {
            t.transform.setWorldPosition(a, {
              x: planarX,
              y: dragPlaneY + currentLift,
              z: planarZ
            });
          }

          requestAnimationFrame(actualizarElevacion);
        };
        requestAnimationFrame(actualizarElevacion);

        // Lógica multitáctil
        o("enabled").initial()
          .listen(a, e.input.SCREEN_TOUCH_START, o => {
            if (isModelTouchActive) {
              activePointerIds.add(o.data.pointerId);
              return;
            }

            if (reticleMesh && t.three && t.three.scene) {
              t.three.scene.remove(reticleMesh);
              if (reticleMesh.geometry) reticleMesh.geometry.dispose();
              reticleMesh = null;
            }

            const n = t.transform.getWorldPosition(a),
            i = t.three.activeCamera,
            r = window.THREE;
            isModelTouchActive = !0,
            dragPointerId = o.data.pointerId,
            activePointerIds.add(o.data.pointerId),
            dragPlaneY = 0.001,
            dragOffsetX = 0,
            dragOffsetZ = 0,
            planarX = n.x,
            planarZ = n.z;

            if (!i || !r) return;

            const d = new r.Raycaster(),
            s = new r.Vector2(o.data.position.x * 2 - 1, 1 - o.data.position.y * 2),
            l = new r.Plane(new r.Vector3(0, 1, 0), -dragPlaneY),
            c = new r.Vector3();
            d.setFromCamera(s, i);
            if (d.ray.intersectPlane(l, c)) {
              dragOffsetX = n.x - c.x,
              dragOffsetZ = n.z - c.z
            }

            isDragActive = !1;
          })
          .listen(t.events.globalId, e.input.SCREEN_TOUCH_START, o => {
            if (isModelTouchActive) activePointerIds.add(o.data.pointerId);
          })
          .listen(t.events.globalId, e.input.SCREEN_TOUCH_MOVE, o => {
            if (!isModelTouchActive || isTwoFingerGesture || waitForAllTouchesToEnd || activePointerIds.size > 1 || o.data.pointerId !== dragPointerId) return;
            const n = t.three.activeCamera,
            i = window.THREE;
            if (!n || !i) return;
            const r = new i.Raycaster(),
            d = new i.Vector2(o.data.position.x * 2 - 1, 1 - o.data.position.y * 2),
            s = new i.Plane(new i.Vector3(0, 1, 0), -dragPlaneY),
            l = new i.Vector3();
            r.setFromCamera(d, n);
            if (r.ray.intersectPlane(s, l)) {
              const nextX = l.x + dragOffsetX;
              const nextZ = l.z + dragOffsetZ;
              if (!isDragActive && Math.hypot(nextX - planarX, nextZ - planarZ) < DRAG_RETICLE_CONFIG.dragActivationThreshold) return;

              planarX = nextX;
              planarZ = nextZ;
              if (!isDragActive) {
                isDragActive = !0;
                if (t.three.scene) {
                  const ret = obtenerReticula(i, t.three.scene);
                  sincronizarTransformReticula(ret, i);
                  ret.visible = true;
                }
              }
              if (reticleMesh) {
                sincronizarTransformReticula(reticleMesh, i);
              }
            }
          })
          .listen(t.events.globalId, e.input.SCREEN_TOUCH_END, o => {
            activePointerIds.delete(o.data.pointerId);
            if (0 === activePointerIds.size) {
              if (isDragActive) {
                isDragActive = !1;
                if (reticleMesh) reticleMesh.visible = false;
                const n = t.transform.getWorldPosition(a);
                const rInstance = window.THREE;

                if (rInstance) {
                  const wobbleDuration = 1200;
                  const wobbleStartTime = performance.now();
                  const startY = n.y;
                  const dropTimeMs = 200;

                  const initialTilt = 0.080;
                  const randomPhase = Math.random() * Math.PI * 2;
                  const totalYawSpin = 0.16 * (Math.random() < 0.5 ? 1 : -1);

                  let currentRotY = 0;
                  if (e.Quaternion && e.Quaternion.has(t, a)) {
                    const qData = e.Quaternion.get(t, a);
                    const qInit = new rInstance.Quaternion(qData.x, qData.y, qData.z, qData.w);
                    const eulerInit = new rInstance.Euler().setFromQuaternion(qInit, 'YXZ');
                    currentRotY = eulerInit.y;
                  }

                  const animarCaidaYBamboleo = () => {
                    const wElapsed = performance.now() - wobbleStartTime;
                    const wProgress = Math.min(1.0, wElapsed / wobbleDuration);

                    const dropProgress = Math.min(1.0, wElapsed / dropTimeMs);
                    const dropEase = dropProgress * dropProgress;
                    let currentY = rInstance.MathUtils.lerp(startY, dragPlaneY, dropEase);

                    let tiltX = 0, tiltZ = 0, naturalY = currentRotY;

                    if (wElapsed >= dropTimeMs) {
                      const settleTime = (wElapsed - dropTimeMs) / 1000.0;
                      const decay = Math.exp(-4.2 * settleTime);
                      const freq = 20.0 + (settleTime * 10.0);
                      const tiltAmount = initialTilt * decay * Math.cos(freq * settleTime);

                      const wobbleDir = randomPhase + (settleTime * 7.0);
                      tiltX = Math.cos(wobbleDir) * tiltAmount;
                      tiltZ = Math.sin(wobbleDir) * tiltAmount;
                      naturalY = currentRotY + (totalYawSpin * (1.0 - decay));

                      const liftOffset = 0.008 * decay;
                      currentY = dragPlaneY + liftOffset;
                    }

                    const qFrame = new rInstance.Quaternion().setFromEuler(new rInstance.Euler(tiltX, naturalY, tiltZ, 'YXZ'));
                    if (e.Quaternion && e.Quaternion.set) {
                      e.Quaternion.set(t, a, { x: qFrame.x, y: qFrame.y, z: qFrame.z, w: qFrame.w });
                    }
                    t.transform.setWorldPosition(a, { x: n.x, y: currentY, z: n.z });

                    if (wProgress < 1.0) {
                      requestAnimationFrame(animarCaidaYBamboleo);
                    } else {
                      t.transform.setWorldPosition(a, { x: n.x, y: dragPlaneY, z: n.z });
                      const qFinal = new rInstance.Quaternion().setFromAxisAngle(new rInstance.Vector3(0, 1, 0), naturalY);
                      if (e.Quaternion && e.Quaternion.set) {
                        e.Quaternion.set(t, a, { x: qFinal.x, y: qFinal.y, z: qFinal.z, w: qFinal.w });
                      }
                    }
                  };
                  requestAnimationFrame(animarCaidaYBamboleo);
                }
              }

              isModelTouchActive = !1,
              dragPointerId = null,
              waitForAllTouchesToEnd = !1;
            }
          })
          .listen(t.events.globalId, e.input.GESTURE_START, o => {
            if (!isModelTouchActive || 2 !== o.data.touchCount) return;
            isTwoFingerGesture = !0,
            waitForAllTouchesToEnd = !0,
            scaleAtGestureStart = currentScale;

            if (isDragActive) {
              isDragActive = !1;
              currentLift = 0;
              const n = t.transform.getWorldPosition(a);
              t.transform.setWorldPosition(a, { x: n.x, y: dragPlaneY, z: n.z });
            }
            if (t.three.scene && window.THREE) {
              const ret = obtenerReticula(window.THREE, t.three.scene);
              sincronizarTransformReticula(ret, window.THREE);
              ret.visible = true;
            }
          })
          .listen(t.events.globalId, e.input.GESTURE_MOVE, o => {
            if (!isModelTouchActive || !isTwoFingerGesture || 2 !== o.data.touchCount) return;

            if (o.data.positionChange && o.data.positionChange.x) {
              const angleDelta = o.data.positionChange.x * MODEL_GESTURES.rotationSensitivity;
              t.transform.rotateSelf(a, e.math.quat.yRadians(angleDelta));

              if (reticleMesh && window.THREE) {
                sincronizarTransformReticula(reticleMesh, window.THREE);
                reticleMesh.visible = true;
              }
            }

            if (o.data.startSpread > 0 && o.data.spread > 0) {
              const spreadRatio = o.data.spread / o.data.startSpread;
              const spreadDeltaRatio = Math.abs(spreadRatio - 1.0);

              if (spreadDeltaRatio >= MODEL_GESTURES.scaleDeadzone) {
                const effectiveFactor = spreadRatio > 1.0
                  ? 1.0 + (spreadRatio - 1.0 - MODEL_GESTURES.scaleDeadzone)
                  : 1.0 - (1.0 - spreadRatio - MODEL_GESTURES.scaleDeadzone);

                currentScale = Math.max(
                  MODEL_GESTURES.minimumScale,
                  Math.min(MODEL_GESTURES.maximumScale, scaleAtGestureStart * effectiveFactor)
                );

                e.Scale.set(t, a, { x: currentScale, y: currentScale, z: currentScale });

                if (reticleMesh && window.THREE) {
                  sincronizarTransformReticula(reticleMesh, window.THREE);
                  reticleMesh.visible = true;
                }
              }
            }
          })
          .listen(t.events.globalId, e.input.GESTURE_END, o => {
            if (o.data.nextTouchCount < 2) isTwoFingerGesture = !1;
            if (reticleMesh && !isDragActive) reticleMesh.visible = false;
          })
      }
    });

    // Componente oficial para visualizar la nube de puntos (SLAM) de 8th Wall (Solo activo en debug)
    e.registerComponent({
      name: "point-cloud-visualizer",
      add: (world, component) => {
        const scene = world.three.scene;
        const THREE_INSTANCE = window.THREE;
        if (!THREE_INSTANCE || !scene) return;

        const maxPoints = 100;
        const positionsArray = new Float32Array(maxPoints * 3);
        for (let j = 0; j < maxPoints * 3; j++) {
          positionsArray[j] = 999999;
        }

        const geometry = new THREE_INSTANCE.BufferGeometry();
        geometry.setAttribute('position', new THREE_INSTANCE.BufferAttribute(positionsArray, 3));

        const material = new THREE_INSTANCE.PointsMaterial({
          color: 0xffcc00,
          size: 0.008,
          sizeAttenuation: true,
          opacity: 1.0,
          depthWrite: true,
          depthTest: false
        });

        const pointCloudMesh = new THREE_INSTANCE.Points(geometry, material);
        pointCloudMesh.frustumCulled = false;
        scene.add(pointCloudMesh);

        const actualizarPuntos = () => {
          const worldPoints = window.latestWorldPoints;
          if (worldPoints) {
            const positions = pointCloudMesh.geometry.attributes.position.array;
            const count = Math.min(worldPoints.length, maxPoints);

            for (let k = 0; k < count; k++) {
              const pt = worldPoints[k].position;
              positions[k * 3] = pt.x;
              positions[k * 3 + 1] = pt.y;
              positions[k * 3 + 2] = pt.z;
            }
            for (let k = count; k < maxPoints; k++) {
              positions[k * 3] = 999999;
              positions[k * 3 + 1] = 999999;
              positions[k * 3 + 2] = 999999;
            }
            pointCloudMesh.geometry.attributes.position.needsUpdate = true;
          }
          requestAnimationFrame(actualizarPuntos);
        };

        actualizarPuntos();
      }
    });

    // Componente oficial para medir latencia y rendimiento del Frame
    e.registerComponent({
      name: "performance-debugger",
      add: (world, component) => {
        let lastTime = performance.now();
        let frameTimes = [];

        const medirRendimiento = () => {
          const now = performance.now();
          const deltaFrame = now - lastTime;
          lastTime = now;

          frameTimes.push(deltaFrame);
          if (frameTimes.length > 30) {
            frameTimes.shift();
          }

          const promedio = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const latencySpan = document.getElementById("latencySpan");

          if (latencySpan) {
            if (promedio > 66.7) {
              latencySpan.style.color = "#ff3333";
            } else if (promedio > 33.3) {
              latencySpan.style.color = "#ffcc00";
            } else {
              latencySpan.style.color = "#00ff00";
            }

            latencySpan.innerHTML = `Latencia: ${promedio.toFixed(1)} ms`;
          }

          requestAnimationFrame(medirRendimiento);
        };

        requestAnimationFrame(medirRendimiento);
      }
    });

    const i = {
      "objects": {

        // Prefab del objeto que se clona (Logo / Plato)
        "b534657a-38e6-4275-a37d-77b655561d5b": {
          "id": "b534657a-38e6-4275-a37d-77b655561d5b",
          "position": [0, 0, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "components": {
            "model-gesture-controls-comp": {
              "id": "model-gesture-controls-comp",
              "name": "model-gesture-controls",
              "parameters": {}
            }
          },
          "name": "Logo",
          "order": 8.599486645057333,
          "shadow": {
            "castShadow": false
          },
          "prefab": true
        },

        // Luz direccional base (Contact AO y sombras del Ground)
        "492cfe2c-9334-4a9c-a48a-be80132af9fb": {
          "id": "492cfe2c-9334-4a9c-a48a-be80132af9fb",
          "position": [0, 1, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {},
          "light": {
            "type": "directional",
            "shadowBias": 0.0001,
            "shadowRadius": 2.5,
            "followCamera": false,
            "shadowCamera": [-10, 10, 10, -10, 3, 5]
          },
          "name": "Directional Light",
          "order": 0.6785011504707911
        },

        // Cámara de Realidad Aumentada
        "52ba8a86-a459-4df8-b954-a570e85e0484": {
          "id": "52ba8a86-a459-4df8-b954-a570e85e0484",
          "position": [0, 0.23, 0.10],
          "rotation": [-0.0004637899966810532, 0.9978406073902779, -0.06529682289718859, -0.007087458033270938],
          "scale": [1.0000000000000002, 1, 1.0000000000000004],
          "geometry": null,
          "material": null,
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {
            "point-cloud-visualizer-comp": {
              "id": "point-cloud-visualizer-comp",
              "name": "point-cloud-visualizer",
              "parameters": {}
            },
            "performance-debugger-comp": {
              "id": "performance-debugger-comp",
              "name": "performance-debugger",
              "parameters": {}
            }
          },
          "name": "Camera",
          "camera": {
            "type": "perspective",
            "xr": {
              "xrCameraType": "world",
              "phone": "AR",
              "desktop": "disabled",
              "headset": "disabled"
            }
          },
          "order": 2.1029089692509704
        },

        // Plano del suelo (Ground) con colocador único automático
        "bc7753ae-2b39-4f48-910a-7921b756487b": {
          "id": "bc7753ae-2b39-4f48-910a-7921b756487b",
          "position": [0, 0.001, 0],
          "rotation": [-0.7071068, 0, 0, 0.7071068],
          "scale": [5, 5, 5],
          "geometry": {
            "type": "plane",
            "width": 1,
            "height": 1
          },
          "material": {
            "type": "shadow",
            "color": "#000000",
            "opacity": 0.40
          },
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {
            "dish-spawner-comp": {
              "id": "dish-spawner-comp",
              "name": "dish-spawner",
              "parameters": {
                "prefab": {
                  "type": "entity",
                  "id": "b534657a-38e6-4275-a37d-77b655561d5b"
                }
              }
            }
          },
          "name": "Ground",
          "order": 5.877553308364804,
          "shadow": {
            "receiveShadow": true
          }
        },

        // Entidad del Modelo 3D (El archivo .glb)
        "a02b4479-461e-40c2-ba91-0ccabbd1bd83": {
          "id": "a02b4479-461e-40c2-ba91-0ccabbd1bd83",
          "position": [0, 0, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "parentId": "b534657a-38e6-4275-a37d-77b655561d5b",
          "components": {},
          "name": "Model",
          "order": 1.1209803013844988,
          "gltfModel": {
            "src": {
              "type": "asset",
              "asset": "assets/8-jewel.glb"
            },
            "animationClip": "",
            "loop": true
          },
          "shadow": {
            "castShadow": true
          }
        }
      },
      "spaces": {
        "84028e73-ee70-412d-b8d4-c09bf07c655c": {
          "id": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "name": "Default",
          "activeCamera": "52ba8a86-a459-4df8-b954-a570e85e0484"
        }
      },
      "entrySpaceId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
      "runtimeVersion": {
        "type": "version",
        "level": "major",
        "major": 2,
        "minor": 0,
        "patch": 0
      }
    };

    delete i.history;
    delete i.historyVersion;
    const _idx = sessionStorage.getItem("modelo_actual");
    const _models = [
      "Plato_01.glb", "Plato_02.glb", "Plato_03.glb", "Plato_04.glb",
      "Plato_05.glb", "Plato_06.glb", "Plato_07.glb", "Plato_08.glb",
      "Plato_09.glb", "Plato_10.glb", "Plato_11.glb", "Plato_12.glb",
      "Plato_13.glb", "Plato_14.glb", "Plato_15.glb"
    ];
    if (_idx !== null && parseInt(_idx) < _models.length) {
      i.objects["a02b4479-461e-40c2-ba91-0ccabbd1bd83"].gltfModel.src = {
        type: "asset",
        asset: _models[parseInt(_idx)]
      };
    }

    if (!DEBUG_VISUALS.slamPointCloud) {
      delete i.objects["52ba8a86-a459-4df8-b954-a570e85e0484"].components["point-cloud-visualizer-comp"];
    }
    window.ecs.application.init(i)
  })()
})();