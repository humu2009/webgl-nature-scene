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

Bird = function(boid, transform, cycleInterval) {
	this.boid = boid;
	this.transform = new Transform;
	this.transform.setTranslation(transform.getTranslation());
	this.transform.setRotation(transform.getRotation());
	this.transform.setScale(transform.getScale());
	this.cycleInterval = cycleInterval;
};

Bird.prototype.update = function(boids, deltaTime) {
	this.boid.run(boids, deltaTime);

	var velocity = this.boid.getVelocity();
	this.transform.setRotation( [ 0, Math.atan2(- velocity[2], velocity[0]), Math.asin(velocity[1] / sglLengthV3(velocity)) ] );
	this.transform.setTranslation(this.boid.getPosition());
};

Bird.prototype.getCycleInterval = function() {
	return this.cycleInterval;
};

Bird.prototype.getModelMatrix = function() {
	return this.transform.getMatrix();
};



Birds = function(scene, gl) {
	this.scene = scene;
	this.gl = gl;
	this.datapath = '';
	this.transform = new Transform;
	this.renderer = null;
	this.texture = null;
	this.mesh = null;
	this.meshAABB = new SglBox3;
	this.maxKeyframeCount = 5;
	this.keyframeCount = 0;
	this.triangleCount = 0;
	this.boids = [];
	this.birdInstances = [];
	this.elapsedTime = 0;
};

Birds.prototype.onLoad = function(path) {
	this.datapath = path + 'Bird/';
	this.loadGroup('BirdGroup.xml');
	this.loadShader('BirdShader.xml');
	this.init();
};

Birds.prototype.loadGroup = function(filename) {
	var url = this.datapath + filename;

	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, true);
	xhr.overrideMimeType('text/xml');

	var self = this;

	xhr.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200 || this.status == 0) {
				var xmldoc = this.responseXML;
				// parse bird group
				var groupElem = xmldoc.firstChild;
				if(!groupElem || groupElem.tagName != 'Group') {
					err('invalid format: ' + url);
					return;
				}
				var transformElem = groupElem.firstElementChild;
				if(!transformElem || transformElem.tagName != 'Transform') {
					err('invalid format: ' + url);
					return;
				}
				var transformChildElem = transformElem.firstElementChild;
				while(transformChildElem) {
					var tuple3;
					if(transformChildElem.hasAttribute('x') && transformChildElem.hasAttribute('y') && transformChildElem.hasAttribute('z')) {
						tuple3 = [ 
							parseFloat(transformChildElem.getAttribute('x')), 
							parseFloat(transformChildElem.getAttribute('y')), 
							parseFloat(transformChildElem.getAttribute('z'))
						];
					}
					switch(transformChildElem.tagName) {
					case 'Translations':
						if(tuple3)
							self.transform.setTranslation(tuple3);
						break;
					case 'Rotations':
						if(tuple3)
							self.transform.setRotation(tuple3);
						break;
					case 'Scales':
						if(tuple3)
							self.transform.setScale(tuple3);
						break;
					default:
						break;					
					}
					transformChildElem = transformChildElem.nextElementSibling;
				}
				var shapeElem = transformElem.nextElementSibling;
				if(!shapeElem || shapeElem.tagName != 'Shape') {
					err('invalid format: ' + url);
					return;
				}
				if(!shapeElem.hasAttribute('path')) {
					err('shape is not defined: ' + url);
					return;
				}
				self.loadAnimatedShape(shapeElem.getAttribute('path'));
				info('loaded: ' + url)
			}
		}
	};

	xhr.onerror = function() {
		err('failed to load ' + url);
	};

	xhr.send();
};

Birds.prototype.loadShader = function(filename) {
	var url = this.datapath + filename;

	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, true);
	xhr.overrideMimeType('text/xml');

	var self = this;

	xhr.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200 || this.status == 0) {
				var xmldoc = this.responseXML;
				// parse the bird shader
				var shadersElem = xmldoc.firstChild;
				if(!shadersElem || shadersElem.tagName != 'Shaders') {
					err('invalid format: ' + url);
					return;
				}
				var vs, ps;
				var vertexShaderElem = shadersElem.firstElementChild;
				if(!vertexShaderElem || vertexShaderElem.tagName != 'VERTEX_SHADER') {
					err('vertex shader is not defined: ' + url);
					return;
				}
				var vertexShaderChildElem = vertexShaderElem.firstElementChild;
				while(vertexShaderChildElem) {
					if(vertexShaderChildElem.tagName == 'RawData') {
						vs = vertexShaderChildElem.textContent;
						break;
					}
					vertexShaderChildElem = vertexShaderChildElem.nextElementSibling;
				}
				var pixelShaderElem = vertexShaderElem.nextElementSibling;
				if(!pixelShaderElem || pixelShaderElem.tagName != 'PIXEL_SHADER') {
					err('pixel shader is not defined: ' + url);
					return;
				}
				var pixelShaderChildElem = pixelShaderElem.firstElementChild;
				while(pixelShaderChildElem) {
					if(pixelShaderChildElem.tagName == 'RawData') {
						ps = pixelShaderChildElem.textContent;
						break;
					}
					pixelShaderChildElem = pixelShaderChildElem.nextElementSibling;
				};
				if(vs && ps) {
					var program = new SglProgram(self.gl, [vs], [ps]);
					if(!program.isValid) {
						err('failed to create program: ' + url);
						err(program.log);
						return;
					}
					self.renderer = new SglMeshGLRenderer(program);
					info('loaded: ' + url);
				}
			}
		}
	};

	xhr.onerror = function() {
		err('failed to load ' + url);
	};

	xhr.send();
};

