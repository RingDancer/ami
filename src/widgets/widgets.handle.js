/**
 * @module widgets/handle
 * 
 */

export default class WidgetsHandle extends THREE.Object3D{
  constructor(targetMesh, controls, camera, container) {
    super();

    this._enabled = true;

    this._attached = false;

    this._domStyle = 'circle'; // square, triangle
    // maybe just a string...
    // this._domStyles = {
    //   circle: function(){
    //     this._dom.style.border = '2px solid #353535';
    //     this._dom.style.backgroundColor = '#F9F9F9';
    //     // this._dom.style.backgroundColor = 'rgba(230, 230, 230, 0.7)';
    //     this._dom.style.color = '#F9F9F9';
    //     this._dom.style.position = 'absolute';
    //     this._dom.style.width = '12px';
    //     this._dom.style.height = '12px';
    //     this._dom.style.margin = '-6px';
    //     this._dom.style.borderRadius =  '50%';
    //     this._dom.style.transformOrigin = '0 100%';
    //   },
    //   cross: function(){

    //   },
    //   triangle: ``
    // };
    
// <svg height="12" width="12">
//   <circle cx="6" cy="6" r="5" stroke="#353535" stroke-opacity="0.9" stroke-width="2" fill="#F9F9F9" fill-opacity="0.7" />
//   Sorry, your browser does not support inline SVG.  
// </svg>

// <svg height="12" width="12">
// <line x1="0" y1="0" x2="12" y2="12" stroke="#353535" stroke-linecap="square" stroke-width="2" />
// <line x1="0" y1="12" x2="12" y2="0" stroke="#353535" stroke-linecap="square" stroke-width="2" />
// </svg>


// <svg height="12" width="12">
// <line x1="0" y1="12" x2="6" y2="6" stroke="#353535" stroke-linecap="square" stroke-width="2" />
// <line x1="6" y1="6" x2="12" y2="12" stroke="#353535" stroke-linecap="square" stroke-width="2" />
// </svg>

    this._meshStyle = 'sphere'; //cube, etc.


    // array of meshes
    this._targetMesh = targetMesh;
    this._controls = controls;
    this._camera = camera;
    this._container = container;
    this._raycaster = new THREE.Raycaster();
    this._handle = null;

    this._firstRun = false;

    this._mouse = {
      x: 0,
      y: 0,
      screenX: 0,
      screenY: 0
    };

    // world (LPS) position
    this._worldPosition = {
      x: 0,
      y: 0,
      z: 0
    };

    // screen position
    this._screenPosition = {
      x: 0,
      y: 0
    };

    this._selected = false;
    this._hovered = false;
    this._dragged = false;
    this._hoverDistance = 100; // px
    this._hoverThreshold = 10; // px

    this._defaultColor = '0x00B0FF';
    this._activeColor = '0xFFEB3B';
    this._hoverColor = '0xF50057';
    this._selectedColor = '0x76FF03';

    this._visible = true;
    this._color = this._defaultColor;
    this._material = null;
    this._geometry = null;
    this._mesh = null;

    this._dom = null;

    this._showVoxel = true;
    this._showDomSVG = true;
    this._showDomMeasurements = true;
    // dom circle and dom cross

    //
    this.onStart = this.onStart.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onEnd = this.onEnd.bind(this);
    this.onHover = this.onHover.bind(this);
    this.update = this.update.bind(this);

    // create handle
    this._worldPosition = this._targetMesh.position;
    this._screenPosition = this.worldToScreen(this._worldPosition, this._camera, this._container);
    this.createMesh();
    this.createDOM();

    // event listeners
    this.addEventListeners();
  }

  addEventListeners(){
    // maybe hook mouve down/touch start to container until handler is attached
    // hook the to the _dom!
    this._dom.addEventListener('mousedown', this.onStart);
    this._container.addEventListener('mousemove', this.onMove);
    this._container.addEventListener('mouseup', this.onEnd);

    this._dom.addEventListener('touchstart', this.onStart);
    this._container.addEventListener('touchmove', this.onMove);
    this._container.addEventListener('touchend', this.onEnd);

    this._dom.addEventListener('mouseenter', this.onHover);
    this._dom.addEventListener('mouseleave', this.onHover);

    // should happend somewhere else?
    // should "update"
    this._container.addEventListener('mousewheel', this.onMove);
    this._container.addEventListener('DOMMouseScroll', this.onMove);
  }

  onStart(evt){
    //
    this._dragged = false;
    this._firstRun = false;

    // update raycaster

    //
    // SHOULD HAPPENONLY IF WE NEED TO RUN INTERSECT OBJECTS
    //

    this.updateRaycaster(this._raycaster, evt, this._container);
    //let intersects = this._raycaster.intersectObject(this._targetMesh);

    // if intersects itself or 10px close
    // select + exit
    // if(intersects){
    //   // if no mesh currently, create one!
    //   if(this._mesh === null){
    //     this._worldPosition = intersects[0].point;
    //     this._screenPosition = this.worldToScreen(this._worldPosition, this._camera, this._container);
    //     this.createMesh();
    //     this.createDOM();

    //     this.added();
    //     return;
    //   }
    // }

    // if intersects one of the target mesh (from scene??)
    if(this._hovered ||
       this._raycaster.intersectObject(this._mesh).length > 0){

        this._active = true;
        this._controls.enabled = false;

        this.update();
    }


    evt.preventDefault();
  }

  onEnd(evt){

    // unselect if go up without moving
    if(!this._dragged && this._active){
      this._selected = !this._selected;
    }

    // stay active...
    if(this._firstRun === true){
      return;
    }

    this._active = false;
    this._controls.enabled = true;

    this.update();

    evt.preventDefault();
  }

