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


SkyDome = function(scene, gl) {
	this.scene = scene;
	this.gl = gl;
	this.datapath = '';
	this.transform = new Transform;
	this.texture = null;
	this.mesh = null;
	this.aabb = null;
	this.triangleCount = 0;
	this.renderer = null;
	this.skyTimer = 0;
	this.skyInfo = [0.33, 0.5, 1, 0.25];
};

SkyDome.prototype.onLoad = function(path) {
	this.datapath = path + 'Sky/';
	this.loadGroup('SkyGroup.xml');
	this.loadShader('SkyShader.xml');
};

SkyDome.prototype.loadGroup = function(filename) {
	var url = this.datapath + filename;

	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, true);
	xhr.overrideMimeType('text/xml');

	var self = this;

	xhr.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200 || this.status == 0) {
				var xmldoc = this.responseXML;
				// parse the sky dome group
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
				self.loadShape(shapeElem.getAttribute('path'));
				info('loaded: ' + url)
			}
		}
	};

	xhr.onerror = function() {
		err('failed to load ' + url);
	};

	xhr.send();
};

SkyDome.prototype.loadShader = function(filename) {
	var url = this.datapath + filename;

	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, true);
	xhr.overrideMimeType('text/xml');

	var self = this;

	xhr.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200 || this.status == 0) {
				var xmldoc = this.responseXML;
				// parse the sky dome shader
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

SkyDome.prototype.loadShape = function(filename) {
	var url = this.datapath + filename;

	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, true);
	xhr.overrideMimeType('text/xml');

	var self = this;

	xhr.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200 || this.status == 0) {
				var xmldoc = this.responseXML;
				// parse the sky dome shape
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
				var vertices, normals, indices;
				var geometryChildElem = geometryElem.firstElementChild;
				while(geometryChildElem) {
					var rawDataElem = geometryChildElem.firstElementChild;
					if(rawDataElem && rawDataElem.tagName == 'RawData') {
						var data = rawDataElem.textContent.split(' ');
						if(data.length > 0) {
							switch(geometryChildElem.tagName) {
							case 'TexCoords':
								// ignore texture coords, for these will be generated at runtime by the vertex shader
								break;
							case 'Vertices':
								vertices = new Array(data.length);
								for(var i=0; i<data.length; i++) {
									vertices[i] = parseFloat(data[i]);
								}
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
				if(vertices && indices) {
					var meshJS = new SglMeshJS();
					meshJS.addVertexAttribute('position', 3, vertices);
					meshJS.addIndexedPrimitives('triangles', SGL_TRIANGLES_LIST, indices);
					self.mesh = meshJS.toMeshGL(self.gl);
					self.aabb = meshJS.calculateBoundingBox('position').transformed(self.transform.getMatrix());
					self.triangleCount = indices.length / 3;
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

SkyDome.prototype.update = function(deltaTime) {
	this.skyTimer += 0.0125 * this.skyInfo[3] * deltaTime;
};

SkyDome.prototype.render = function(camera) {
	if(this.isReady()) {
		var w = this.scene.getApp().getWidth();
		var h = this.scene.getApp().getHeight();

		var xform = this.scene.getApp().getTransformStack();

		xform.projection.loadIdentity();
		xform.projection.perspective(sglDegToRad(90), w / h, 25, 12000);

		xform.model.load(this.transform.getMatrix());

		this.renderer.begin();

		this.gl.enable(this.gl.CULL_FACE);
		this.gl.frontFace(this.scene.getMirrored() ? this.gl.CW : this.gl.CCW);

		var uniforms = {};
		uniforms['transformMatrix'] = xform.modelViewProjectionMatrix;
		uniforms['skyInfo'] = this.skyInfo;
		uniforms['params'] = sglV3toV4(this.aabb.size, this.skyTimer);
		uniforms['offset'] = sglMulV3S(this.aabb.min, -1);
		this.renderer.setUniforms(uniforms);

		var samplers = {};
		samplers['noise'] = this.texture;
		this.renderer.setSamplers(samplers);

		this.renderer.renderMeshPrimitives(this.mesh, 'triangles');

		this.renderer.end();

		return this.triangleCount;
	}

	return 0;
};

SkyDome.prototype.isReady = function() {
	return this.renderer && this.mesh && 
			this.texture && this.texture.isValid;
};
