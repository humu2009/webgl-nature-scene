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


function sign(n) {
	if(n > 0)
		return 1;
	if(n < 0)
		return -1;

	return 0;
}



function copyV2(u, v) {
	u[0] = v[0];
	u[1] = v[1];
}



function copyV3(u, v) {
	u[0] = v[0];
	u[1] = v[1];
	u[2] = v[2];
}



function copyV4(u, v) {
	u[0] = v[0];
	u[1] = v[1];
	u[2] = v[2];
	u[3] = v[3];
}



function assignV2(v, x, y) {
	v[0] = x;
	v[1] = y;
}



function assignV3(v, x, y, z) {
	v[0] = x;
	v[1] = y;
	v[2] = z;
}



function assignV4(v, x, y, z, w) {
	v[0] = x;
	v[1] = y;
	v[2] = z;
	v[3] = w;
}



function distanceV3(u, v) {
	var dx = u[0] - v[0];
	var dy = u[1] - v[1];
	var dz = u[2] - v[2];
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};



function getImageData(img) {
	var isCanvasClean = false;

	if(!image_data_canvas) {
		try {
			image_data_canvas = document.createElement('canvas');
			isCanvasClean = true;
		}
		catch(e) {
			err('failed to get image data. cannot create canvas: ' + img.src);
			return null;
		}
	}

	if(image_data_canvas.width != img.width) {
		image_data_canvas.width = img.width;
		isCanvasClean = true;
	}
	if(image_data_canvas.height != img.height) {
		image_data_canvas.height = img.height;
		isCanvasClean = true;
	}

	try {
		var ctx2d = image_data_canvas.getContext('2d');
		if(!isCanvasClean) {
			ctx2d.clearRect(0, 0, img.width, img.height);
		}
		ctx2d.drawImage(img, 0, 0, img.width, img.height);
		var canvasData = ctx2d.getImageData(0, 0, img.width, img.height);

		return canvasData.data;
	}
	catch(e) {
		err('failed to get image data. canvas operation failed: ' + img.src);
	}

	return null;
}

var image_data_canvas = null;



function genTexture2DFromImageData(data, width, height, option, gl) {
	if(data.length != width * height * 4) {
		err('failed to generate texture. input data should be 4 components per pixel');
		return null;
	}

	var buf = new Uint8Array(data);
	var tex2d = new SglTexture2D(gl, gl.RGBA, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buf, option);

	if(!tex2d.isValid) {
		err('failed to generate texture. internal error occured');
		return null;
	}

	return tex2d;
}