  onMove(evt){
    // if nothing exists, exit
    if(this._mesh === null){
      return;
    }

    this._dragged = true;

    // update screen position of handle
    this._screenPosition = this.worldToScreen(this._worldPosition, this._camera, this._container);

    // update raycaster
    this.updateRaycaster(this._raycaster, evt, this._container);
    let intersectsTarget = this._raycaster.intersectObject(this._targetMesh);
    if(intersectsTarget.length > 0){
      if(this._active){
        // update position
        this._worldPosition = intersectsTarget[0].point;
        this.update();
        return;
      }

      // else hover stuff
      let worldPosition = intersectsTarget[0].point;
      let screenPosition = this.worldToScreen(worldPosition, this._camera, this._container);

      this.hoverVoxel(screenPosition);

    }

    this.update();

    evt.preventDefault();
  }

  onHover(evt){
    this._hovered = (evt.type === 'mouseenter');
    this._dom.style.cursor= this._hovered? 'pointer' : 'cursor';

    evt.preventDefault();
    evt.stopPropagation();
  }

  update(){
    // mesh stuff
    this.updateMeshColor();
    this.updateMeshPosition();

    // DOM stuff
    this.updateDOMPosition();
  }

  //
  updateMeshColor(){
    if(this._active){
      this._color = this._activeColor;
    }
    else if(this._hovered){
      this._color = this._hoverColor;
    }
    else if(this._selected){
      this._color = this._selectedColor;
   }
   else{
      this._color = this._defaultColor;
   }

    if(this._material){
      this._material.color.setHex(this._color);
    }
  }

  updateMeshPosition(){
    if(this._mesh){
      this._mesh.position.x = this._worldPosition.x;
      this._mesh.position.y = this._worldPosition.y;
      this._mesh.position.z = this._worldPosition.z;
    }
  }

  hoverVoxel(screenPosition) {

    // check raycast intersection, do we want to hover on mesh or just css?
    // let intersectsHandle = this._raycaster.intersectObject(this._mesh);
    // if(intersectsHandle.length > 0){
    //     this._dom.style.cursor='pointer';
    //     this._hovered = true;
    //     return;
    // }

    // screen intersection
    // let dx = screenPosition.x - this._screenPosition.x;
    // let dy = screenPosition.y - this._screenPosition.y;
    // let distance =  Math.sqrt(dx * dx + dy * dy);
    // this._hoverDistance = distance;
    // if (distance >= 0 && distance < this._hoverThreshold) {
    //   this._dom.style.cursor='pointer';
    //   this._hovered = true;
    // } else {
    //   this._dom.style.cursor='default';
    //   this._hovered = false;
    // }
  }

  updateRaycaster(raycaster, event, container) {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    this._mouse = {
      x: (event.clientX / container.offsetWidth) * 2 - 1,
      y: -(event.clientY / container.offsetHeight) * 2 + 1,
      screenX: event.clientX,
      screenY: event.clientY
    };
    // update the raycaster
    raycaster.setFromCamera(this._mouse, this._camera);
  }

  worldToScreen(worldCoordinate, camera, canvas) {
    let screenCoordinates = worldCoordinate.clone();
    screenCoordinates.project(camera);

    screenCoordinates.x = Math.round((screenCoordinates.x + 1) * canvas.offsetWidth / 2);
    screenCoordinates.y = Math.round((-screenCoordinates.y + 1) * canvas.offsetHeight / 2);
    screenCoordinates.z = 0;

    return screenCoordinates;
  }

  createMesh() {
    // geometry
    this._geometry = new THREE.SphereGeometry( 2, 32, 32 );

    // material
    this._material = new THREE.MeshBasicMaterial({
        wireframe: true,
        wireframeLinewidth: 2
      });
    this._material.color.setHex(this._color);

    // mesh
    this._mesh = new THREE.Mesh(this._geometry, this._material);
    this._mesh.position.x = this._worldPosition.x;
    this._mesh.position.y = this._worldPosition.y;
    this._mesh.position.z = this._worldPosition.z;
    this._mesh.visible = true;

    // add it!
    this.add(this._mesh);
  }


  createDOM() {

    // dom
    this._dom = document.createElement('div');
    this._dom.setAttribute('id', this.uuid);
    this._dom.setAttribute('class', 'widgets handle');
    // this._domStyles.circle();
    // this._domStyles.cross();
    this._dom.style.border = '2px solid #353535';
    this._dom.style.backgroundColor = '#F9F9F9';
    // this._dom.style.backgroundColor = 'rgba(230, 230, 230, 0.7)';
    this._dom.style.color = '#F9F9F9';
    this._dom.style.position = 'absolute';
    this._dom.style.width = '12px';
    this._dom.style.height = '12px';
    this._dom.style.margin = '-6px';
    this._dom.style.borderRadius =  '50%';
    this._dom.style.transformOrigin = '0 100%';

    let posY = this._screenPosition.y - this._container.offsetHeight;
    this._dom.style.transform = `translate3D(${this._screenPosition.x}px, ${posY}px, 0)`;

    // add it!
    this._container.appendChild(this._dom);
  }

  updateDOMPosition(){
    if(this._dom){

      let posY = this._screenPosition.y - this._container.offsetHeight;
      this._dom.style.transform = `translate3D(${this._screenPosition.x}px, ${posY}px, 0)`;
    }
  }

  updateDOMColor(){

  }

  set worldPosition(worldPosition){
    this._worldPosition = worldPosition;
    this._screenPosition = this.worldToScreen(this._worldPosition, this._camera, this._container);
  }

  get worldPosition(){
    return this._worldPosition;
  }

  set active(active){
    this._active = active;
    this._firstRun = this._active;
    this._controls.enabled = !this._active;
  }

  get active(){
    return this._active;
  }
}