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


TerrainConsts = {
	TERRAIN_MAX_HEIGHT:		450, 
	WATER_MIN_HEIGHT:		-150, 
	
	TERRAIN_DEPTH_SCALE:	20, 
	TERRAIN_WIDTH_SCALE:	20, 
	
	TILE_COLUMN_COUNT:		17, 
	TILE_ROW_COUNT:			17, 
	TILE_LOD_COUNT:			1, 
	TILE_COUNT:				17 * 17, // TILE_ROW_COUNT * TILE_COLUMN_COUNT
	
	CELL_COLUMN_COUNT:		16, 
	CELL_ROW_COUNT:			16, 
	CELL_COUNT:				16 * 16, //CELL_COLUMN_COUNT * CELL_ROW_COUNT

	HEIGHT_MAP_DEPTH:		256, 
	HEIGHT_MAP_WIDTH:		256, 
	
	TERRAIN_Z_OFFSET:		128, 
	TERRAIN_X_OFFSET:		128, 

	GRASS_LOWER_THRESHOLD:	-1, 
	GRASS_UPPER_THRESHOLD:	35, //70, 

	GRASS_HEIGHT_OFFSET:	20, 
	GRASS_HEIGHT:			55, 
	GRASS_WIDTH:			30
};



Terrain = function(scene, gl) {
	this.scene = scene;
	this.gl = gl;
	this.datapath = '';
	this.renderers = {
		terrain: null, 
		grass: null, 
		bbox: null
	};
	this.heightmap = null;
	this.watermap = null;
	this.randommap = null;
	this.coveragemap = null;
	this.textures = {
		dirt: null, 
		fungus: null, 
		grass: null, 
		grassPack: null, 
		weight: null
	};
	this.isTextureLoaded = false;
	this.terrainInfo = new HeightMap;
	this.portals = null;
	this.aabb = new SglBox3;
	this.xBounds = [0, 0];
	this.zBounds = [0, 0];
	this.isBBoxesOn = false;
	this.elapsedTime = 0;
	this.visiblePortalCount = 0;
};

Terrain.RenderTokens = {
	AABB:		1, 
	GRASS:		2, 
	TERRAIN:	3
};

Terrain.prototype.onLoad = function(path) {
	this.datapath = path + 'Terrain/';
	this.loadMaps('heightmap.jpg', 'watermap.jpg', 'randommap.png', 'coverage.png');
	this.loadTextures('dirt.png', 'fungus.png', 'grasslayer.png', 'grassPack.png', 'watermap.jpg');
	this.loadShader('TerrainShader.xml', this.renderers, 'terrain');
	this.loadShader('GrassShader.xml', this.renderers, 'grass');
	this.loadBoundingBoxShader();
};

Terrain.prototype.loadMaps = function(heightmapFilename, watermapFilename, randommapFilename, coveragemapFilename) {
	var heightmap = new Image;
	var watermap = new Image;
	var randommap = new Image;
	var coveragemap = new Image;

	var self = this;
	var mapCount = 4;

	heightmap.onload = function() {
		self.heightmap = this;
		if(--mapCount == 0) {
			self.setupTerrain();
		}
	};
	heightmap.onerror = function() {
		err('failed to load: ' + this.src);
	};

	watermap.onload = function() {
		self.watermap = this;
		if(--mapCount == 0) {
			self.setupTerrain();
		}
	};
	watermap.onerror = function() {
		err('failed to load: ' + this.src);
	};

	randommap.onload = function() {
		self.randommap = this;
		if(--mapCount == 0) {
			self.setupTerrain();
		}
	};
	randommap.onerror = function() {
		err('failed to load: ' + this.src);
	};

	coveragemap.onload = function() {
		self.coveragemap = this;
		if(--mapCount == 0) {
			self.setupTerrain();
		}
	};
	coveragemap.onerror = function() {
		err('failed to load: ' + this.src);
	};

	heightmap.src = this.datapath + heightmapFilename;
	watermap.src = this.datapath + watermapFilename;
	randommap.src = this.datapath + randommapFilename;
	coveragemap.src = this.datapath + coveragemapFilename;
};

