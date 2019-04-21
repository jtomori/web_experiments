let raymarching_fragment_shader = `
    precision highp float;

    uniform vec2 resolution;
    uniform vec3 cameraPosition;
    uniform mat4 cameraWorldMatrix;
    uniform mat4 cameraProjectionMatrixInverse;

    const float EPS = 0.005;
    const vec3 light_dir = vec3(-0.48666426339228763, 0.8111071056538127, -0.3244428422615251);
    
    // distance functions
    float sphere_dist(vec3 p, float r) {
        return length(p) - r;
    }

    float floor_dist(vec3 p){
        return dot(p, vec3(0.0, 1.0, 0.0)) + 1.0;
    }

    float mandelbulb_dist(vec3 p) {
        float distance;
        float de = 1.0;
        float power = 8.0;
        vec3 p_in = p;

        for (int i = 0; i < 8; i++) {
            distance = length(p);
            if (distance > 2.0) break;

            float theta = acos(p.z / distance);
            float phi = atan(p.x, p.y);
            de = pow(distance, power-1.0) * power * de + 1.0;
            float zr = pow(distance, power);
            theta *= power;
            phi *= power;
            p = zr * vec3( sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta) );
            p += p_in;
        }

        return 0.5 * log(distance) * distance / de;
    }

    float mandelbulb_poly_dist(vec3 p) {
        float de = 1.0;
        float m = dot(p, p);
        vec3 p_in = p;

        for (int i = 0; i < 4; i++) {
            float m2 = m*m;
            float m4 = m2*m2;
            de = 8.0*sqrt(m4*m2*m)*de + 1.0;

            float x = p.x; float x2 = x*x; float x4 = x2*x2;
            float y = p.y; float y2 = y*y; float y4 = y2*y2;
            float z = p.z; float z2 = z*z; float z4 = z2*z2;
            
            float k3 = x2 + z2;
            float k2 = inversesqrt(k3*k3*k3*k3*k3*k3*k3);
            float k1 = x4 + y4 + z4 - 6.0*y2*z2 - 6.0*x2*y2 + 2.0*z2*x2;
            float k4 = x2 - y2 + z2;
            
            p.x =  64.0*x*y*z*(x2-z2)*k4*(x4-6.0*x2*z2+z4)*k1*k2;
            p.y = -16.0*y2*k3*k4*k4 + k1*k1;
            p.z = -8.0*y*k4*(x4*x4 - 28.0*x4*x2*z2 + 70.0*x4*z4 - 28.0*x2*z2*z4 + z4*z4)*k1*k2;
            
            p += p_in;

            m = dot(p, p);
            if (m > 256.0) break;
        }

        return 0.25 * log(m) * sqrt(m) / de;
    }

    float scene_dist(vec3 p) {
        return mandelbulb_poly_dist(p);
    }

    vec3 get_normal(vec3 p)
    {
        vec2 e = vec2(1.0,-1.0)*0.001;
        return normalize( e.xyy*scene_dist(p + e.xyy) + 
                          e.yyx*scene_dist(p + e.yyx) + 
                          e.yxy*scene_dist(p + e.yxy) + 
                          e.xxx*scene_dist(p + e.xxx) );
    }

    vec3 shade(vec3 origin, vec3 ray) {
        // marching loop
        float dist;
        float depth = 0.0;
        vec3 pos = origin;

        for (int i = 0; i < 60; i++){
            dist = scene_dist(pos);
            depth += dist;
            pos = origin + depth * ray;
            if (abs(dist) < EPS) break;
        }
        
        // hit check and calc color
        vec3 color;
        vec3 normal;
        if (abs(dist) < EPS) {
            normal = get_normal(pos);
            float diffuse = clamp(dot(light_dir, normal), 0.1, 1.0);

            color = vec3(0.9) * diffuse + vec3(0.05);
        } else {
            color = vec3(0.6, 0.0, 0.0);
        }

        return color;
    }

    void main(void) {
        // screen position
        vec2 screenPos = (gl_FragCoord.xy * 2.0 - resolution) / resolution;

        // ray direction in normalized device coordinate
        vec4 ndcRay = vec4(screenPos.xy, 1.0, 1.0);

        // convert ray direction from normalized device coordinate to world coordinate
        vec3 ray = (cameraWorldMatrix * cameraProjectionMatrixInverse * ndcRay).xyz;
        ray = normalize(ray);

        // camera position
        vec3 cPos = cameraPosition;

        // cast ray
        vec3 color = vec3(0.0);

        color = shade(cPos, ray);

        gl_FragColor = vec4(color, 1.0);
    }
`

let raymarching_vertex_shader = `
    attribute vec3 position;

    void main(void) {
        gl_Position = vec4(position, 1.0);
    }
`

// globals
let camera, scene, renderer;

let stats;

function init() {
    let container = document.getElementById('container');

    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    
    window.addEventListener('resize', onWindowResize);

    // scene
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 3;
    
    // quad
    let quad_geometry, quad_mesh;

    quad_geometry = new THREE.PlaneBufferGeometry(2.0, 2.0);
    quad_material = new THREE.RawShaderMaterial({
        uniforms: {
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            cameraWorldMatrix: { value: camera.matrixWorld },
            cameraProjectionMatrixInverse: { value: new THREE.Matrix4().getInverse(camera.projectionMatrix) }
        },
        vertexShader: raymarching_vertex_shader,
        fragmentShader: raymarching_fragment_shader
    });
    quad_mesh = new THREE.Mesh(quad_geometry, quad_material);
    quad_mesh.frustumCulled = false;
    scene.add(quad_mesh);

    // cam controls
    let controls = new THREE.OrbitControls(camera);
    
    // stats
    stats = new Stats();
    document.body.appendChild(stats.dom);
}

function onWindowResize() {
    // update material uniforms
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    quad_material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    quad_material.uniforms.cameraProjectionMatrixInverse.value.getInverse(camera.projectionMatrix);
}

function render(time) {
    // measure fps and render
    stats.begin();
    renderer.render(scene, camera);
    stats.end();

    requestAnimationFrame(render);
}

init();
render();
