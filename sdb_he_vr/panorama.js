// globals
var camera, scene, renderer, material;
var isUserInteracting = false,
onMouseDownMouseX = 0, onMouseDownMouseY = 0,
lon = 0, onMouseDownLon = 0,
lat = 0, onMouseDownLat = 0,
phi = 0, theta = 0,
panoramaNumber = 0;

function init() {
    // div container
    var container;
    container = document.getElementById( 'container' );

    // cam
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1100 );
    camera.target = new THREE.Vector3( 0, 0, 0 );
    
    // scene
    scene = new THREE.Scene();
    
    var geometry = new THREE.SphereBufferGeometry( 500, 64, 64 );
    geometry.scale( - 1, 1, 1 );
    
    var tex = new THREE.TextureLoader().load( 'img/ren_v003_day_8.jpg' );
    tex.minFilter = THREE.LinearFilter; // poles pinching fix

    material = new THREE.MeshBasicMaterial( {
        map: tex
    } );
    
    var mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );
    
    
    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
    
    // events
    document.addEventListener( 'mousedown', onPointerStart, false );
    document.addEventListener( 'mousemove', onPointerMove, false );
    document.addEventListener( 'mouseup', onPointerUp, false );
    document.addEventListener( 'touchstart', onPointerStart, false );
    document.addEventListener( 'touchmove', onPointerMove, false );
    document.addEventListener( 'touchend', onPointerUp, false );
    window.addEventListener( 'resize', onWindowResize, false );

    // switching
    var switchBtn = document.querySelectorAll('.controls li[class*="switch"]');

    var panoramasArray = [
        "img/ren_v003_day_8.jpg", 
        "img/ren_v003_day_9.jpg", 
        "img/ren_v003_day_10.jpg",
        "img/ren_v003_night_8.jpg", 
        "img/ren_v003_night_9.jpg", 
        "img/ren_v003_night_10.jpg"
    ];

    for (let i = 0; i < switchBtn.length; i++) {
        switchBtn[i].onclick = (e) => {
            let j = panoramasArray.length;

            panoramaNumber = ~e.target.className.indexOf("controls__switch-next") ? (panoramaNumber + 1) % j : (panoramaNumber - 1) % j;
            material.map = new THREE.TextureLoader().load(panoramasArray[Math.abs(panoramaNumber)]);
        };
    }
}

function animate() {
    requestAnimationFrame( animate );
    update();
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

init();
animate();

// events
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onPointerStart( event ) {
    isUserInteracting = true;
    var clientX = event.clientX || event.touches[ 0 ].clientX;
    var clientY = event.clientY || event.touches[ 0 ].clientY;
    onMouseDownMouseX = clientX;
    onMouseDownMouseY = clientY;
    onMouseDownLon = lon;
    onMouseDownLat = lat;
}

function onPointerMove( event ) {
    if ( isUserInteracting === true ) {
        var clientX = event.clientX || event.touches[ 0 ].clientX;
        var clientY = event.clientY || event.touches[ 0 ].clientY;
        lon = ( onMouseDownMouseX - clientX ) * 0.1 + onMouseDownLon;
        lat = ( clientY - onMouseDownMouseY ) * 0.1 + onMouseDownLat;
    }
}

function onPointerUp() {
    isUserInteracting = false;
}