Terrain.prototype.loadTextures = function(dirtFilename, fungusFilename, grassFilename, grasspackFilename, weightFilename) {
	var self = this;
	var textureCount = 4;
	var onTextureLoad = function() {
		if(--textureCount == 0) {
			self.isTextureLoaded = true;
		}
	}

	var opt = {
		minFilter:			this.gl.LINEAR_MIPMAP_LINEAR, 
		magFilter:			this.gl.LINEAR, 
		wrapS:				this.gl.REPEAT, 
		wrapT:				this.gl.REPEAT, 
		generateMipmap:		true, 
		onload:				onTextureLoad
	};

	this.textures.dirt = new SglTexture2D(this.gl, this.datapath + dirtFilename, opt);
	this.textures.fungus = new SglTexture2D(this.gl, this.datapath + fungusFilename, opt);
	this.textures.grass = new SglTexture2D(this.gl, this.datapath + grassFilename, opt);

	opt.wrapT = this.gl.CLAMP_TO_EDGE;
	this.textures.grassPack = new SglTexture2D(this.gl, this.datapath + grasspackFilename, opt);

	//opt.wrapS = this.gl.CLAMP_TO_EDGE;
	//opt.wrapT = this.gl.CLAMP_TO_EDGE;
	//this.textures.weight = new SglTexture2D(this.gl, this.datapath + weightFilename, opt);
};

