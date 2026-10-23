import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const canvas=document.querySelector('#turntable'),label=document.querySelector('#model-status');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});}catch{label.textContent='当前浏览器无法启动 3D 显示，请启用硬件加速后刷新。';throw Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xfff3dc,0x68758a,3));
const key=new THREE.DirectionalLight(0xffe5c4,2.1);key.position.set(2,3,4);scene.add(key);const fill=new THREE.DirectionalLight(0xc8d9ff,1.5);fill.position.set(-3,1,1);scene.add(fill);const rim=new THREE.DirectionalLight(0xe8c99e,2);rim.position.set(0,2,-3);scene.add(rim);
const camera=new THREE.OrthographicCamera(-.7,.7,1.04,-1.04,.01,40);camera.position.set(0,.97,3.8);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,.91,0);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=1.25;controls.maxDistance=6;controls.minPolarAngle=.02;controls.maxPolarAngle=Math.PI-.02;controls.rotateSpeed=.65;controls.autoRotateSpeed=.8;controls.update();
new ResizeObserver(()=>{const {width,height}=canvas.getBoundingClientRect();renderer.setSize(width,height,false);camera.left=-1.04*width/height;camera.right=1.04*width/height;camera.updateProjectionMatrix()}).observe(canvas);
const autoButton=document.querySelector('#auto');function syncAuto(){autoButton.textContent=controls.autoRotate?'Ⅱ':'▶';autoButton.setAttribute('aria-pressed',String(controls.autoRotate));autoButton.setAttribute('aria-label',controls.autoRotate?'暂停自动环绕':'自动环绕人物')}
autoButton.onclick=()=>{controls.autoRotate=!controls.autoRotate;syncAuto()};controls.addEventListener('start',()=>{controls.autoRotate=false;syncAuto()});
function rotate(horizontal=0,vertical=0){controls.autoRotate=false;syncAuto();const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);s.theta+=horizontal;s.phi=THREE.MathUtils.clamp(s.phi+vertical,.02,Math.PI-.02);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update()}
document.querySelector('#prev').onclick=()=>rotate(-Math.PI/12);document.querySelector('#next').onclick=()=>rotate(Math.PI/12);document.querySelector('#reset-model').onclick=()=>{controls.autoRotate=false;syncAuto();camera.position.set(0,.97,3.8);controls.target.set(0,.91,0);camera.zoom=1;camera.updateProjectionMatrix();controls.update();telemetry()};
canvas.addEventListener('keydown',e=>{const step=Math.PI/60;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')rotate(-step);else if(e.key==='ArrowRight')rotate(step);else if(e.key==='ArrowUp')rotate(0,-step);else if(e.key==='ArrowDown')rotate(0,step);else{const scale=e.key==='-'?1.1:.9;camera.zoom=THREE.MathUtils.clamp(camera.zoom/scale,.55,3);camera.updateProjectionMatrix();controls.update();telemetry()}}});
new GLTFLoader().load('assets/maolongrui-model.glb',gltf=>{let meshes=0,triangles=0;gltf.scene.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshBasicMaterial({map:o.material.map,side:THREE.DoubleSide});meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});scene.add(gltf.scene);canvas.dataset.ready='true';canvas.dataset.meshes=meshes;canvas.dataset.triangles=triangles;label.textContent='';label.hidden=true;},e=>{if(e.total)label.textContent='正在加载三维人物 '+Math.round(e.loaded/e.total*100)+'%';},()=>{label.textContent='三维模型加载失败，请刷新重试。';canvas.dataset.error='load';});
function telemetry(){const v=camera.position.clone().sub(controls.target);const degrees=((Math.atan2(v.x,v.z)*180/Math.PI)%360+360)%360;document.querySelector('#angle').textContent=degrees.toFixed(0).padStart(3,'0')+'°';canvas.dataset.angle=degrees.toFixed(2);canvas.dataset.elevation=(Math.acos(v.y/v.length())*180/Math.PI).toFixed(2);canvas.dataset.distance=(v.length()/camera.zoom).toFixed(3);}controls.addEventListener('change',telemetry);function render(){requestAnimationFrame(render);controls.update();telemetry();renderer.render(scene,camera)}render();document.querySelector('#print').onclick=()=>window.print();




