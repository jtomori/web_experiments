'use strict';

// globals
let camera, scene, renderer;

// orbit controls
let isUserInteracting = false,
onMouseDownMouseX = 0, onMouseDownMouseY = 0,
lon = 0, onMouseDownLon = 0,
lat = 0, onMouseDownLat = 0,
phi = 0, theta = 0;

// panoramas
let panorama_number = 0;

let panorama_paths = [
    "img/ren_v003_day_10.jpg",
    "img/ren_v003_day_8.jpg",
    "img/ren_v003_day_9.jpg",
    "img/ren_v003_night_10.jpg",
    "img/ren_v003_night_8.jpg",
    "img/ren_v003_night_9.jpg"
];

let panorama_textures = [];

function init() {
    // div container
    let container;
    container = document.getElementById( 'container' );

    // cam
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1100 );
    camera.target = new THREE.Vector3( 0, 0, 0 );
    
    // scene
    scene = new THREE.Scene();
    
    // sphere with flipped normals
    let geometry = new THREE.SphereBufferGeometry( 500, 64, 64 );
    geometry.scale( - 1, 1, 1 );
    
    // initial texture
    let tex = new THREE.TextureLoader().load( panorama_paths[panorama_number] );
    tex.minFilter = THREE.LinearFilter; // poles pinching fix
    panorama_textures[0] = tex;

    let material = new THREE.MeshBasicMaterial( {
        map: tex
    } );
    
    let mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );
    
    
    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
    
    // events
    document.addEventListener( 'mousedown', onPointerStart);
    document.addEventListener( 'mousemove', onPointerMove);
    document.addEventListener( 'mouseup', onPointerUp);
    document.addEventListener( 'touchstart', onPointerStart);
    document.addEventListener( 'touchmove', onPointerMove);
    document.addEventListener( 'touchend', onPointerUp);
    window.addEventListener( 'resize', onWindowResize);

    // switching images
    let switch_buttons = document.querySelectorAll('.controls li[class*="switch"]');

    for (let i = 0; i < switch_buttons.length; i++) {
        switch_buttons[i].onclick = function (event) {
            let panoramas_len = panorama_paths.length;

            if (event.target.className === "controls_switch-next")
                panorama_number = (panorama_number + 1) % panoramas_len;
            else
                panorama_number = (panorama_number - 1) % panoramas_len;

            // load texture
            //let new_tex = new THREE.TextureLoader().load( panorama_paths[ Math.abs(panorama_number) ] );
            //new_tex.minFilter = THREE.LinearFilter;

            let new_tex = panorama_textures[ Math.abs(panorama_number) ];

            // assign new texture
            material.map = new_tex;
        };
    }
}

function update() {
    // cam rotation
    if ( isUserInteracting === false ) {
        lon -= 0.025;
    }

    lat = Math.max( - 85, Math.min( 85, lat ) );
    phi = THREE.Math.degToRad( 90 - lat );
    theta = THREE.Math.degToRad( lon );
    camera.target.x = -1 * Math.sin( phi ) * Math.cos( theta );
    camera.target.y = -1 * Math.cos( phi );
    camera.target.z = Math.sin( phi ) * Math.sin( theta );
    camera.lookAt( camera.target );
    
    renderer.render( scene, camera );
}

function animate() {
    requestAnimationFrame( animate );
    update();
}

init();
animate();
loadTextures();

// loads all textures
function loadTextures() {
    for (let i = 1; i < panorama_paths.length; i++) {
        let new_tex = new THREE.TextureLoader().load( panorama_paths[i] )
        new_tex.minFilter = THREE.LinearFilter;
        panorama_textures[i] = new_tex;
    }
}

// events
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

// orbit controls
function onPointerStart( event ) {
    isUserInteracting = true;
    let clientX = event.clientX || event.touches[ 0 ].clientX;
    let clientY = event.clientY || event.touches[ 0 ].clientY;
    onMouseDownMouseX = clientX;
    onMouseDownMouseY = clientY;
    onMouseDownLon = lon;
    onMouseDownLat = lat;
}

function onPointerMove( event ) {
    if ( isUserInteracting === true ) {
        let clientX = event.clientX || event.touches[ 0 ].clientX;
        let clientY = event.clientY || event.touches[ 0 ].clientY;
        lon = ( onMouseDownMouseX - clientX ) * 0.1 + onMouseDownLon;
        lat = ( clientY - onMouseDownMouseY ) * 0.1 + onMouseDownLat;
    }
}

function onPointerUp() {
    isUserInteracting = false;
}
