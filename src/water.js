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


Water = function(scene, gl) {
	this.gl = gl;
	this.scene = scene;
	this.datapath = '';
	this.transform = new Transform;
	this.mesh = null;
	this.aabb = null;
	this.triangleCount = 0;
	this.texture = null;
	this.surfaceFB = null;
	this.waterMatrix = sglIdentityM4();
	this.cameraPosition = [0, 0, 0];
	this.translation = [0, 0, 0];
	this.terrainInfo = [0, 0, 0, 0];
	this.renderer = null;
	this.elapsedTime = 0;
};

Water.prototype.onLoad = function(path) {
	this.datapath = path + 'Water/';
	this.loadGroup('WaterGroup.xml');
	this.loadShader('WaterShader.xml');

	var fbOpt = { depthAsRenderbuffer: true };
	this.surfaceFB = new SglFramebuffer(this.gl, 256, 256, [this.gl.RGBA], this.gl.DEPTH_COMPONENT16, null, fbOpt);
};

/**
	@private
*/
Water.prototype.loadGroup = function(filename) {
	var url = this.datapath + filename;

	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, true);
	xhr.overrideMimeType('text/xml');

	var self = this;

	xhr.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200 || this.status == 0) {
				var xmldoc = this.responseXML;
				// parse water group
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

/**
	@private
*/
Water.prototype.loadShader = function(filename) {
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

/**
	@private
*/
Water.prototype.loadShape = function(filename) {
	var url = this.datapath + filename;

	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, true);
	xhr.overrideMimeType('text/xml');

	var self = this;

	xhr.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200 || this.status == 0) {
				var xmldoc = this.responseXML;
				// parse the water shape
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
				var vertices, normals, texCoords, indices;
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
					meshJS.addVertexAttribute('texCoord0', 2, texCoords);
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

Water.prototype.update = function(deltaTime) {
	this.elapsedTime += deltaTime;
};

Water.prototype.beginReflectionRT = function(camera) {
	var w = this.scene.getApp().getWidth();
	var h = this.scene.getApp().getHeight();

	this.gl.viewport(0, 0, this.surfaceFB.width, this.surfaceFB.height);

	var xform = this.scene.getApp().getTransformStack();

	xform.projection.push();
	xform.projection.loadIdentity();
	xform.projection.perspective(sglDegToRad(90), w / h, 10, 4000);

	var projection = sglPerspectiveM4(sglDegToRad(90), w / h, 4, 7500);

	var viewMatrixInverseTranspose = sglTransposeM4(sglInverseM4(camera.matrix));
	var clipPlane = sglMulM4V4(viewMatrixInverseTranspose, [0, -1, 0, 0]);
	this.modifyProjectionMatrix(clipPlane);

	copyV3(this.cameraPosition, camera._position);

	var transformMatrix = this.transform.getMatrix();

	assignV3(this.translation, transformMatrix[12], transformMatrix[13], transformMatrix[14]);

	this.waterMatrix = [
		0.5, 0,   0,   0, 
		0,   0.5, 0,   0, 
		0,   0,   0.5, 0, 
		0.5, 0.5, 0.5, 1
	];
	this.waterMatrix = sglMulM4(this.waterMatrix, sglMulM4(projection, camera.matrix));

	assignV4(	this.terrainInfo, 
				-TerrainConsts.TERRAIN_X_OFFSET * TerrainConsts.TERRAIN_WIDTH_SCALE, 
				-TerrainConsts.TERRAIN_Z_OFFSET * TerrainConsts.TERRAIN_DEPTH_SCALE, 
				 TerrainConsts.TERRAIN_WIDTH_SCALE * 255, 
				 TerrainConsts.TERRAIN_DEPTH_SCALE * 255 );

	this.surfaceFB.bind();

	this.gl.clearColor(0, 0, 0, 1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	this.scene.setMirrored(true);

	xform.view.push();
	xform.view.translate(0, transformMatrix[13], 0);
	xform.view.scale(1, -1, 1);
};

Water.prototype.endReflectionRT = function() {
	// restore view matrix and projection matrix
	var xform = this.scene.getApp().getTransformStack();
	xform.view.pop();
	xform.projection.pop();

	this.scene.setMirrored(false);

	// unbind the framebuffer
	this.surfaceFB.unbind();

	// restore viewport
	var w = this.scene.getApp().getWidth();
	var h = this.scene.getApp().getHeight();
	this.gl.viewport(0, 0, w, h);
};

Water.prototype.render = function(camera) {
	if(this.isReady()) {
		var w = this.scene.getApp().getWidth();
		var h = this.scene.getApp().getHeight();

		var xform = this.scene.getApp().getTransformStack();
		xform.model.load(this.transform.getMatrix());

		this.renderer.begin();

		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.CULL_FACE);
		this.gl.frontFace(this.gl.CCW);
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);

		var uniforms = {};
		uniforms['transformMatrix'] = xform.modelViewProjectionMatrix;
		uniforms['translation'] = this.translation;
		uniforms['camera'] = this.cameraPosition;
		uniforms['elapsedTime'] = this.elapsedTime;
		uniforms['waterMatrix'] = this.waterMatrix;
		uniforms['terrainInfo'] = this.terrainInfo;
		this.renderer.setUniforms(uniforms);

		var samplers = {};
		samplers['reflection'] = this.surfaceFB.colorTargets[0];
		samplers['normalmap'] = this.texture;
		this.renderer.setSamplers(samplers);

		this.renderer.renderMeshPrimitives(this.mesh, 'triangles');

		this.gl.disable(this.gl.BLEND);

		this.renderer.end();

		return this.triangleCount;
	}

	return 0;
};

Water.prototype.testVisibility = function(frustum) {
	if(!this.mesh)
		return false;

	return frustum.boxVisibility(this.aabb.min, this.aabb.max) != SGL_OUTSIDE_FRUSTUM;
};

Water.prototype.isReady = function() {
	return this.renderer && this.mesh && 
			this.texture && this.texture.isValid;
};

/**
	@private
*/
Water.prototype.modifyProjectionMatrix = function(clipPlane) {
	var xform = this.scene.getApp().getTransformStack();
	var mat = xform.projectionMatrix;

	var q = [
		(sign(clipPlane[0]) + mat[8] ) / mat[0], 
		(sign(clipPlane[1]) + mat[9] ) / mat[5], 
		          -1, 
		(          1        + mat[10]) / mat[14]
	];

	var c = sglMulV4S(clipPlane, 2 / sglDotV4(clipPlane, q));

	mat[2]  = c[0];
	mat[6]  = c[1];
	mat[10] = c[2] + 1;
	mat[14] = c[3];

	xform.projection.load(mat);
};
