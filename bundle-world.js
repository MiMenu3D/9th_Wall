// 9th Wall v4.27
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

  // v4.27: retícula adaptativa al Bounding Box local y rebote calibrado (940ms) estrictamente sobre Y >= 0
  const DRAG_RETICLE_CONFIG = Object.freeze({
    liftHeight: 0.05,
    liftSmoothingRate: 8.0,
    dragActivationThreshold: 0.012,
    baseSize: 0.272,
    thickness: 0.02,
    cornerRadius: 0.05,
    color: 0x66ffff,
    bounceDuration: 940,
    bounceEasing: "Bounce"
  });

  // v4.20: rectángulo con esquinas redondeadas adaptativo a dimensiones X y Z
  function crearFormaRectRedondeada(THREE_INSTANCE, sizeX, sizeZ, radius) {
    const sx = sizeX / 2;
    const sz = sizeZ / 2;
    const r = Math.min(radius, Math.min(sx, sz) * 0.5);
    const shape = new THREE_INSTANCE.Shape();
    shape.moveTo(-sx, -sz + r);
    shape.lineTo(-sx, sz - r);
    shape.quadraticCurveTo(-sx, sz, -sx + r, sz);
    shape.lineTo(sx - r, sz);
    shape.quadraticCurveTo(sx, sz, sx, sz - r);
    shape.lineTo(sx, -sz + r);
    shape.quadraticCurveTo(sx, -sz, sx - r, -sz);
    shape.lineTo(-sx + r, -sz);
    shape.quadraticCurveTo(-sx, -sz, -sx, -sz + r);
    return shape;
  }

  function crearGeometriaMarcoReticula(THREE_INSTANCE, sizeX, sizeZ, thickness, radius) {
    const outer = crearFormaRectRedondeada(THREE_INSTANCE, sizeX, sizeZ, radius);
    const innerX = Math.max(0.02, sizeX - thickness * 2);
    const innerZ = Math.max(0.02, sizeZ - thickness * 2);
    const innerRadius = Math.max(0.001, radius - thickness);
    outer.holes.push(crearFormaRectRedondeada(THREE_INSTANCE, innerX, innerZ, innerRadius));
    return new THREE_INSTANCE.ShapeGeometry(outer);
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
    e.registerComponent({
      name: "hide-on-ready",
      stateMachine: ({ world: t, eid: a, defineState: o }) => {
        o("initial").initial().onEvent(e.events.REALITY_READY, "ready", { target: t.events.globalId }),
        o("ready").onEnter(() => { e.Disabled.reset(t, a) })
      }
    });

    // v4.27: Componente de generación reactivo con detección de carga GLTF nativa y cinemática (2000ms Quartic)
    e.registerComponent({
      name: "dish-spawner",
      schema: { prefab: "eid" },
      stateMachine: ({ world: t, eid: a, schemaAttribute: schemaAttr, defineState: i }) => {
        let isPlaced = false;
        i("initial").initial().listen(t.events.globalId, "auto-place-dish", ev => {
          if (isPlaced) return;
          if (!ev.data || !ev.data.worldPosition) return;
          isPlaced = true;
          const prefabEid = schemaAttr.get(a).prefab;
          const r = t.createEntity(prefabEid);
          const d = t.getEntity(r);

          const targetX = ev.data.worldPosition.x;
          const targetY = ev.data.worldPosition.y;
          const targetZ = ev.data.worldPosition.z;

          // Rotación binaria base (0° o 180°)
          const baseRotY = Math.random() < 0.5 ? 0 : Math.PI;

          // Posición inicial protegida tras el Hider
          d.setLocalPosition({ x: targetX, y: targetY - 0.50, z: targetZ });
          d.set(e.Quaternion, e.math.quat.yRadians(baseRotY));

          const spawnDuration = 2000;
          const totalSpinAngle = -Math.PI * 2; // -360° horario
          let animationStarted = false;

          const dispararCinematicaSpawn = () => {
            if (animationStarted) return;
            animationStarted = true;

            const spawnStartTime = performance.now();
            const animarSpawnCompleto = () => {
              const elapsed = performance.now() - spawnStartTime;
              const progress = Math.min(1.0, elapsed / spawnDuration);
              // Easing Quartic Ease-Out: 1 - (1 - t)^4
              const ease = 1.0 - Math.pow(1.0 - progress, 4);

              const currentY = (targetY - 0.50) + (0.501 * ease);
              const currentAngle = baseRotY + (totalSpinAngle * ease);

              d.setLocalPosition({ x: targetX, y: currentY, z: targetZ });
              d.set(e.Quaternion, e.math.quat.yRadians(currentAngle));

              if (progress < 1.0) {
                requestAnimationFrame(animarSpawnCompleto);
              } else {
                d.setLocalPosition({ x: targetX, y: targetY + 0.001, z: targetZ });
                d.set(e.Quaternion, e.math.quat.yRadians(baseRotY + totalSpinAngle));
              }
            };
            requestAnimationFrame(animarSpawnCompleto);
          };

          // 1. Escucha reactiva oficial del evento de motor GLTF_MODEL_LOADED
          if (e.events && e.events.GLTF_MODEL_LOADED) {
            const unlisten = t.events.addListener(t.events.globalId, e.events.GLTF_MODEL_LOADED, () => {
              dispararCinematicaSpawn();
              if (unlisten) unlisten();
            });
          }

          // 2. Comprobación directa sobre la escena Three.js para modelos precargados o en caché
          const comprobarMallaLista = () => {
            if (animationStarted) return;
            let encontrada = false;
            if (t.three && t.three.scene) {
              t.three.scene.traverse((child) => {
                if (child.isMesh && child.geometry && child.name !== "Ground" && child.name !== "Hider") {
                  encontrada = true;
                }
              });
            }
            if (encontrada) {
              dispararCinematicaSpawn();
            } else {
              requestAnimationFrame(comprobarMallaLista);
            }
          };
          requestAnimationFrame(comprobarMallaLista);
        });
      }
    });

    e.registerComponent({
      name: "model-gesture-controls",
      stateMachine: ({ world: t, eid: a, defineState: o }) => {
        let isTwoFingerGesture = !1,
        isModelTouchActive = !1,
        dragPointerId = null,
        dragPlaneY = 0,
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
        bboxSizeZ = DRAG_RETICLE_CONFIG.baseSize;

        // v4.27: Medición precisa del Bounding Box en espacio local (invariante a la rotación del modelo)
        const actualizarBoundingBox = (THREE_INSTANCE) => {
          if (!t.three.scene) return;
          const localBox = new THREE_INSTANCE.Box3();
          let hasGeom = false;
          t.three.scene.traverse((child) => {
            if (child.isMesh && child.geometry && child.name !== "Ground" && child.name !== "Hider" && child !== reticleMesh) {
              if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
              localBox.union(child.geometry.boundingBox);
              hasGeom = true;
            }
          });
          if (hasGeom) {
            const size = new THREE_INSTANCE.Vector3();
            localBox.getSize(size);
            if (size.x > 0.05 && size.z > 0.05) {
              bboxSizeX = size.x;
              bboxSizeZ = size.z;
            }
          }
        };

        // v4.27: Sincronización angular y posicional continua de la retícula
        const sincronizarTransformReticula = (ret, THREE_INSTANCE) => {
          if (!ret) return;
          const rotQuat = t.transform.getWorldRotation(a);
          const q = new THREE_INSTANCE.Quaternion(rotQuat.x, rotQuat.y, rotQuat.z, rotQuat.w);
          const euler = new THREE_INSTANCE.Euler().setFromQuaternion(q, 'YXZ');

          ret.position.set(planarX, dragPlaneY + 0.002, planarZ);
          ret.rotation.set(-Math.PI / 2, 0, euler.y);
          ret.scale.set(currentScale, currentScale, currentScale);
        };

        // v4.27: retícula adaptativa al tamaño exacto de la caja envolvente
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
            side: THREE_INSTANCE.DoubleSide
          });
          reticleMesh = new THREE_INSTANCE.Mesh(geometry, material);
          sincronizarTransformReticula(reticleMesh, THREE_INSTANCE);
          reticleMesh.visible = false;
          reticleMesh.renderOrder = 0;
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

            const n = t.transform.getWorldPosition(a),
            i = t.three.activeCamera,
            r = window.THREE;
            isModelTouchActive = !0,
            dragPointerId = o.data.pointerId,
            activePointerIds.add(o.data.pointerId),
            dragPlaneY = n.y,
            dragOffsetX = 0,
            dragOffsetZ = 0,
            planarX = n.x,
            planarZ = n.z;
            if (!i || !r) return;

            try {
              if (e.PositionAnimation && e.PositionAnimation.remove) {
                e.PositionAnimation.remove(t, a);
              }
            } catch (err) {}

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
              // v4.27: caída acelerada (940ms) asentándose en Y = 0 sin rebasarlo
              if (isDragActive) {
                isDragActive = !1;
                if (reticleMesh) reticleMesh.visible = false;
                const n = t.transform.getWorldPosition(a);
                e.PositionAnimation.set(t, a, {
                  duration: DRAG_RETICLE_CONFIG.bounceDuration,
                  loop: !1,
                  easeOut: !0,
                  easingFunction: DRAG_RETICLE_CONFIG.bounceEasing,
                  fromX: n.x,
                  toX: n.x,
                  fromY: n.y,
                  toY: dragPlaneY,
                  fromZ: n.z,
                  toZ: n.z
                });
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

            // 1. ROTACIÓN ESTÁNDAR
            if (o.data.positionChange && o.data.positionChange.x) {
              const angleDelta = o.data.positionChange.x * MODEL_GESTURES.rotationSensitivity;
              t.transform.rotateSelf(a, e.math.quat.yRadians(angleDelta));

              if (t.three.scene && window.THREE) {
                const ret = obtenerReticula(window.THREE, t.three.scene);
                sincronizarTransformReticula(ret, window.THREE);
                ret.visible = true;
              }
            }

            // 2. ESCALA CON DEADZONE BLINDADO
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

                if (t.three.scene && window.THREE) {
                  const ret = obtenerReticula(window.THREE, t.three.scene);
                  sincronizarTransformReticula(ret, window.THREE);
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

        // Pantalla de Carga (Overlay negro)
        "c7231d72-b7a3-44ea-b5f5-bb9ea9572ed9": {
          "id": "c7231d72-b7a3-44ea-b5f5-bb9ea9572ed9",
          "position": [0, 10.938518268367439, -2.5468804365107705],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {
            "f31ef85b-8c9e-41ca-817f-a53bb7000a2d": {
              "id": "f31ef85b-8c9e-41ca-817f-a53bb7000a2d",
              "name": "hide-on-ready",
              "parameters": {}
            }
          },
          "ui": {
            "flexDirection": "row",
            "width": "100%",
            "height": "100%",
            "type": "overlay",
            "background": "#000000",
            "backgroundOpacity": 1,
            "alignItems": "center",
            "justifyContent": "center",
            "stackingOrder": 100
          },
          "name": "Loading Screen",
          "order": 16.570036688545937
        },

        // Texto "Camera Loading"
        "2f4186f0-5825-4b3c-868a-24bc7945a328": {
          "id": "2f4186f0-5825-4b3c-868a-24bc7945a328",
          "position": [0, 0, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "c7231d72-b7a3-44ea-b5f5-bb9ea9572ed9",
          "components": {},
          "ui": {
            "width": 200,
            "height": 200,
            "text": "Camera Loading",
            "color": "#ffffff",
            "fontSize": 24,
            "type": "3d",
            "font": {
              "type": "font",
              "font": "Roboto"
            },
            "textAlign": "center",
            "verticalTextAlign": "center"
          },
          "name": "Text",
          "order": 1.9632252822400198
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
            "opacity": 0.5
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

        // Plano Ocultador (Hider)
        "17af117a-efce-48dd-857e-e383a3649c7b": {
          "id": "17af117a-efce-48dd-857e-e383a3649c7b",
          "position": [0, -0.001, 0],
          "rotation": [-0.707106799999999, 0, 0, 0.7071067623730954],
          "scale": [2, 2, 2],
          "geometry": {
            "type": "plane",
            "width": 1,
            "height": 1
          },
          "material": {
            "type": "hider"
          },
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {},
          "name": "Hider",
          "order": 7.322553197845954
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