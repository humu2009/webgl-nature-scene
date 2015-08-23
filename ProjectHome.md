_The Cloudy-Mountains lie,_<br>
<i>See the Chille-River pass by,</i><br>
<i>Like a big dome is the sky,</i><br>
<i>Covering the prairie nigh.</i><br>
<i>The lofty sky is deeply blue,</i><br>
<i>The vast wildness not seen through.</i><br>
<i>The wind lowering grass in green,</i><br>
<i>Sheep and cattle are easily seen.</i><br>
<blockquote>----  <i>A folk rhyme from the North-Dynasty, China</i></blockquote>

<h1>Introduction</h1>

This is a technical demo based upon NVIDIA's <i>Nature</i> demo project. It is an effort to integrate some interesting shader based rendering techniques to present realistic-looking nature scene on web using Javascript and WebGL. The techniques applied in this demo include:<br>
<ul><li>Multi-layered Terrain<br>
</li><li>Waving Grass with Countless Blades<br>
</li><li>Realistic Water Simulation with Reflection and Refraction<br>
</li><li>Dynamic Cloudy Sky Dome<br>
</li><li>Flying Birds with Flocking Behaviour<br>
A detailed talk on most of these techniques can be found in <i>GPU Gems I</i> and <i>II</i>.<br>
The bird flock simulation is based on <i>Boids</i> algorithm that was introduced by <i>Craig Reynolds</i>.</li></ul>

<table><thead><th><a href='http://webgl-nature-scene.googlecode.com/svn/trunk/nature.html'><img src='http://webgl-nature-scene.googlecode.com/svn/screenshots/small10.jpg' /></a></th></thead><tbody></tbody></table>

<b>Controls:</b><br>
<ul><li>Use the arrow keys or W, A, S, D to move around.<br>
</li><li>Drag the mouse to change the orientation of the camera.<br>
</li><li>Press B to toggle display of the bounding boxes of the terrain cells.<br>
</li><li>Press T to toggle display of the statistic panel.</li></ul>

You should have a <a href='http://www.khronos.org/webgl/wiki_1_15/index.php/Getting_a_WebGL_Implementation'>WebGL</a> enabled browser to run this demo. More screenshots can be found <a href='http://code.google.com/p/webgl-nature-scene/wiki/Screenshots'>here</a>.