Terrain.prototype.loadShader = function(filename, renderers, name) {
	var url = this.datapath + filename;

	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, true);
	xhr.overrideMimeType('text/xml');

	var self = this;

	xhr.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200 || this.status == 0) {
				var xmldoc = this.responseXML;
				// parse the shader
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
					renderers[name] = new SglMeshGLRenderer(program);
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

Terrain.prototype.loadBoundingBoxShader = function() {
	var bbvs =	'uniform   mat4 transformMatrix;\n' + 
				'attribute vec3 position;\n' + 
				'\n' + 
				'void main(void) {\n' + 
				'    gl_Position = transformMatrix * vec4(position, 1.0);\n' + 
				'}';
	var bbps =	'precision mediump float;\n' + 
				'\n' + 
				'void main(void) {\n' + 
				'    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n' + 
				'}';

	var program = new SglProgram(this.gl, [bbvs], [bbps]);
	if(!program.isValid) {
		warn('failed to create bounding box program');
		warn(program.log);
		return;
	}

	this.renderers.bbox = new SglMeshGLRenderer(program);
	info('bounding box shader loaded');
};

Terrain.prototype.setupTerrain = function() {
	if(this.heightmap.width != TerrainConsts.HEIGHT_MAP_WIDTH || this.heightmap.height != TerrainConsts.HEIGHT_MAP_DEPTH) {
		err('height map has unexpected dimensions');
		return;
	}

	if(this.watermap.width != this.heightmap.width || this.watermap.height != this.heightmap.height) {
		err('water map has unexpected dimensions');
		return;
	}

	this.terrainInfo.setup(this.heightmap, this.watermap);
	this.buildPortals();

	this.generateWeightTexture(this.watermap, this.heightmap);
};

Terrain.prototype.generateWeightTexture = function(destmap, srcmap) {
	var w = destmap.width;
	var h = destmap.height;

	var destData = getImageData(destmap);
	var srcData = getImageData(srcmap);

	for(var y=0; y<h; y++) {
		for(var x=0; x<w; x++) {
			var index = y * w + x;
			destData[index * 4 + 1] = srcData[index * 4 + 1];
		}
	}

	var opt = {
		minFilter:			this.gl.LINEAR_MIPMAP_LINEAR, 
		magFilter:			this.gl.LINEAR, 
		wrapS:				this.gl.CLAMP_TO_EDGE, 
		wrapT:				this.gl.CLAMP_TO_EDGE, 
		generateMipmap:		true, 
	};

	this.textures.weight = genTexture2DFromImageData(destData, w, h, opt, this.gl);
};

Terrain.prototype.adjustCamera = function(camera, radius) {
	if(!this.isReady())
		return;

	var pos = camera._position;

	// keep the camera off the borders of the terrain
	if(pos[0] < this.xBounds[0])
		pos[0] = this.xBounds[0];
	else if(pos[0] > this.xBounds[1])
		pos[0] = this.xBounds[1];
	if(pos[2] < this.zBounds[0])
		pos[2] = this.zBounds[0];
	else if(pos[2] > this.zBounds[1])
		pos[2] = this.zBounds[1];

	// force the camera to follow the terrain
	var height = this.terrainInfo.getHeight(pos);
	var off = pos[1] - radius - height;
	if(Math.abs(off) > 0.1) {
		camera.translate(0, -off, 0);
	}
};

Terrain.prototype.update = function(deltaTime) {
	this.elapsedTime += deltaTime;
};

Terrain.prototype.prepare = function(camera, frustum) {
	this.visiblePortalCount = 0;

	if(this.isReady()) {
		for(var i=0; i<this.portals.length; i++) {
			if( this.portals[i].testVisibility(frustum) )
				this.visiblePortalCount++;
		}

		// sort portals before rendering
		if(this.visiblePortalCount > 0) {
			this.sortPortals( this.scene.getApp().getTransformStack() );
		}
	}
};

Terrain.prototype.render = function(camera, frustum, token) {
	var triangleCount = 0;

	if(this.visiblePortalCount > 0) {
		var xform = this.scene.getApp().getTransformStack();

		var w = this.scene.getApp().getWidth();
		var h = this.scene.getApp().getHeight();

		xform.projection.loadIdentity();
		xform.projection.perspective(sglDegToRad(90), w / h, 10, 12000);

		switch(token)
		{
		case Terrain.RenderTokens.TERRAIN:	// render the base terrain pass
			triangleCount += this.renderTerrainPass(xform);
			break;
		case Terrain.RenderTokens.GRASS:	// render the vegetation pass
			triangleCount += this.renderGrassPass(xform);
			break;
		case Terrain.RenderTokens.AABB:		// render the bounding boxes of the portals
			this.renderBoundingBoxes(xform);
			break;
		default:
			break;
		}
	}

	return triangleCount;
};

Terrain.prototype.sortPortals = function(xform) {
	for(var i=0; i<this.portals.length; i++) {
		var portal = this.portals[i];
		if(portal.isVisible()) {
			portal.computeZSortValue(xform.viewMatrixRef);
		}
	}

	var sortFunc = function(p1, p2) {
		var v1 = p1.isVisible();
		var v2 = p2.isVisible();
		if(!v1 && !v2)
			return 0;
		if(v1 && v2)
			return p1.getZSortValue() - p2.getZSortValue();
		if(v1)
			return -1;
		if(v2)
			return 1;
	}

	this.portals.sort(sortFunc);
};

Terrain.prototype.renderTerrainPass = function(xform) {
	var triangleCount = 0;

	this.renderers.terrain.begin();

	this.gl.enable(this.gl.DEPTH_TEST);
	this.gl.enable(this.gl.CULL_FACE);
	this.gl.frontFace(this.scene.getMirrored() ? this.gl.CW : this.gl.CCW);

	var uniforms = {};
	uniforms['transformMatrix'] = xform.viewProjectionMatrix;
	this.renderers.terrain.setUniforms(uniforms);

	var samplers = {};
	samplers['weight'] = this.textures.weight;
	samplers['fungus'] = this.textures.fungus;
	samplers['dirt'] = this.textures.dirt;
	samplers['grass'] = this.textures.grass;
	this.renderers.terrain.setSamplers(samplers);

	for(var i=0; i<this.portals.length; i++) {
		var portal = this.portals[i];
		if(portal.isVisible()) {
			triangleCount += portal.render(this.renderers.terrain, Terrain.RenderTokens.TERRAIN);
		}
	}

	this.renderers.terrain.end();

	return triangleCount;
};

Terrain.prototype.renderGrassPass = function(xform) {
	var triangleCount = 0;

	this.renderers.grass.begin();

	this.gl.disable(this.gl.CULL_FACE);

	var sharedUniforms = {};
	sharedUniforms['transformMatrix'] = xform.viewProjectionMatrix;
	sharedUniforms['elapsedTime'] = this.elapsedTime;
	this.renderers.grass.setUniforms(sharedUniforms);

	var samplers = {};
	samplers['grass'] = this.textures.grassPack;
	this.renderers.grass.setSamplers(samplers);

	/*
		render the 1st grass pass using alpha testing with a high alpha cut-off value
	*/

	var uniforms = {};
	uniforms['alphaReference'] = /*0.25*//*0.9*/0.6;
	uniforms['alphaBooster'] = 1.5;
	uniforms['isBlendEnabled'] = false;
	this.renderers.grass.setUniforms(uniforms);

	for(var i=0; i<this.portals.length; i++) {
		var portal = this.portals[i];
		if(portal.isVisible()) {
			triangleCount += portal.render(this.renderers.grass, Terrain.RenderTokens.GRASS);
		}
	}

	/*
		render the 2nd grass pass using alpha blending with a low alpha cut-off value
	*/

	if(!this.scene.getMirrored()) {
		this.gl.depthMask(this.gl.FALSE);
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);

		uniforms['alphaReference'] = 0.01;
		uniforms['alphaBooster'] = 1.0;
		uniforms['isBlendEnabled'] = true;
		this.renderers.grass.setUniforms(uniforms);

		for(var i=0; i<this.portals.length; i++) {
			var portal = this.portals[i];
			if(portal.isVisible()) {
				triangleCount += portal.render(this.renderers.grass, Terrain.RenderTokens.GRASS);
			}
		}

		this.gl.depthMask(this.gl.TRUE);
		this.gl.disable(this.gl.BLEND);
	}

	this.renderers.grass.end();

	return triangleCount;
};

