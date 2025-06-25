import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export async function compressVideo(videoFile: File): Promise<Blob> {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();

  // Write file to MEMFS
  const inputFileName = "input.mp4";
  const outputFileName = "output.mp4";
  await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

  // Kompresiraj video
  await ffmpeg.exec([
    "-i",
    inputFileName,
    "-c:v",
    "libx264",
    "-crf",
    "28",
    "-preset",
    "medium",
    "-maxrate",
    "2M",
    "-bufsize",
    "2M",
    "-vf",
    "scale=1280:trunc(ow/a/2)*2", // max 720p
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    outputFileName,
  ]);

  // Read result
  const data = await ffmpeg.readFile(outputFileName);
  return new Blob([data], { type: "video/mp4" });
}
