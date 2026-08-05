// 9th Wall v2.28
(()=>{
  var e={
    574(){
      const e=()=>{
        XR8.addCameraPipelineModule(LandingPage.pipelineModule()),

        // Registro oficial de nuestro módulo de puntos ANTES del arranque del motor
        XR8.addCameraPipelineModule({
          name: 'pointcloud-debugger-inner',
          onStart: () => {
            if (window.XR8) {
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
          mediaSrc:"./assets/preview.jpg"
        })
      };
      window.XR8?e():window.addEventListener("xrloaded", e)
    }
  },
  t={};
  function a(o){
    var n=t[o];
    if(void 0!==n)return n.exports;
    var i=t[o]={ exports:{} };
    return e[o](i, i.exports, a), i.exports
  }(()=>{
    "use strict";
    a(574);
    const e=window.ecs;
    e.registerComponent({
      name:"hide-on-ready",
      stateMachine:({ world:t, eid:a, defineState:o })=>{
        o("initial").initial().onEvent(e.events.REALITY_READY, "ready", { target:t.events.globalId }),
        o("ready").onEnter(()=>{ e.Disabled.reset(t, a) })
      }
    });
    const t=e.registerComponent({ name:"logo" }),
    o="object-placed";
    e.registerComponent({
      name:"tap-to-place",
      schema:{ prefab:"eid" },
      stateMachine:({ world:t, eid:a, schemaAttribute:n, defineState:i })=>{
        i("initial").initial().listen(a, e.input.SCREEN_TOUCH_START, i=>{
          if(!i.data.worldPosition)return;
          const r=t.createEntity(n.get(a).prefab),
          d=t.getEntity(r);
          d.setLocalPosition(i.data.worldPosition),
          d.set(e.Quaternion, e.math.quat.yRadians(Math.random()*Math.PI)),
          t.events.dispatch(a, o)
        })
      }
    });
    const n=e.defineQuery([t]);
    e.registerComponent({
      name:"reset-button",
      stateMachine:({ world:t, entity:a, defineState:i })=>{
        i("nothing-placed").initial().onEvent(o, "placed", { target:t.events.globalId }).onEnter(()=>a.hide()).onExit(()=>a.show()),
        i("placed").onEvent(e.input.UI_CLICK, "resetting"),
        i("resetting").wait(1e3, "nothing-placed").onEnter(()=>{
          const a=e.math.vec3.zero();
          n(t).forEach(o=>{
            t.transform.getLocalPosition(o, a),
            e.PositionAnimation.set(t, o, {
              duration:1e3,
              loop:!1,
              fromX:a.x,
              fromY:a.y,
              fromZ:a.z,
              toX:a.x,
              toY:-4,
              toZ:a.z,
              easeIn:!0,
              easingFunction:"Quadratic"
            })
          })
        }).onExit(()=>{
          n(t).forEach(e=>{ t.deleteEntity(e) })
        })
      }
    });

   // Componente oficial para visualizar la nube de puntos (SLAM) de 8th Wall
    e.registerComponent({
      name: "point-cloud-visualizer",
      add: (world, component) => {
        const scene = world.three.scene;
        const THREE_INSTANCE = window.THREE;
        if (!THREE_INSTANCE || !scene) return;

        const maxPoints = 500;
        const positionsArray = new Float32Array(maxPoints * 3);
        for (let j = 0; j < maxPoints * 3; j++) {
          positionsArray[j] = 999999;
        }

        const geometry = new THREE_INSTANCE.BufferGeometry();
        geometry.setAttribute('position', new THREE_INSTANCE.BufferAttribute(positionsArray, 3));
        
        const material = new THREE_INSTANCE.PointsMaterial({
          color: 0xffcc00,       // Amarillo/Dorado
          size: 0.005,             // Tamaño fijo de 8 píxeles
          sizeAttenuation: true, // NoFijo, visible independientemente de la distancia
          opacity: 1.0,
          depthWrite: true,     // Renderizar por encima del hider
          depthTest: false
        });

        const pointCloudMesh = new THREE_INSTANCE.Points(geometry, material);
        pointCloudMesh.frustumCulled = false;
        scene.add(pointCloudMesh);

        // Bucle nativo sincronizado con el renderizado a 60 FPS
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
    
    // Componente oficial para visualizar la Shadow Camera de la luz direccional
    e.registerComponent({
      name: "shadow-camera-helper",
      add: (world, component) => {
        const scene = world.three.scene;
        const THREE_INSTANCE = window.THREE;
        if (!THREE_INSTANCE || !scene) return;

        setTimeout(() => {
          scene.traverse((node) => {
            if (node.isDirectionalLight && node.shadow && node.shadow.camera) {
              const helper = new THREE_INSTANCE.CameraHelper(node.shadow.camera);
              scene.add(helper);
            }
          });
        }, 2000);
      }
    });

    // --- AQUÍ ESTABA LA LÍNEA INFINITA (Formateada con saltos de línea) ---
    const i = {
      "objects": {

        // Prefab del objeto que se clona (Logo)
        "b534657a-38e6-4275-a37d-77b655561d5b": {
          "id": "b534657a-38e6-4275-a37d-77b655561d5b",
          "position": [0, 0, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "components": {
            "92cc446e-2931-499b-9be0-0472f042433a": {
              "id": "92cc446e-2931-499b-9be0-0472f042433a",
              "name": "logo",
              "parameters": {}
            }
          },
          "name": "Logo",
          "order": 8.599486645057333,
          "shadow": { "castShadow": false },
          "prefab": true
        },

        // Luz direccional y ShadowCamera
        "492cfe2c-9334-4a9c-a48a-be80132af9fb": {
          "id": "492cfe2c-9334-4a9c-a48a-be80132af9fb",
          "position": [5, 25, 5],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {
            "shadow-camera-helper-comp": {
              "id": "shadow-camera-helper-comp",
              "name": "shadow-camera-helper",
              "parameters": {}
            }
          },
          "light": {
            "type": "directional",
            "shadowBias": 0,
            "shadowRadius": 2,
            "followCamera": false,
            "shadowCamera": [-5, 5, 5, -5, 0.5, 200] // <-- AQUÍ ESTÁ LA SHADOW CAMERA
          },
          "name": "Directional Light",
          "order": 0.6785011504707911
        },

        // Luz Ambiental
        "87113aa9-b52e-4fba-b937-63fbec393fa9": {
          "id": "87113aa9-b52e-4fba-b937-63fbec393fa9",
          "position": [10, 5, 5],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {},
          "light": { "type": "ambient", "intensity": 1 },
          "name": "Ambient Light",
          "order": 1.2491958667939822
        },

        // Cámara de Realidad Aumentada
        "52ba8a86-a459-4df8-b954-a570e85e0484": {
          "id": "52ba8a86-a459-4df8-b954-a570e85e0484",
          "position": [0, 0.30, 0.30],
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
            }
          },
          "name": "Camera",
          "camera": {
            "type": "perspective",
            "xr": { "xrCameraType": "world", "phone": "AR", "desktop": "disabled", "headset": "disabled" }
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
            "font": { "type": "font", "font": "Roboto" },
            "textAlign": "center",
            "verticalTextAlign": "center"
          },
          "name": "Text",
          "order": 1.9632252822400198
        },

        // Plano del suelo (Ground)
        "bc7753ae-2b39-4f48-910a-7921b756487b": {
          "id": "bc7753ae-2b39-4f48-910a-7921b756487b",
          "position": [0, 0.001, 0],
          "rotation": [-0.7071068, 0, 0, 0.7071068],
          "scale": [5, 5, 5],
          "geometry": { "type": "plane", "width": 1, "height": 1 },
          "material": { "type": "shadow", "color": "#000000", "opacity": 0.4 },
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {
            "efcfa10c-5fe6-4a92-85de-a602a68683b2": {
              "id": "efcfa10c-5fe6-4a92-85de-a602a68683b2",
              "name": "tap-to-place",
              "parameters": {
                "prefab": { "type": "entity", "id": "b534657a-38e6-4275-a37d-77b655561d5b" }
              }
            }
          },
          "name": "Ground", // <-- ESTO ES EL GROUND
          "order": 5.877553308364804,
          "shadow": { "receiveShadow": true }
        },

        // Plano Visual Rojo (Ground Visual Debug)
        "bc7753ae-2b39-4f48-910a-7921b756487c": {
          "id": "bc7753ae-2b39-4f48-910a-7921b756487c",
          "position": [0, 0, 0],
          "rotation": [-0.7071068, 0, 0, 0.7071068],
          "scale": [5, 5, 5],
          "geometry": { "type": "plane", "width": 1, "height": 1 },
          "material": { "type": "basic", "color": "#ff0000", "opacity": 0.2 },
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {},
          "name": "Ground Visual Debug",
          "order": 5.878553308364804,
          "shadow": { "receiveShadow": false }
        },


        // Plano Ocultador (Hider)
        "17af117a-efce-48dd-857e-e383a3649c7b": {
          "id": "17af117a-efce-48dd-857e-e383a3649c7b",
          "position": [0, -0.001, 0],
          "rotation": [-0.707106799999999, 0, 0, 0.7071067623730954],
          "scale": [10, 10, 10],
          "geometry": { "type": "plane", "width": 1, "height": 1 },
          "material": { "type": "hider" },
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {},
          "name": "Hider",
          "order": 7.322553197845954
        },

        // Texto UI "Tap to place"
        "9b5668bc-b512-4bb6-9c6b-8ba97d3f8af0": {
          "id": "9b5668bc-b512-4bb6-9c6b-8ba97d3f8af0",
          "position": [16.857510635812545, 15.927690665172552, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "904308fe-98f5-4c93-bf62-f39d50c6e602",
          "components": {},
          "ui": {
            "text": "Tap to place",
            "width": "100%",
            "height": 100,
            "type": "overlay",
            "verticalTextAlign": "start",
            "textAlign": "center",
            "fontSize": 32,
            "position": "absolute",
            "top": 10,
            "left": 10,
            "bottom": "",
            "right": "",
            "stackingOrder": -1,
            "color": "#ffffff",
            "font": { "type": "font", "font": "Roboto" }
          },
          "name": "Tap Prompt",
          "order": 10.427624126637916
        },

        // Sombra del texto UI "Tap to place"
        "637f7413-261d-48bb-99c9-154bd99360da": {
          "id": "637f7413-261d-48bb-99c9-154bd99360da",
          "position": [16.857510635812545, 15.927690665172552, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "904308fe-98f5-4c93-bf62-f39d50c6e602",
          "components": {},
          "ui": {
            "text": "Tap to place",
            "width": "100%",
            "height": 100,
            "type": "overlay",
            "verticalTextAlign": "start",
            "textAlign": "center",
            "fontSize": 32,
            "position": "absolute",
            "top": 12,
            "left": 12,
            "bottom": "",
            "right": "",
            "stackingOrder": -2,
            "color": "#000000",
            "font": { "type": "font", "font": "Roboto" }
          },
          "name": "Tap Prompt Shadow",
          "order": 11.644447501347162
        },

        // Entidad del Modelo 3D (El archivo .glb)
        "a02b4479-461e-40c2-ba91-0ccabbd1bd83": {
          "id": "a02b4479-461e-40c2-ba91-0ccabbd1bd83",
          "position": [0, 0, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "parentId": "b534657a-38e6-4275-a37d-77b655561d5b",
          "components": {
            "a2c75775-5a0f-44d7-910c-c111bc850bf6": {
              "id": "a2c75775-5a0f-44d7-910c-c111bc850bf6",
              "name": "position-animation",
              "parameters": {
                "fromY": -2,
                "loop": false,
                "easeOut": true,
                "easingFunction": "Elastic",
                "duration": 2000,
                "toY": 0.3
              }
            }
          },
          "name": "Model", // <-- ESTO ES EL MODELO 3D
          "order": 1.1209803013844988,
          "gltfModel": {
            "src": { "type": "asset", "asset": "assets/8-jewel.glb" },
            "animationClip": "",
            "loop": true
          },
          "shadow": { "castShadow": true }
        },

        // Botón UI (Reset)
        "5ac3deca-2126-4b56-b6a2-1442d035047a": {
          "id": "5ac3deca-2126-4b56-b6a2-1442d035047a",
          "position": [-8.46107198766815, 7.181789778649719, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "904308fe-98f5-4c93-bf62-f39d50c6e602",
          "components": {
            "2100d3e9-8fed-4773-bc39-6f2ca5042375": {
              "id": "2100d3e9-8fed-4773-bc39-6f2ca5042375",
              "name": "reset-button",
              "parameters": {}
            }
          },
          "ui": {
            "type": "overlay",
            "width": 100,
            "height": 36,
            "background": "#cb1010",
            "borderRadius": 5,
            "flexDirection": "row",
            "backgroundOpacity": 1,
            "padding": "10",
            "gap": "6",
            "alignItems": "center",
            "justifyContent": "center",
            "position": "absolute",
            "top": "",
            "left": "",
            "bottom": 20,
            "right": 20,
            "stackingOrder": 2
          },
          "name": "Button",
          "order": 13.280785398189009
        },

        // Texto del Botón Reset
        "543540e1-7086-4068-a4e3-394084c146f8": {
          "id": "543540e1-7086-4068-a4e3-394084c146f8",
          "position": [0, 0, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "5ac3deca-2126-4b56-b6a2-1442d035047a",
          "components": {},
          "name": "Text",
          "ui": {
            "width": 50,
            "height": 14,
            "text": "Reset",
            "color": "#ffffff",
            "fontSize": 16,
            "font": { "type": "font", "font": "Roboto" }
          },
          "order": 1.2563868233834565
        },

        // Contenedor principal UI
        "904308fe-98f5-4c93-bf62-f39d50c6e602": {
          "id": "904308fe-98f5-4c93-bf62-f39d50c6e602",
          "position": [9.546973370717888, 17.058059801097308, 0],
          "rotation": [0, 0, 0, 1],
          "scale": [1, 1, 1],
          "geometry": null,
          "material": null,
          "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
          "components": {},
          "name": "Main Screen",
          "order": 14.958687422311806,
          "ui": { "type": "overlay" }
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
      "Plato_01.glb","Plato_02.glb","Plato_03.glb","Plato_04.glb",
      "Plato_05.glb","Plato_06.glb","Plato_07.glb","Plato_08.glb",
      "Plato_09.glb","Plato_10.glb","Plato_11.glb","Plato_12.glb",
      "Plato_13.glb","Plato_14.glb","Plato_15.glb"
    ];
    if (_idx !== null && parseInt(_idx) < _models.length) {
      i.objects["a02b4479-461e-40c2-ba91-0ccabbd1bd83"].gltfModel.src = {
        type: "asset",
        asset: _models[parseInt(_idx)]
      };
    }
    window.ecs.application.init(i)
  })()
})();