Terrain.prototype.renderBoundingBoxes = function(xform) {
	if(this.renderers.bbox) {
		this.renderers.bbox.begin();

		this.gl.enable(this.gl.DEPTH_TEST);

		var uniforms = {};
		uniforms['transformMatrix'] = xform.viewProjectionMatrix;
		this.renderers.bbox.setUniforms(uniforms);

		for(var i=0; i<this.portals.length; i++) {
			var portal = this.portals[i];
			if(portal.isVisible()) {
				portal.render(this.renderers.bbox, Terrain.RenderTokens.AABB);
			}
		}

		this.renderers.bbox.end();
	}

	return 0;
};

Terrain.prototype.isReady = function() {
	return this.portals && 
			this.isTextureLoaded && 
			this.renderers.terrain && this.renderers.grass;
};

Terrain.prototype.getAABB = function() {
	return this.aabb;
};

/**
	@private
*/
Terrain.prototype.buildPortals = function() {
	this.portals = new Array(TerrainConsts.CELL_COUNT);

	var xRatio = Math.floor(TerrainConsts.HEIGHT_MAP_WIDTH / TerrainConsts.CELL_COLUMN_COUNT);
	var yRatio = Math.floor(TerrainConsts.HEIGHT_MAP_DEPTH / TerrainConsts.CELL_ROW_COUNT);

	for(var y=0; y<TerrainConsts.CELL_ROW_COUNT; y++) {
		for(var x=TerrainConsts.CELL_COLUMN_COUNT-1; x>=0; x--) {
			var index = y * TerrainConsts.CELL_COLUMN_COUNT + x;
			var xOff = (x == (TerrainConsts.CELL_COLUMN_COUNT - 1)) ? -1 : 0;
			var yOff = (y == (TerrainConsts.CELL_ROW_COUNT - 1)) ? -1 : 0;

			var portal = new Portal(this.gl);
			portal.setup( this.terrainInfo, [x * xRatio + xOff, y * yRatio + yOff], this.randommap, this.coveragemap );
			this.portals[index] = portal;
		}
	}

	// calculate the horizontal bounds which will be used to prevent
	// the camera from moving too close to the borders of the terrain
	for(var i=0; i<this.portals.length; i++) {
		this.aabb.addBox(this.portals[i].getAABB());
	};

	var c = this.aabb.center;
	var s = this.aabb.size;
	this.xBounds = [ c[0] - 0.45 * s[0], c[0] + 0.45 * s[0] ];
	this.zBounds = [ c[2] - 0.45 * s[2], c[2] + 0.45 * s[2] ];

	// debugging code
	var blockCount = 0;
	for(var i=0; i<this.portals.length; i++) {
		blockCount += this.portals[i].getGrassCell().getBlockCount();
	}
	info('totally ' + blockCount + ' grass blocks built');
};
