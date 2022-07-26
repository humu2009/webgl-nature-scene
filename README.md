# WebGL Implemented Nature Scene
Automatically exported from code.google.com/p/webgl-nature-scene

> _The Cloudy-**Mountains** lie,_<br>
_See the Chille-**River** pass by,_<br>
_Like a big **dome** is the **sky**,_<br>
_Covering the prairie nigh._<br>
_The lofty sky is deeply blue,_<br>
_The vast wildness not seen through._<br>
_The **wind** lowering **grass** in green,_<br>
_Sheep and cattle are easily seen._

---- _A folk song from the North-Dynasty, China, by poet unknown_
 
 ## Introduction
 This is a tech demo based on NVIDIA's _Nature_ demo project. It experiments some interesting shader based rendering techniques to present realistic-looking nature scene on web using Javascript and WebGL, which include:
 
  - [x] **Terrain**: Multi-layered terrain with tiles
  - [x] **Vegetation**: Waving grass with almost countless blades
  - [x] **Waterbody**: Realistic water simulation with reflection and refraction
  - [x] **Environment**: Dynamic cloudy sky dome
  - [x] **Creature**: Flying birds with flocking behaviour
  
A detailed talk on most of these techniques can be found in _GPU Gems I_ and _II_.<br>
The bird flock simulation is based on _Boids_ algorithm that was introduced by _Craig Reynolds_.

## Try it
[![Launch this demo](https://raw.github.com/humu2009/webgl-nature-scene/wiki/screenshots/large00.jpg)](http://humu2009.github.io/webgl-nature-scene/nature.html)

_Controls:_
  * Use the arrow keys or **W**, **A**, **S**, **D** to move around.
  * Drag the mouse pointer to change the orientation of the camera.
  * Press **B** to toggle display of the bounding boxes of the terrain tiles.
  * Press **T** to toggle display of the statistic panel.
