/**
	@preserve Copyright (c) 2011 Humu humu2009@gmail.com
	This file is freely distributable under the terms of the MIT license.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
**/


NatureApp = function() {
	this.uiFrame = null;
	this.scene = null;

	this.keyStates = new Array(256);
	this.isButtonDown = false;
	this.mousePosition = [0, 0];
	this.mouseMovement = [0, 0];

	this.xform = new SglTransformStack;

	this.dataPath = 'data/';

	// overwrite SpiderGL's default prefix for all uniform names
	SGL_DefaultStreamMappingPrefix = '';

	this.fps = 0;
	this.lastTime = 0;
	this.currentTime = 0;
	this.frameCount = 0;

	this.stats = null;
	this.isStatsOn = true;
};

NatureApp.prototype.load = function(gl) {
	this.stats = document.getElementById('SCENE_STATS');

	for(var i=0; i<256; i++) {
		this.keyStates[i] = false;
	}

	this.uiFrame = new UI(this);
	this.scene = new Scene(this, gl);
	this.scene.onLoad(this.dataPath);
};

NatureApp.prototype.unload = function(gl) {
};

NatureApp.prototype.keyDown = function(gl, keyCode, keyString) {
	this.keyStates[keyCode] = true;
};

NatureApp.prototype.keyUp = function(gl, keyCode, keyString) {
	this.keyStates[keyCode] = false;

	if(keyCode == 84) {			// 'T'
		this.toggleStatistics();
	}
	else if(keyCode == 66) {	// 'B'
		this.toggleBoundingBoxes();
	}
};

NatureApp.prototype.keyPress = function(gl, keyCode, keyString) {
};

NatureApp.prototype.mouseDown = function(gl, button, x, y) {
	if(button == 0) {
		this.isButtonDown = true;
	}

	assignV2(this.mousePosition, x, y);
	assignV2(this.mouseMovement, 0, 0);
};

NatureApp.prototype.mouseUp = function(gl, button, x, y) {
	if(button == 0) {
		this.isButtonDown = false;
	}
};

NatureApp.prototype.mouseMove = function(gl, x, y) {
	if(this.isButtonDown) {
		this.mouseMovement[0] = x - this.mousePosition[0];
		this.mouseMovement[1] = y - this.mousePosition[1];
		assignV2(this.mousePosition, x, y);
	}
};

NatureApp.prototype.mouseWheel = function(gl, delta, x, y) {
};

NatureApp.prototype.click = function(gl, button, x, y) {
};

NatureApp.prototype.dblClick = function(gl, button, x, y) {
};

NatureApp.prototype.resize = function(gl, width, height) {
};

NatureApp.prototype.update = function(gl, deltaTime) {
	this.scene.update(deltaTime);
	this.currentTime += deltaTime;
};

NatureApp.prototype.draw = function(gl) {
	var w =  this.ui.width;
	var h = this.ui.height;

	// clear the framebuffers
	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// set the viewport
	gl.viewport(0, 0, w, h);

	// render the scene
	var triangleCount = this.scene.render();

	// show statistics
	if(this.stats) {
		this.updateFPS();
		this.stats.innerHTML =	'TRI: ' + triangleCount + '<br>' + 
								'FPS: ' + this.fps;
	}
};

NatureApp.prototype.getWidth = function() {
	return this.ui.width;
};

NatureApp.prototype.getHeight = function() {
	return this.ui.height;
};

NatureApp.prototype.getTransformStack = function() {
	return this.xform;
};

NatureApp.prototype.getKeyStates = function() {
	return this.keyStates;
};

NatureApp.prototype.getButtonDown = function() {
	return this.isButtonDown;
};

NatureApp.prototype.getMouseMovement = function() {
	return this.mouseMovement;
};

NatureApp.prototype.toggleBoundingBoxes = function() {
	this.scene.toggleBoundingBoxes();
};

NatureApp.prototype.toggleStatistics = function() {
	if(this.stats) {
		if(this.isStatsOn)
			this.stats.style['display'] = 'none';
		else
			this.stats.style['display'] = 'block';
	}

	this.isStatsOn = !this.isStatsOn;
};

NatureApp.prototype.updateFPS = function() {
	// fps will be re-calculated per 10 frames
	if(++this.frameCount % 10 == 0) {
		this.fps = Math.floor(0.5 + 10 / (this.currentTime - this.lastTime));
		this.lastTime = this.currentTime;
	}
};


sglRegisterCanvas('SCENE_CANVAS', new NatureApp(), 16);
