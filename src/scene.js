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


Scene = function(app, gl) {
	this.app = app;
	this.gl = gl;

	this.skyDome = null;
	this.terrain = null;
	this.water = null;

	this.isMirrored = false;

	this.camera = new SglFirstPersonCamera;
	this.frustum = new SglFrustum;

	this.speed = [0, 0, 0];
};

Scene.prototype.onLoad = function(path) {
	this.skyDome = new SkyDome(this, this.gl);
	this.skyDome.onLoad(path);

	this.terrain = new Terrain(this, this.gl);
	this.terrain.onLoad(path);

	this.water = new Water(this, this.gl);
	this.water.onLoad(path);

	// set the initial position and angles of the camera
	this.camera.translate(139.24, 92.14, -2262.80);
	this.camera.rotate(0, sglDegToRad(180), 0);
};

Scene.prototype.update = function(deltaTime) {
	this.updateCamera(deltaTime);

	this.skyDome.update(deltaTime);
	this.terrain.update(deltaTime);
	this.water.update(deltaTime);
};

Scene.prototype.render = function() {
	var triangleCount = 0;

	var w = this.app.getWidth();
	var h = this.app.getHeight();

	var xform = this.app.getTransformStack();

	xform.projection.loadIdentity();
	xform.projection.perspective(sglDegToRad(90), w / h, 10, 4000);
	xform.view.load(this.camera.matrix);

	// setup view frustum for culling
	this.frustum.setup(xform.projectionMatrixRef, xform.viewMatrixRef, [0, 0, w, h]);

	// check if the water is in view frustum
	var isWaterVisible = this.water.testVisibility(this.frustum);

	// render the reflection of the scene on the water surface
	if(isWaterVisible) {
		this.water.beginReflectionRT(this.camera);
		triangleCount += this.terrain.render(this.camera, this.frustum);
		triangleCount += this.skyDome.render(this.camera);
		this.water.endReflectionRT();
	}

	// render terrian
	triangleCount += this.terrain.render(this.camera, this.frustum);

	// render water
	if(isWaterVisible) {
		triangleCount += this.water.render(this.camera);
	}

	// render the sky dome
	triangleCount += this.skyDome.render(this.camera);

	return triangleCount;
};

Scene.prototype.getApp = function() {
	return this.app;
};

Scene.prototype.getMirrored = function() {
	return this.isMirrored;
};

Scene.prototype.setMirrored = function(isMirrored) {
	this.isMirrored = isMirrored;
};

Scene.prototype.getSkyDome = function() {
	return this.skyDome;
};

Scene.prototype.getTerrain = function() {
	return this.terrain;
};

Scene.prototype.getWater = function() {
	return this.water;
};

Scene.prototype.toggleBoundingBoxes = function() {
	this.terrain.setBoundingBoxesOn(!this.terrain.getBoundingBoxesOn());
};

Scene.prototype.updateCamera = function(deltaTime) {
	/*
		set camera orientation
	*/

	if(this.app.getButtonDown()) {
		var mouseMovement = this.app.getMouseMovement();
		var yawOffset = -mouseMovement[0] * Math.PI * 2 / this.app.getWidth();
		var pitchOffset = mouseMovement[1] * Math.PI * 2 / this.app.getHeight();

		this.camera.rotate(pitchOffset, yawOffset, 0);

		var pitch = sglClamp(this.camera._angles[0], -Math.PI / 4, Math.PI / 4);
		this.camera._angles[0] = pitch;
	}

	/*
		set camera movements
	*/

	var keyStates = this.app.getKeyStates();
	var vel = 10;
	if(keyStates[38] || keyStates[87])		// forward
		this.speed[2] -= vel * deltaTime;
	if(keyStates[40] || keyStates[83])		// backward
		this.speed[2] += vel * deltaTime;
	if(keyStates[37] || keyStates[65])		// left
		this.speed[0] -= vel * deltaTime;
	if(keyStates[39] || keyStates[68])		// right
		this.speed[0] += vel * deltaTime;

	sglSelfSubV3(this.speed, sglMulV3S(this.speed, 0.1));
	if(Math.abs(this.speed[0]) < 0.1)
		this.speed[0] = 0;
	if(Math.abs(this.speed[1]) < 0.1)
		this.speed[1] = 0;
	if(Math.abs(this.speed[2]) < 0.1)
		this.speed[2] = 0;

	this.camera.translate(this.speed[0], this.speed[1], this.speed[2]);

	// adjust the camera to follow the terrain
	this.terrain.adjustCamera(this.camera, 60);
};
