/**
 * 获取sourcemap
 */
"use strict"
const fs = require("fs");
const path = require("path");
export default (filepath, codestr, sourcemapInput) => {
	let sourcemapObj;
	try {
		codestr || (codestr = fs.readFileSync(filepath, "utf-8"))
		const mapstr = /\/\/[#|@] sourceMappingURL=[\s]*(\S*)[\s]*$/.exec(codestr);
		const dir = path.dirname(filepath);
		const filename = path.basename(filepath)
		if (!(mapstr && mapstr[1])) {
			const sourcemapPath = path.join(dir, `${filename}.map`);
			if (fs.existsSync(sourcemapPath)) {
				sourcemapObj = fs.readFileSync(sourcemapPath, "utf-8");
				sourcemapObj = JSON.parse(sourcemapObj)
			}
		} else if (/\.js\.map$/.test(mapstr[1])) {
			sourcemapObj = fs.readFileSync(path.join(dir, mapstr[1]), "utf-8");
			sourcemapObj = JSON.parse(sourcemapObj);
		} else {
			const a = mapstr[1].split("base64,")[1];
			sourcemapObj = Buffer.from(a, "base64").toString();
			sourcemapObj = JSON.parse(sourcemapObj);
		}
	} catch (error) {
		console.error(error)
		sourcemapObj = void 0
	}
	if (sourcemapInput && sourcemapInput.inlineSources && "object" == typeof sourcemapObj && Array.isArray(sourcemapObj.sources) && !Array.isArray(sourcemapObj.sourcesContent)) {
		const sourceContent = sourcemapObj.sourcesContent;
		try {
			const dirname = path.dirname(filepath);
			const sourcesContent = [];
			constsources = sourcemapObj.sources;
			for (const key of sources) {
				const sourcepath = fs.readFileSync(path.join(dirname, key), "utf-8");
				sourcesContent.push(sourcepath);
			}
			sourcemapObj.sourcesContent = sourcesContent;
		} catch (error) {
			sourcemapObj.sourcesContent = sourceContent;
			console.warn("get sourcesContent fail");
		}
	}
	return sourcemapObj
}