/**
	@private
*/
Birds.prototype.loadAnimatedShape = function(filename) {
	var url = this.datapath + filename;

	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, true);
	xhr.overrideMimeType('text/xml');

	var self = this;

	xhr.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200 || this.status == 0) {
				var xmldoc = this.responseXML;
				// parse the bird shape
				var shapeElem = xmldoc.firstChild;
				if(!shapeElem || shapeElem.tagName != 'Shape') {
					err('invalid format: ' + url);
					return;
				}
				// parse appearance
				var appearanceElem = shapeElem.firstElementChild;
				if(!appearanceElem || appearanceElem.tagName != 'Appearance') {
					err('invalid format: ' + url);
					return;
				}
				// parse texture 
				var textureElem = appearanceElem.firstElementChild;
				if(!textureElem || textureElem.tagName != 'Texture') {
					err('texture is not defined: ' + url);
					return;
				}
				if(textureElem.hasAttribute('path')) {
					var path = '';
					var mipmap = false;
					var wrapS = self.gl.CLAMP_TO_EDGE;
					var wrapT = self.gl.CLAMP_TO_EDGE;
					var minFilter = self.gl.NEAREST;
					var magFilter = self.gl.NEAREST;
					path = textureElem.getAttribute('path');
					mipmap = (textureElem.getAttribute('mipmap') == 'true') ? true : false;
					var textureChildElem = textureElem.firstElementChild;
					while(textureChildElem) {
						switch(textureChildElem.tagName) {
						case 'Wrap':
							wrapS = (textureChildElem.getAttribute('s') == 'REPEAT') ? self.gl.REPEAT : self.gl.CLAMP_TO_EDGE;
							wrapT = (textureChildElem.getAttribute('t') == 'REPEAT') ? self.gl.REPEAT : self.gl.CLAMP_TO_EDGE;
							break;
						case 'Filter':
							minFilter = (textureChildElem.getAttribute('min') == 'LINEAR_MIPMAP_LINEAR') ? (mipmap ? self.gl.LINEAR_MIPMAP_LINEAR : self.gl.LINEAR) : self.gl.NEAREST;
							magFilter = (textureChildElem.getAttribute('mag') == 'LINEAR') ? self.gl.LINEAR : self.gl.NEAREST;
							break;
						default:
							break;
						}
						textureChildElem = textureChildElem.nextElementSibling;
					}
					if(path != '') {
						var opt = {
							minFilter:			minFilter, 
							magFilter:			magFilter, 
							wrapS:				wrapS, 
							wrapT:				wrapT, 
							generateMipmap:		mipmap
						};
						self.texture = new SglTexture2D(self.gl, self.datapath + path, opt);
					}
				}
				// parse geometry
				var geometryElem = appearanceElem.nextElementSibling;
				if(!geometryElem || geometryElem.tagName != 'Geometry') {
					err('geometry is not defined: ' + url);
					return;
				}
				var vertices = [];
				var normals, texCoords, indices;
				var geometryChildElem = geometryElem.firstElementChild;
				while(geometryChildElem) {
					var rawDataElem = geometryChildElem.firstElementChild;
					if(rawDataElem && rawDataElem.tagName == 'RawData') {
						var data = rawDataElem.textContent.split(' ');
						if(data.length > 0) {
							switch(geometryChildElem.tagName) {
							case 'TexCoords':
								texCoords = new Array(data.length);
								for(var i=0; i<data.length; i++) {
									texCoords[i] = parseFloat(data[i]);
								}
								break;
							case 'Vertices':
								var verts = new Array(data.length);
								for(var i=0; i<data.length; i++) {
									verts[i] = parseFloat(data[i]);
								}
								vertices.push(verts);
								break;
							case 'Normals':
								normals = new Array(data.length);
								for(var i=0; i<data.length; i++) {
									normals[i] = parseFloat(data[i]);
								}
								break;
							case 'Indices':
								indices = new Array(data.length);
								for(var i=0; i<data.length; i++) {
									indices[i] = parseInt(data[i]);
								}
								break;
							default:
								break;
							}
						}
					}
					geometryChildElem = geometryChildElem.nextElementSibling;
				}
				if(vertices.length > 0) {
					var meshJS = new SglMeshJS();
					var keyframeCount = Math.min(vertices.length, self.maxKeyframeCount);
					for(var i=0; i<keyframeCount; i++) {
						meshJS.addVertexAttribute('position' + i, 3, vertices[i]);
					}					
					meshJS.addVertexAttribute('texCoord0', 2, texCoords);
					if(indices) {
						meshJS.addIndexedPrimitives('triangles', SGL_TRIANGLES_LIST, indices);
					}
					else {
						meshJS.addArrayPrimitives('triangles', SGL_TRIANGLES_LIST, 0, vertices[0].length / 3);
					}
					for(var i=0; i<keyframeCount; i++) {
						self.meshAABB.addBox(meshJS.calculateBoundingBox('position' + i).transformed(self.transform.getMatrix()));
					}
					self.mesh = meshJS.toMeshGL(self.gl);
					self.keyframeCount = keyframeCount;
					self.triangleCount = indices ? (indices.length / 3) : (vertices[0].length / 9);
				}
				info('loaded: ' + url);
			}
		}
	};

	xhr.onerror = function() {
		err('failed to load ' + url);
	};

	xhr.send();
};

