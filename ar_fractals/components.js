let raymarching_fragment_shader = `
    precision highp float;

    uniform vec2 resolution;
    uniform vec3 cameraPosition;
    uniform mat4 cameraWorldMatrix;
    uniform mat4 cameraProjectionMatrixInverse;

    const float EPS = 0.005;
    const vec3 LIGHT_DIR = vec3(-0.48666426339228763, 0.8111071056538127, -0.3244428422615251);
    const float DIST_MULT = 1.0;

    // distance functions
    float sphere_dist(vec3 p, float r) {
        return length(p) - r;
    }

    float box_dist(vec3 p, vec3 b){
        vec3 d = abs(p) - b;
        return length(max(d,0.0)) + min(max(d.x,max(d.y,d.z)),0.0);
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
        // return box_dist(p + vec3(0.0, 0.0, 0.0), vec3(1.0));
        // return sphere_dist(p + vec3(0.0, 0.5, 0.0), 1.0);
        return mandelbulb_dist(p - vec3(0.0, 1.0, 0.0));
    }

    vec3 get_normal(vec3 p)
    {
        vec2 e = vec2(1.0,-1.0)*0.001;
        return normalize( e.xyy*scene_dist(p + e.xyy) + 
                        e.yyx*scene_dist(p + e.yyx) + 
                        e.yxy*scene_dist(p + e.yxy) + 
                        e.xxx*scene_dist(p + e.xxx) );
    }

    vec4 shade(vec3 origin, vec3 ray) {
        // marching loop
        float dist;
        float depth = 0.0;
        vec3 pos = origin;

        for (int i = 0; i < 37; i++){
            dist = scene_dist(pos);
            depth += dist * DIST_MULT;
            pos = origin + depth * ray;
            if (abs(dist) < EPS) break;
        }
        
        // hit check and calc color
        vec4 color;
        vec3 normal;
        if (abs(dist) < EPS) {
            normal = get_normal(pos);
            float diffuse = clamp(dot( normalize(LIGHT_DIR), normal), 0.1, 1.0);

            color = vec4(vec3(0.9), 1.0) * diffuse + vec4(vec3(0.05), 1.0);
        } else {
            color = vec4(0.0);
        }

        return color;
    }

    void main(void) {
        // screen space
        // vec2 screenPos = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
        // screenPos = gl_FragCoord.xy / resolution;
        
        vec2 screenPos = gl_FragCoord.xy / resolution;
        
        // screenPos.x = (screenPos.x * 1.78) - 0.39;
        // screenPos.y = (screenPos.y * 1.01) - 0.008;

        screenPos = screenPos * 2.0 - 1.0;

        // if (screenPos.x > 1.0 || screenPos.x < 0.0 || screenPos.y > 1.0 || screenPos.y < 0.0) screenPos = vec2(0.0);

        // calculate ray direction
        vec3 ray = (cameraWorldMatrix * cameraProjectionMatrixInverse * vec4(screenPos, 1.0, 1.0)).xyz;
        ray = normalize(ray);

        // camera position
        vec3 cPos = cameraPosition;

        // cast ray
        vec4 color = vec4(0.0);
        color = shade(cPos, ray);

        gl_FragColor = color;
        // gl_FragColor = vec4(screenPos, 0.0, 1.0);
    }
`

let raymarching_vertex_shader = `
    attribute vec3 position;

    void main(void) {
        gl_Position = vec4(position, 1.0);
    }
`

AFRAME.registerComponent("screen-quad", {
    /*
    Create screen-covering polygon and attach raymarching shaders to it
    */
    init: function () {
        let quad_geometry, quad_mesh, quad_material;
        this.camera_set = false;
        let canvas = this.el.sceneEl.canvas;

        let camera = document.querySelector("#ar-cam").components.camera.camera;

        quad_geometry = new THREE.PlaneBufferGeometry(2.0, 2.0);
        quad_material = new THREE.RawShaderMaterial({
            uniforms: {
                resolution: {value: new THREE.Vector2(canvas.width, canvas.height)},
                cameraPosition: {value: camera.position},
                cameraWorldMatrix: {value: camera.matrixWorld},
                cameraProjectionMatrixInverse: {value: camera.projectionMatrixInverse}
            },
            vertexShader: raymarching_vertex_shader,
            fragmentShader: raymarching_fragment_shader
        });

        quad_mesh = new THREE.Mesh(quad_geometry, quad_material);
        quad_mesh.frustumCulled = false;
        
        this.el.setObject3D("mesh", quad_mesh);

        window.addEventListener('resize', onWindowResize);
    }
});

function onWindowResize() {
    /*
    Update screen quad material uniforms to reflect window size changes
    */
    let camera = document.querySelector("#ar-cam").components.camera.camera;
    let screen_quad = document.querySelector("#screen-quad").object3DMap["mesh"];
    let canvas = document.querySelector("canvas");

    // camera.aspect = window.innerWidth / window.innerHeight;
    // camera.updateProjectionMatrix();

    screen_quad.material.uniforms.resolution.value.set(canvas.width, canvas.height);
}
