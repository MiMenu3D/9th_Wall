// ============================================================================
// 8th Wall v1.02 - Código de escena WebAR formateado y estructurado
// ============================================================================

(() => {
  // --------------------------------------------------------------------------
  // 1. CONFIGURACIÓN DEL MÓDULO DE CÁMARA Y PÁGINA DE INICIO (LANDING)
  // --------------------------------------------------------------------------
  var modules = {
    574() {
      const initCamera = () => {
        // Añade el pipeline de cámara y configura la imagen de vista previa
        XR8.addCameraPipelineModule(LandingPage.pipelineModule());
        LandingPage.configure({
          mediaSrc: "./assets/preview.jpg"
        });
      };

      // Si XR8 ya cargó se ejecuta, si no, espera al evento 'xrloaded'
      if (window.XR8) {
        initCamera();
      } else {
        window.addEventListener("xrloaded", initCamera);
      }
    }
  };

  var moduleCache = {};

  // Función requeridora de módulos (Webpack / Bundler interno)
  function requireModule(moduleId) {
    var cached = moduleCache[moduleId];
    if (void 0 !== cached) return cached.exports;

    var module = moduleCache[moduleId] = { exports: {} };
    modules[moduleId](module, module.exports, requireModule);
    return module.exports;
  }

  // Ejecuta la inicialización del módulo 574
  "use strict";
  requireModule(574);

  const ecs = window.ecs;

  // --------------------------------------------------------------------------
  // 2. COMPONENTES PERSONALIZADOS DEL SISTEMA ECS (Entity Component System)
  // --------------------------------------------------------------------------

  // --- Componente: HIDE-ON-READY ---
  // Oculta la pantalla de carga una vez que la Realidad Aumentada está lista
  ecs.registerComponent({
    name: "hide-on-ready",
    stateMachine: ({ world, eid, defineState }) => {
      defineState("initial")
        .initial()
        .onEvent(ecs.events.REALITY_READY, "ready", {
          target: world.events.globalId
        });

      defineState("ready").onEnter(() => {
        ecs.Disabled.reset(world, eid);
      });
    }
  });

  // --- Componente: LOGO ---
  // Identificador para los objetos duplicados/instanciados en escena
  const logoComponent = ecs.registerComponent({
    name: "logo"
  });

  const EVENT_OBJECT_PLACED = "object-placed";

  // --- Componente: TAP-TO-PLACE ---
  // Genera/ubica el objeto 3D en la posición del suelo donde el usuario toca la pantalla
  ecs.registerComponent({
    name: "tap-to-place",
    schema: {
      prefab: "eid" // ID del Prefab que se va a clonar
    },
    stateMachine: ({ world, eid, schemaAttribute, defineState }) => {
      defineState("initial")
        .initial()
        .listen(eid, ecs.input.SCREEN_TOUCH_START, (event) => {
          if (!event.data.worldPosition) return;

          // Crea una nueva entidad usando el prefab
          const newEntityId = world.createEntity(schemaAttribute.get(eid).prefab);
          const entity = world.getEntity(newEntityId);

          // Establece la posición 3D detectada en el plano
          entity.setLocalPosition(event.data.worldPosition);

          // Aplica una rotación aleatoria en el eje Y
          entity.set(ecs.Quaternion, ecs.math.quat.yRadians(Math.random() * Math.PI));

          // Notifica que el objeto ha sido colocado
          world.events.dispatch(eid, EVENT_OBJECT_PLACED);
        });
    }
  });

  // Consulta para obtener todos los objetos clonados con el componente 'logo'
  const logoQuery = ecs.defineQuery([logoComponent]);

  // --- Componente: RESET-BUTTON ---
  // Controla la lógica del botón "Reset" (ocultar, mostrar y desvanecer objetos)
  ecs.registerComponent({
    name: "reset-button",
    stateMachine: ({ world, entity, defineState }) => {
      // Estado inicial: Sin objetos en pantalla, oculta el botón
      defineState("nothing-placed")
        .initial()
        .onEvent(EVENT_OBJECT_PLACED, "placed", {
          target: world.events.globalId
        })
        .onEnter(() => entity.hide())
        .onExit(() => entity.show());

      // Estado cuando hay un objeto colocado: Escucha el clic en el botón Reset
      defineState("placed").onEvent(ecs.input.UI_CLICK, "resetting");

      // Estado reseteando: Anima los objetos cayendo (-4 en Y) y los elimina
      defineState("resetting")
        .wait(1000, "nothing-placed")
        .onEnter(() => {
          const currentPos = ecs.math.vec3.zero();
          logoQuery(world).forEach((placedEntity) => {
            world.transform.getLocalPosition(placedEntity, currentPos);

            // Animación para hundir el objeto en el suelo al borrar
            ecs.PositionAnimation.set(world, placedEntity, {
              duration: 1000,
              loop: false,
              fromX: currentPos.x,
              fromY: currentPos.y,
              fromZ: currentPos.z,
              toX: currentPos.x,
              toY: -4, // Cae hacia abajo
              toZ: currentPos.z,
              easeIn: true,
              easingFunction: "Quadratic"
            });
          });
        })
        .onExit(() => {
          // Destruye las entidades de la escena al terminar
          logoQuery(world).forEach((placedEntity) => {
            world.deleteEntity(placedEntity);
          });
        });
    }
  });

  // --------------------------------------------------------------------------
  // 3. ESTRUCTURA Y OBJETOS DE LA ESCENA 3D (JSON Desglosado)
  // --------------------------------------------------------------------------
  const sceneData = JSON.parse(`{
    "objects": {

      // --- [PREFAB BASE]: El objeto que se clona (Logo / Plato) ---
      "b534657a-38e6-4275-a37d-77b655561d5b": {
        "id": "b534657a-38e6-4275-a37d-77b655561d5b",
        "name": "Logo",
        "position": [0, 0, 0],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "prefab": true,
        "shadow": { "castShadow": true },
        "components": {
          "92cc446e-2931-499b-9be0-0472f042433a": {
            "id": "92cc446e-2931-499b-9be0-0472f042433a",
            "name": "logo",
            "parameters": {}
          }
        }
      },

      // --- [LUZ DIRECCIONAL]: Luz principal con Sombras (ShadowCamera) ---
      "492cfe2c-9334-4a9c-a48a-be80132af9fb": {
        "id": "492cfe2c-9334-4a9c-a48a-be80132af9fb",
        "name": "Directional Light",
        "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
        "position": [5, 25, 5],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "light": {
          "type": "directional",
          "shadowBias": 0,
          "shadowRadius": 2,
          "followCamera": false,
          // AQUÍ ESTÁ LA CONFIGURACIÓN DE LA SHADOW CAMERA:
          "shadowCamera": [-10, 10, 10, -10, 0.5, 200] 
        },
        "components": {}
      },

      // --- [LUZ AMBIENTAL]: Iluminación global uniforme ---
      "87113aa9-b52e-4fba-b937-63fbec393fa9": {
        "id": "87113aa9-b52e-4fba-b937-63fbec393fa9",
        "name": "Ambient Light",
        "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
        "position": [10, 5, 5],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "light": {
          "type": "ambient",
          "intensity": 1
        },
        "components": {}
      },

      // --- [CÁMARA DE REALIDAD AUMENTADA]: Cámara del usuario ---
      "52ba8a86-a459-4df8-b954-a570e85e0484": {
        "id": "52ba8a86-a459-4df8-b954-a570e85e0484",
        "name": "Camera",
        "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
        "position": [0, 2, 3.211226375221431],
        "rotation": [-0.0004637899966810532, 0.9978406073902779, -0.06529682289718859, -0.007087458033270938],
        "scale": [1, 1, 1],
        "camera": {
          "type": "perspective",
          "xr": {
            "xrCameraType": "world",
            "phone": "AR",
            "desktop": "disabled",
            "headset": "disabled"
          }
        },
        "components": {}
      },

      // --- [PANTALLA DE CARGA]: UI Overlay negro de fondo ---
      "c7231d72-b7a3-44ea-b5f5-bb9ea9572ed9": {
        "id": "c7231d72-b7a3-44ea-b5f5-bb9ea9572ed9",
        "name": "Loading Screen",
        "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
        "position": [0, 10.938518268367439, -2.5468804365107705],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "ui": {
          "type": "overlay",
          "width": "100%",
          "height": "100%",
          "background": "#000000",
          "backgroundOpacity": 1,
          "alignItems": "center",
          "justifyContent": "center",
          "stackingOrder": 100
        },
        "components": {
          "f31ef85b-8c9e-41ca-817f-a53bb7000a2d": {
            "id": "f31ef85b-8c9e-41ca-817f-a53bb7000a2d",
            "name": "hide-on-ready",
            "parameters": {}
          }
        }
      },

      // --- [TEXTO DE CARGA]: "Camera Loading" ---
      "2f4186f0-5825-4b3c-868a-24bc7945a328": {
        "id": "2f4186f0-5825-4b3c-868a-24bc7945a328",
        "name": "Text",
        "parentId": "c7231d72-b7a3-44ea-b5f5-bb9ea9572ed9",
        "position": [0, 0, 0],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "ui": {
          "type": "3d",
          "width": 200,
          "height": 200,
          "text": "Camera Loading",
          "color": "#ffffff",
          "fontSize": 24,
          "font": { "type": "font", "font": "Roboto" },
          "textAlign": "center",
          "verticalTextAlign": "center"
        },
        "components": {}
      },

      // --- [GROUND / SUELO]: Plano invisible sobre el que se toca e instancian objetos ---
      "bc7753ae-2b39-4f48-910a-7921b756487b": {
        "id": "bc7753ae-2b39-4f48-910a-7921b756487b",
        "name": "Ground",
        "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
        "position": [0, 0, 0],
        "rotation": [-0.7071068, 0, 0, 0.7071068],
        "scale": [50, 50, 50],
        "geometry": { "type": "plane", "width": 1, "height": 1 },
        "material": { "type": "shadow", "color": "#000000", "opacity": 0.4 },
        "shadow": { "receiveShadow": true },
        "components": {
          "efcfa10c-5fe6-4a92-85de-a602a68683b2": {
            "id": "efcfa10c-5fe6-4a92-85de-a602a68683b2",
            "name": "tap-to-place",
            "parameters": {
              "prefab": { "type": "entity", "id": "b534657a-38e6-4275-a37d-77b655561d5b" }
            }
          }
        }
      },

      // --- [HIDER / OCULTADOR 3D]: Plano ocludor para esconder partes bajo el suelo ---
      "17af117a-efce-48dd-857e-e383a3649c7b": {
        "id": "17af117a-efce-48dd-857e-e383a3649c7b",
        "name": "Hider",
        "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
        "position": [0, -0.01, 0],
        "rotation": [-0.707106799999999, 0, 0, 0.7071067623730954],
        "scale": [50, 50, 50],
        "geometry": { "type": "plane", "width": 1, "height": 1 },
        "material": { "type": "hider" },
        "components": {}
      },

      // --- [MENSAJE PANTALLA]: "Tap to place" (Texto de instrucción) ---
      "9b5668bc-b512-4bb6-9c6b-8ba97d3f8af0": {
        "id": "9b5668bc-b512-4bb6-9c6b-8ba97d3f8af0",
        "name": "Tap Prompt",
        "parentId": "904308fe-98f5-4c93-bf62-f39d50c6e602",
        "position": [16.857510635812545, 15.927690665172552, 0],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "ui": {
          "type": "overlay",
          "position": "absolute",
          "top": 10,
          "left": 10,
          "width": "100%",
          "height": 100,
          "text": "Tap to place",
          "color": "#ffffff",
          "fontSize": 32,
          "textAlign": "center",
          "verticalTextAlign": "start",
          "stackingOrder": -1,
          "font": { "type": "font", "font": "Roboto" }
        },
        "components": {}
      },

      // --- [SOMBRA DEL MENSAJE]: Sombra del texto "Tap to place" ---
      "637f7413-261d-48bb-99c9-154bd99360da": {
        "id": "637f7413-261d-48bb-99c9-154bd99360da",
        "name": "Tap Prompt Shadow",
        "parentId": "904308fe-98f5-4c93-bf62-f39d50c6e602",
        "position": [16.857510635812545, 15.927690665172552, 0],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "ui": {
          "type": "overlay",
          "position": "absolute",
          "top": 12,
          "left": 12,
          "width": "100%",
          "height": 100,
          "text": "Tap to place",
          "color": "#000000",
          "fontSize": 32,
          "textAlign": "center",
          "verticalTextAlign": "start",
          "stackingOrder": -2,
          "font": { "type": "font", "font": "Roboto" }
        },
        "components": {}
      },

      // --- [MODELO 3D HIJO]: El modelo GLTF con animación elástica de entrada ---
      "a02b4479-461e-40c2-ba91-0ccabbd1bd83": {
        "id": "a02b4479-461e-40c2-ba91-0ccabbd1bd83",
        "name": "Model",
        "parentId": "b534657a-38e6-4275-a37d-77b655561d5b",
        "position": [0, 0, 0],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "gltfModel": {
          "src": { "type": "asset", "asset": "assets/8-jewel.glb" },
          "animationClip": "",
          "loop": true
        },
        "shadow": { "castShadow": true },
        "components": {
          "a2c75775-5a0f-44d7-910c-c111bc850bf6": {
            "id": "a2c75775-5a0f-44d7-910c-c111bc850bf6",
            "name": "position-animation",
            "parameters": {
              "fromY": -2,
              "toY": 0.3,
              "duration": 2000,
              "loop": false,
              "easeOut": true,
              "easingFunction": "Elastic"
            }
          }
        }
      },

      // --- [BOTÓN RESET]: Botón rojo de reseteo en la UI ---
      "5ac3deca-2126-4b56-b6a2-1442d035047a": {
        "id": "5ac3deca-2126-4b56-b6a2-1442d035047a",
        "name": "Button",
        "parentId": "904308fe-98f5-4c93-bf62-f39d50c6e602",
        "position": [-8.46107198766815, 7.181789778649719, 0],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "ui": {
          "type": "overlay",
          "position": "absolute",
          "bottom": 20,
          "right": 20,
          "width": 100,
          "height": 36,
          "background": "#cb1010",
          "borderRadius": 5,
          "backgroundOpacity": 1,
          "flexDirection": "row",
          "alignItems": "center",
          "justifyContent": "center",
          "padding": "10",
          "gap": "6",
          "stackingOrder": 2
        },
        "components": {
          "2100d3e9-8fed-4773-bc39-6f2ca5042375": {
            "id": "2100d3e9-8fed-4773-bc39-6f2ca5042375",
            "name": "reset-button",
            "parameters": {}
          }
        }
      },

      // --- [TEXTO DEL BOTÓN]: "Reset" ---
      "543540e1-7086-4068-a4e3-394084c146f8": {
        "id": "543540e1-7086-4068-a4e3-394084c146f8",
        "name": "Text",
        "parentId": "5ac3deca-2126-4b56-b6a2-1442d035047a",
        "position": [0, 0, 0],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "ui": {
          "width": 50,
          "height": 14,
          "text": "Reset",
          "color": "#ffffff",
          "fontSize": 16,
          "font": { "type": "font", "font": "Roboto" }
        },
        "components": {}
      },

      // --- [CONTENEDOR DE LA INTERFAZ UI]: Pantalla principal UI ---
      "904308fe-98f5-4c93-bf62-f39d50c6e602": {
        "id": "904308fe-98f5-4c93-bf62-f39d50c6e602",
        "name": "Main Screen",
        "parentId": "84028e73-ee70-412d-b8d4-c09bf07c655c",
        "position": [9.546973370717888, 17.058059801097308, 0],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1],
        "ui": { "type": "overlay" },
        "components": {}
      }
    },

    // --- ESPACIO ESCENA POR DEFECTO ---
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
  }`);

  // Limpieza de datos no necesarios del JSON
  delete sceneData.history;
  delete sceneData.historyVersion;

  // --------------------------------------------------------------------------
  // 4. LÓGICA DE SELECCIÓN DINÁMICA DE MODELOS (.GLB)
  // --------------------------------------------------------------------------
  // Revisa el sessionStorage para cambiar dinámicamente el plato actual
  const modelIndex = sessionStorage.getItem("modelo_actual");
  const modelsList = [
    "Plato_01.glb", "Plato_02.glb", "Plato_03.glb", "Plato_04.glb",
    "Plato_05.glb", "Plato_06.glb", "Plato_07.glb", "Plato_08.glb",
    "Plato_09.glb", "Plato_10.glb", "Plato_11.glb", "Plato_12.glb",
    "Plato_13.glb", "Plato_14.glb", "Plato_15.glb"
  ];

  // Si existe un índice en sessionStorage y es válido, asigna ese archivo .glb al Modelo
  if (modelIndex !== null && parseInt(modelIndex) < modelsList.length) {
    sceneData.objects["a02b4479-461e-40c2-ba91-0ccabbd1bd83"].gltfModel.src = {
      type: "asset",
      asset: modelsList[parseInt(modelIndex)]
    };
  }

  // --------------------------------------------------------------------------
  // 5. INICIALIZACIÓN DE LA APLICACIÓN 8TH WALL ECS
  // --------------------------------------------------------------------------
  window.ecs.application.init(sceneData);
})();