Birds.prototype.update = function(deltaTime) {
	this.elapsedTime += deltaTime;

	for(var i=0; i<this.birdInstances.length; i++) {
		this.birdInstances[i].update(this.boids, deltaTime);
	}
};

Birds.prototype.render = function(camera) {
	if(this.isReady()) {
		this.renderer.begin();

		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.disable(this.gl.CULL_FACE);
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);

		var samplers = {};
		samplers['texture'] = this.texture;
		this.renderer.setSamplers(samplers);

		var sharedUniforms = {};
		sharedUniforms['keyframeCount'] = this.keyframeCount;
		sharedUniforms['elapsedTime'] = this.elapsedTime;
		this.renderer.setUniforms(sharedUniforms);

		var w = this.scene.getApp().getWidth();
		var h = this.scene.getApp().getHeight();

		var xform = this.scene.getApp().getTransformStack();

		xform.projection.loadIdentity();
		xform.projection.perspective(sglDegToRad(90), w / h, 25, 10000);

		this.renderer.beginMesh(this.mesh);
		this.renderer.beginPrimitives('triangles');

		var uniforms = {};
		for(var i=0; i<this.birdInstances.length; i++) {
			var bird = this.birdInstances[i];

			xform.model.load(bird.getModelMatrix());

			uniforms['transformMatrix'] = xform.modelViewProjectionMatrix;
			uniforms['cycleInterval'] = bird.getCycleInterval();
			this.renderer.setUniforms(uniforms);

			this.renderer.render();
		}

		this.renderer.endPrimitives();
		this.renderer.endMesh();

		this.gl.disable(this.gl.BLEND);

		this.renderer.end();

		return this.triangleCount * this.birdInstances.length;
	}

	return 0;
};

Birds.prototype.isReady = function() {
	return this.renderer && this.mesh && 
			this.texture && this.texture.isValid;
};

/**
	@private
*/
Birds.prototype.init = function() {
	var self = this;
	var deferredInit = function() {
		var terrain = self.scene.getTerrain();
		if(self.isReady() && terrain.isReady()) {
			const BIRD_COUNT      = 20;
			const BIRD_MAX_SPEED  = 800;

			var meshSize = self.meshAABB.size;
			var neighborhoodRadius = 5 * self.meshAABB.diagonal;
			var terrainBox = terrain.getAABB();
			var tboxCenter = terrainBox.center;
			var tboxSize = terrainBox.size;
			var activityBox = new SglBox3( sglSubV3(tboxCenter, sglMulV3S(tboxSize, 0.75)), sglAddV3(tboxCenter, sglMulV3S(tboxSize, 0.75)) );
			activityBox.min[1] = terrainBox.max[1]  + 0.5 * terrainBox.size[1];
			activityBox.max[1] = activityBox.min[1] + 1.5 * terrainBox.size[1];
			var aboxCenter = activityBox.center;
			var aboxSize = activityBox.size;

			for(var i=0; i<BIRD_COUNT; i++) {
				var boid = new Boid(neighborhoodRadius, BIRD_MAX_SPEED, 0.1);
				var init_pos = [ (Math.random() - 0.5) * aboxSize[0] + aboxCenter[0], 
								 (Math.random() - 0.5) * aboxSize[1] + aboxCenter[1], 
								 (Math.random() - 0.5) * aboxSize[2] + aboxCenter[2] ];
				var init_vel = [ (Math.random() - 0.5) * BIRD_MAX_SPEED, 
								 0, 
								 (Math.random() - 0.5) * BIRD_MAX_SPEED ];
				boid.setPosition(init_pos);
				boid.setVelocity(init_vel);
				boid.setWorldBox(activityBox);

				self.boids.push(boid);
				self.birdInstances.push( new Bird(boid, self.transform, Math.random() + 0.5) );
			}
		}
		else {
			setTimeout(deferredInit, 200);
		}
	};

	deferredInit();
};
