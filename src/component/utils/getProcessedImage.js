// @ts-check
import fs from "fs";
import { relative } from "path";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import {
  sharp,
  fsCachePath,
  supportedImageTypes,
} from "../../runtimeChecks.js";

const { getImageDetails } = await (sharp
  ? import("./imagetools.js")
  : import("./codecs.js"));

export default async (src, configOptions, globalConfigOptions) => {
  const { search, searchParams } = new URL(src, "file://");

  const paramOptions = Object.fromEntries(searchParams);

  src = src.replace(search, "");

  if (src.match("(http://|https://|data:image/).*")) {
    const hash = crypto.createHash("md5").update(src).digest("hex");

    let filepath = fsCachePath + hash;

    const fileExists = (() => {
      for (const type of supportedImageTypes) {
        const fileExists = fs.existsSync(filepath + `.${type}`);

        if (fileExists) {
          filepath += `.${type}`;

          return true;
        }
      }
    })();

    if (!fileExists) {
      const buffer = Buffer.from(await (await fetch(src)).arrayBuffer());

      const { ext } = await fileTypeFromBuffer(buffer);

      filepath += `.${ext}`;

      fs.writeFileSync(filepath, buffer);
    }

    src = "/" + relative(process.cwd(), filepath);
  }

  configOptions = { ...globalConfigOptions, ...paramOptions, ...configOptions };

  configOptions.aspect &&= `${configOptions.aspect}`;
  configOptions.ar &&= `${configOptions.ar}`;

  const {
    w,
    h,
    ar,
    width = w,
    height = h,
    aspect = ar,
    ...rest
  } = configOptions;

  const path = process.cwd() + src;

  const { image, imageWidth, imageHeight, imageFormat } = await getImageDetails(
    path,
    width,
    height,
    aspect
  );

  return {
    path,
    rest,
    image,
    imageWidth,
    imageHeight,
    imageFormat,
  };
};
