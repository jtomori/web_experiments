AFRAME.registerShader("raymarching", {
    /*
    TBD
    */
    raw: true,
    vertexShader: `
        attribute vec3 position;

        void main(void) {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
    precision highp float;

    uniform vec2 resolution;
    uniform mat4 viewMatrix;
    uniform vec3 cameraPosition;
    uniform mat4 cameraWorldMatrix;
    uniform mat4 cameraProjectionMatrixInverse;

    const float EPS = 0.01;
    const float OFFSET = EPS * 100.0;
    const vec3 light_dir = vec3(-0.48666426339228763, 0.8111071056538127, -0.3244428422615251);
    
    // distance functions
    float sphere_dist(vec3 p, float r) {
        return length(p) - r;
    }

    float floor_dist(vec3 p){
        return dot(p, vec3(0.0, 1.0, 0.0)) + 1.0;
    }

    float scene_dist(vec3 p) {
        return sphere_dist(p, 1.0);
    }

    vec3 get_normal(vec3 p) {
        return normalize(vec3(
            scene_dist(p + vec3(EPS, 0.0, 0.0)) - scene_dist(p + vec3(-EPS, 0.0, 0.0)),
            scene_dist(p + vec3(0.0, EPS, 0.0)) - scene_dist(p + vec3(0.0, -EPS, 0.0)),
            scene_dist(p + vec3(0.0, 0.0, EPS)) - scene_dist(p + vec3(0.0, 0.0, -EPS))
        ));
    }

    vec3 get_color(vec3 origin, vec3 ray) {
        // marching loop
        float dist;
        float depth = 0.0;
        vec3 pos = origin;

        #pragma unroll_loop
        for ( int i = 0; i < 16; i ++ ){
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

        color = get_color(cPos, ray);

        gl_FragColor = vec4(color, 1.0);
    }
    `
});